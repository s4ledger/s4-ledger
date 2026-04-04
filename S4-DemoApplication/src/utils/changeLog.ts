/**
 * Change Log Service — persists field-level edits to Supabase.
 * Falls back to in-memory storage for demo mode.
 */

import { supabase } from '../lib/supabaseClient'

export interface ChangeEntry {
  id: string
  user_email: string | null
  user_role: string | null
  user_org: string | null
  row_id: string
  row_title: string
  field: string
  field_label: string
  old_value: string | null
  new_value: string | null
  change_type: 'edit' | 'seal' | 'reseal' | 'verify' | 'ai_remark' | 'status_change' | 'external_sync'
  created_at: string
}

/* ── In-memory fallback for demo mode ─────────────────────── */
let memoryLog: ChangeEntry[] = []
let nextMemId = 1

/* ── Column key → human-readable label ────────────────────── */
const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  diNumber: 'DI Number',
  contractDueFinish: 'Contract Due (Finish)',
  calculatedDueDate: 'Calculated Due Date',
  submittalGuidance: 'Submittal Guidance',
  actualSubmissionDate: 'Actual Submission Date',
  received: 'Received',
  calendarDaysToReview: 'Calendar Days to Review',
  notes: 'Gov\'t Notes',
  govNotes: 'Gov\'t Notes',
  shipbuilderNotes: 'Shipbuilder Notes',
  status: 'Status',
  responsibleParty: 'Responsible Party',
}

function getLabel(field: string): string {
  return FIELD_LABELS[field] || field
}

/* ── Record a change ──────────────────────────────────────── */
export async function recordChange(params: {
  userId?: string | null
  userEmail?: string | null
  userRole?: string | null
  userOrg?: string | null
  rowId: string
  rowTitle: string
  field: string
  oldValue: string | null
  newValue: string | null
  changeType: ChangeEntry['change_type']
}): Promise<void> {
  const entry: ChangeEntry = {
    id: `mem-${nextMemId++}`,
    user_email: params.userEmail || null,
    user_role: params.userRole || null,
    user_org: params.userOrg || null,
    row_id: params.rowId,
    row_title: params.rowTitle,
    field: params.field,
    field_label: getLabel(params.field),
    old_value: params.oldValue,
    new_value: params.newValue,
    change_type: params.changeType,
    created_at: new Date().toISOString(),
  }

  // Always keep in memory for immediate sidebar updates
  memoryLog.push(entry)

  // Persist to Supabase (non-blocking)
  try {
    await supabase.from('change_log').insert({
      user_id: params.userId || null,
      user_email: params.userEmail || null,
      user_role: params.userRole || null,
      user_org: params.userOrg || null,
      row_id: params.rowId,
      row_title: params.rowTitle,
      field: params.field,
      field_label: getLabel(params.field),
      old_value: params.oldValue,
      new_value: params.newValue,
      change_type: params.changeType,
    })
  } catch {
    // Supabase unavailable — in-memory fallback is sufficient
  }
}

/* ── Fetch change log for a specific row ──────────────────── */
export async function getChangesForRow(rowId: string): Promise<ChangeEntry[]> {
  try {
    const { data, error } = await supabase
      .from('change_log')
      .select('*')
      .eq('row_id', rowId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!error && data && data.length > 0) {
      return data as ChangeEntry[]
    }
  } catch {
    // Fall through to memory
  }

  // Fallback to in-memory
  return memoryLog
    .filter(e => e.row_id === rowId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

/* ── Fetch all changes (global view) ──────────────────────── */
export async function getAllChanges(limit = 100): Promise<ChangeEntry[]> {
  try {
    const { data, error } = await supabase
      .from('change_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!error && data && data.length > 0) {
      return data as ChangeEntry[]
    }
  } catch {
    // Fall through to memory
  }

  return [...memoryLog]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}

/* ── Get in-memory count (for badges) ─────────────────────── */
export function getMemoryChangeCount(): number {
  return memoryLog.length
}
