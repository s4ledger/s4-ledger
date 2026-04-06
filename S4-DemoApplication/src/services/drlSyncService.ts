/**
 * ═══════════════════════════════════════════════════════════════
 *  DRL Sync Service — Supabase persistence for DRL rows
 * ═══════════════════════════════════════════════════════════════
 *
 * Bridges IndexedDB (local/offline) ↔ Supabase (cloud persistence).
 * • Upserts all DRL rows to Supabase `drl_rows` table
 * • Flushes the offline sync queue after successful sync
 * • Loads persisted rows from Supabase for cross-device access
 */

import { supabase } from '../lib/supabaseClient'
import type { DRLRow } from '../types'
import {
  getQueuedChanges,
  markChangeSynced,
} from './offlineStore'

/* ─── Helpers ────────────────────────────────────────────────── */

/** Map DRLRow (camelCase) → drl_rows table (snake_case) */
function toDbRow(row: DRLRow, userId: string | null) {
  return {
    id: row.id,
    contract_id: row.contractId ?? null,
    title: row.title,
    di_number: row.diNumber,
    contract_due_finish: row.contractDueFinish,
    calculated_due_date: row.calculatedDueDate,
    submittal_guidance: row.submittalGuidance,
    actual_submission_date: row.actualSubmissionDate,
    received: row.received,
    calendar_days_to_review: row.calendarDaysToReview,
    notes: row.notes,
    status: row.status,
    shipbuilder_notes: row.shipbuilderNotes ?? '',
    gov_notes: row.govNotes ?? '',
    responsible_party: row.responsibleParty ?? '',
    workflow_state: row.workflowState ?? null,
    user_id: userId,
    updated_at: new Date().toISOString(),
  }
}

/** Map drl_rows table (snake_case) → DRLRow (camelCase) */
function fromDbRow(db: Record<string, unknown>): DRLRow {
  return {
    id: db.id as string,
    contractId: (db.contract_id as string) || undefined,
    title: db.title as string,
    diNumber: (db.di_number as string) || '',
    contractDueFinish: (db.contract_due_finish as string) || '',
    calculatedDueDate: (db.calculated_due_date as string) || '',
    submittalGuidance: (db.submittal_guidance as string) || '',
    actualSubmissionDate: (db.actual_submission_date as string) || '',
    received: (db.received as string) || '',
    calendarDaysToReview: db.calendar_days_to_review as number | null,
    notes: (db.notes as string) || '',
    status: (db.status as DRLRow['status']) || 'pending',
    shipbuilderNotes: (db.shipbuilder_notes as string) || '',
    govNotes: (db.gov_notes as string) || '',
    responsibleParty: db.responsible_party as DRLRow['responsibleParty'],
    workflowState: db.workflow_state as DRLRow['workflowState'],
  }
}

/* ─── Public API ─────────────────────────────────────────────── */

/**
 * Upsert all DRL rows to Supabase.
 * Uses ON CONFLICT (id) DO UPDATE so rows are created or updated.
 */
export async function syncRowsToSupabase(
  rows: DRLRow[],
  userId: string | null,
): Promise<{ ok: boolean; synced: number; error?: string }> {
  try {
    const dbRows = rows.map(r => toDbRow(r, userId))

    // Batch upsert in chunks of 50 to avoid payload limits
    const CHUNK = 50
    let synced = 0
    for (let i = 0; i < dbRows.length; i += CHUNK) {
      const chunk = dbRows.slice(i, i + CHUNK)
      const { error } = await supabase
        .from('drl_rows')
        .upsert(chunk, { onConflict: 'id' })

      if (error) {
        console.warn('DRL sync chunk failed:', error.message)
        return { ok: false, synced, error: error.message }
      }
      synced += chunk.length
    }

    return { ok: true, synced }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.warn('DRL sync failed:', msg)
    return { ok: false, synced: 0, error: msg }
  }
}

/**
 * Load all DRL rows from Supabase (for cross-device hydration).
 * Returns null if the table is empty or query fails.
 */
export async function loadRowsFromSupabase(): Promise<DRLRow[] | null> {
  try {
    const { data, error } = await supabase
      .from('drl_rows')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('Failed to load DRL rows from Supabase:', error.message)
      return null
    }
    if (!data || data.length === 0) return null
    return data.map(fromDbRow)
  } catch (e) {
    console.warn('Failed to load DRL rows:', e)
    return null
  }
}

/**
 * Flush the offline sync queue — mark all queued changes as synced
 * after a successful rows upsert.
 */
export async function flushSyncQueue(): Promise<number> {
  try {
    const queued = await getQueuedChanges()
    let flushed = 0
    for (const change of queued) {
      await markChangeSynced(change.id)
      flushed++
    }
    return flushed
  } catch (e) {
    console.warn('Failed to flush sync queue:', e)
    return 0
  }
}
