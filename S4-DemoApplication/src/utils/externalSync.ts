import { CDRLRow, UserRole, AnchorRecord } from '../types'
import { hashRow } from './hash'
import { anchorToXRPL } from './xrpl'
import { storeSealed } from './sealedVault'
import { recordSeal, recordExternalFeed } from './auditTrail'
import { analyzeRow } from './aiAnalysis'
import { getRACIParty } from './raciWorkflow'
import { performRealSync, SyncServiceResult } from '../services/externalSyncService'

/* ─── Types ──────────────────────────────────────────────────── */

export interface SyncChange {
  rowId: string
  rowTitle: string
  field: string
  oldValue: string
  newValue: string
  source: string
  /** Whether this change came from a real API or simulation */
  isReal: boolean
}

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'

export interface SyncNotification {
  id: string
  timestamp: string
  title: string
  body: string
  priority: NotificationPriority
  rowId: string
  rowTitle: string
  stakeholders: string[]
  read: boolean
  changes: SyncChange[]
  /** Whether this notification was triggered by a real API sync */
  isReal: boolean
}

export interface SyncStatus {
  connected: boolean
  lastSync: string | null
  totalSyncs: number
  changesSynced: number
  isOnline: boolean
}

/* ─── Helpers ────────────────────────────────────────────────── */

let notifCounter = 0
function makeNotifId(): string {
  return `notif-${++notifCounter}-${Date.now()}`
}

/** Maps role to RACI stakeholders for a given priority level */
function getStakeholders(priority: NotificationPriority, _role: UserRole): string[] {
  const base = ['Program Manager']
  if (priority === 'critical' || priority === 'high') {
    return [...base, 'Contracting Officer', 'Quality Assurance', 'Logistics Specialist']
  }
  if (priority === 'medium') {
    return [...base, 'Contracting Officer', 'Quality Assurance']
  }
  return base
}

function pickPriority(status: 'green' | 'yellow' | 'red'): NotificationPriority {
  if (status === 'red') return 'critical'
  if (status === 'yellow') return 'medium'
  return 'low'
}

/* ─── Real Sync Pipeline ────────────────────────────────────── */

/**
 * Production-ready sync pipeline.
 *
 * 1. Calls performRealSync() from the service layer (tries real API, falls back to simulation).
 * 2. Diffs returned rows against current data.
 * 3. Seals each changed row to XRPL (real 0.01 SLS deduction).
 * 4. Runs AI analysis, logs to audit trail, generates RACI-aware notifications.
 * 5. Audit trail and notifications clearly distinguish "Simulated Sync" vs "Real Sync".
 */
export async function realSyncPipeline(
  data: CDRLRow[],
  role: UserRole,
  anchors: Record<string, AnchorRecord>,
  editedSinceSeal: Set<string>,
): Promise<{
  changes: SyncChange[]
  notifications: SyncNotification[]
  updatedRows: CDRLRow[]
  newAnchors: Record<string, AnchorRecord>
}> {
  const changes: SyncChange[] = []
  const notifications: SyncNotification[] = []
  const updatedRows = [...data]
  const newAnchors: Record<string, AnchorRecord> = {}

  // Build a lookup so we can match returned rows to current rows by id
  const rowIndexById = new Map<string, number>()
  data.forEach((r, i) => rowIndexById.set(r.id, i))

  // ── Step 1: Call the service layer (real API → fallback to simulation) ──
  let serviceResults: SyncServiceResult[]
  try {
    serviceResults = await performRealSync(data)
  } catch (e) {
    console.error('[realSyncPipeline] Service layer error, aborting sync:', e)
    return { changes, notifications, updatedRows, newAnchors }
  }

  // ── Step 2: Process result from NSERC IDE (PMS 300) ──
  for (const result of serviceResults) {
    const { isReal, source, rows: externalRows, warnings } = result
    const modeLabel = isReal ? 'Real Sync' : 'Simulated Sync'

    if (warnings.length > 0) {
      console.info(`[${modeLabel}] ${source} warnings:`, warnings)
    }

    for (const extRow of externalRows) {
      const idx = rowIndexById.get(extRow.id)
      if (idx === undefined) continue // external row not in our dataset

      const currentRow = updatedRows[idx]

      // Diff: detect which fields actually changed
      const fieldsToCheck: (keyof CDRLRow)[] = ['notes', 'actualSubmissionDate', 'status', 'received']
      let hasChanges = false

      for (const field of fieldsToCheck) {
        const oldVal = String(currentRow[field] ?? '')
        const newVal = String(extRow[field] ?? '')
        if (oldVal !== newVal) {
          changes.push({
            rowId: extRow.id,
            rowTitle: extRow.title,
            field,
            oldValue: oldVal,
            newValue: newVal,
            source,
            isReal,
          })
          hasChanges = true
        }
      }

      if (!hasChanges) continue

      // Apply the external row's changes
      updatedRows[idx] = { ...currentRow, ...extRow }
      const updatedRow = updatedRows[idx]

      // ── Step 3: Audit Trail — clearly tagged as Real or Simulated ──
      recordExternalFeed(
        updatedRow,
        `${source} [${modeLabel}]`,
        `${modeLabel}: Synced from ${source} — ${(extRow.notes || '').slice(0, 60)}`,
      )

      // ── Step 4: Real XRPL seal (0.01 SLS) for every changed row ──
      const hash = await hashRow(updatedRow as unknown as Record<string, unknown>)
      const anchor = await anchorToXRPL(updatedRow.id, hash, updatedRow.title)
      storeSealed(updatedRow.id, updatedRow)
      recordSeal(updatedRow, anchor)
      newAnchors[updatedRow.id] = anchor

      // ── Step 5: AI analysis ──
      const insight = analyzeRow(updatedRow, { ...anchors, ...newAnchors }, editedSinceSeal)
      updatedRows[idx] = {
        ...updatedRows[idx],
        notes: `${updatedRows[idx].notes}\n${insight.conciseNote}`,
      }

      // ── Step 6: RACI-aware notification ──
      const raciParty = getRACIParty(updatedRow)
      const priority = pickPriority(updatedRow.status)
      const stakeholders = [raciParty, ...getStakeholders(priority, role).filter(s => s !== raciParty)]

      notifications.push({
        id: makeNotifId(),
        timestamp: new Date().toISOString(),
        title: `${updatedRow.id} — ${modeLabel}: Synced & Sealed`,
        body: `${source} [${modeLabel}]: ${(extRow.notes || '').split(']').pop()?.trim() || 'Updated'}\nSealed to XRPL — TX: ${anchor.txHash.slice(0, 16)}…${anchor.explorerUrl ? ' (verified)' : ''}`,
        priority,
        rowId: updatedRow.id,
        rowTitle: updatedRow.title,
        stakeholders,
        read: false,
        changes: changes.filter(c => c.rowId === updatedRow.id),
        isReal,
      })
    }
  }

  return { changes, notifications, updatedRows, newAnchors }
}

/* ─── RACI email generation ──────────────────────────────────── */

export function generateEmailBody(
  notification: SyncNotification,
  role: UserRole,
  senderName?: string
): { subject: string; to: string[]; body: string } {
  const sender = senderName || role
  const subject = `[S4 Ledger] ${notification.priority === 'critical' ? 'URGENT: ' : ''}${notification.title}`

  const to = notification.stakeholders

  const changeLines = notification.changes.map(c =>
    `  • ${c.field}: "${c.oldValue.slice(0, 50)}${c.oldValue.length > 50 ? '…' : ''}" → "${c.newValue.slice(0, 50)}${c.newValue.length > 50 ? '…' : ''}"`
  ).join('\n')

  const body = `${sender},

The following update was received for ${notification.rowId} — ${notification.rowTitle}:

${changeLines}

Source: ${notification.changes[0]?.source || 'NSERC IDE (PMS 300)'}
Priority: ${notification.priority.toUpperCase()}
Timestamp: ${new Date(notification.timestamp).toLocaleString()}

RACI Distribution: ${notification.stakeholders.join(', ')}

${notification.priority === 'critical'
    ? 'IMMEDIATE ACTION REQUIRED — This deliverable is past its contractual due date. Please coordinate corrective action within 48 hours.'
    : notification.priority === 'high'
    ? 'ACTION REQUIRED — Please review and respond within 5 business days.'
    : 'For your awareness — no immediate action required unless otherwise directed.'
  }

---
This notification was generated by S4 Ledger — Synced from NSERC IDE (PMS 300).
All data is cryptographically anchored to XRPL for integrity verification.`

  return { subject, to, body }
}
