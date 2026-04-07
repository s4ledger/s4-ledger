import { DRLRow, UserRole, AnchorRecord } from '../types'
import { hashRow } from './hash'
import { anchorToXRPL } from './xrpl'
import { storeSealed } from './sealedVault'
import { recordSeal, recordExternalFeed } from './auditTrail'
import { analyzeRow } from './aiAnalysis'
import { getRACIParty } from './raciWorkflow'
import { fetchLatestDRLUpdates, NSERCSyncResult, generateNewCraftRows, generateManualCraftRows, detectExistingCrafts, isProductionConfigured } from '../services/nsercIdeService'

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
  /** Whether the last sync used simulated data (not real NSERC IDE) */
  isSimulation: boolean
  /** Last sync error message, if any */
  lastError: string | null
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
    return [...base, 'Contracting Officer', 'Quality Assurance', 'Logistics Specialist', 'Shipbuilder Representative']
  }
  if (priority === 'medium') {
    return [...base, 'Contracting Officer', 'Quality Assurance']
  }
  return base
}

function pickPriority(status: 'green' | 'yellow' | 'red' | 'pending'): NotificationPriority {
  if (status === 'red') return 'critical'
  if (status === 'yellow') return 'medium'
  if (status === 'pending') return 'low'
  return 'low'
}

/* ─── Real Sync Pipeline ────────────────────────────────────── */

/**
 * Production-ready sync pipeline for NSERC IDE (PMS 300).
 *
 * 1. Calls nsercIdeService.fetchLatestDRLUpdates() (real API when credentials
 *    are provisioned, simulation fallback otherwise).
 * 2. Diffs returned rows against current data.
 * 3. Seals each changed row to XRPL (real 0.01 SLS deduction).
 * 4. Runs AI analysis, logs to audit trail, generates RACI-aware notifications.
 * 5. Audit trail and notifications tagged "Synced from NSERC IDE (PMS 300)".
 */
export async function realSyncPipeline(
  data: DRLRow[],
  role: UserRole,
  anchors: Record<string, AnchorRecord>,
  editedSinceSeal: Set<string>,
): Promise<{
  changes: SyncChange[]
  notifications: SyncNotification[]
  updatedRows: DRLRow[]
  newAnchors: Record<string, AnchorRecord>
  newCraftDetected: string | null
  /** Whether the sync used simulated data */
  isSimulation: boolean
  /** Non-fatal warnings from the sync */
  warnings: string[]
}> {
  const changes: SyncChange[] = []
  const notifications: SyncNotification[] = []
  const updatedRows = [...data]
  const newAnchors: Record<string, AnchorRecord> = {}
  const existingCrafts = detectExistingCrafts(data)
  let newCraftDetected: string | null = null

  // Build a lookup so we can match returned rows to current rows by id
  const rowIndexById = new Map<string, number>()
  data.forEach((r, i) => rowIndexById.set(r.id, i))

  // ── Step 1: Call nsercIdeService.fetchLatestDRLUpdates() ──
  let serviceResult: NSERCSyncResult
  try {
    serviceResult = await fetchLatestDRLUpdates(data)
  } catch (e) {
    console.error('[realSyncPipeline] NSERC IDE (PMS 300) service error, aborting sync:', e)
    return {
      changes, notifications, updatedRows, newAnchors, newCraftDetected: null,
      isSimulation: true,
      warnings: [`Sync aborted: ${e instanceof Error ? e.message : String(e)}`],
    }
  }

  // ── Step 2: Process result from NSERC IDE (PMS 300) ──
  const { isReal, source, rows: externalRows, warnings } = serviceResult
  const modeLabel = isReal ? 'Real Sync' : 'Simulated Sync'

  if (warnings.length > 0) {
    console.info(`[NSERC IDE (PMS 300)] ${modeLabel} warnings:`, warnings)
  }

  for (const extRow of externalRows) {
    const idx = rowIndexById.get(extRow.id)

    // ── NEW ROW: ID not in current dataset → new craft/hull from NSERC IDE ──
    if (idx === undefined) {
      // Append the new row to the end of the table
      const newIdx = updatedRows.length
      updatedRows.push(extRow)
      rowIndexById.set(extRow.id, newIdx)

      // Track new craft detection — extract platform from (Platform — Hull N)
      const craftIdx = extRow.title.lastIndexOf('(')
      const craftEnd = extRow.title.lastIndexOf(')')
      if (craftIdx !== -1 && craftEnd > craftIdx) {
        const inner = extRow.title.slice(craftIdx + 1, craftEnd).trim()
        const dashPos = inner.indexOf('—')
        const platform = dashPos !== -1 ? inner.slice(0, dashPos).trim() : inner
        if (!existingCrafts.has(platform)) {
          newCraftDetected = platform
          existingCrafts.add(platform)
        }
      }

      // Record every field as a "new" change
      const fieldsToLog: (keyof DRLRow)[] = ['title', 'notes', 'status', 'diNumber']
      for (const field of fieldsToLog) {
        changes.push({
          rowId: extRow.id,
          rowTitle: extRow.title,
          field,
          oldValue: '',
          newValue: String(extRow[field] ?? ''),
          source,
          isReal,
        })
      }

      // Audit: "New service craft detected and sealed from NSERC IDE (PMS 300)"
      recordExternalFeed(
        extRow,
        `${source} [${modeLabel}]`,
        `${modeLabel}: New service craft detected and sealed from ${source} — ${extRow.title}`,
      )

      // Seal the new row to XRPL (0.01 SLS)
      const hash = await hashRow(extRow as unknown as Record<string, unknown>)
      const anchor = await anchorToXRPL(extRow.id, hash, extRow.title)
      storeSealed(extRow.id, extRow)
      recordSeal(extRow, anchor)
      newAnchors[extRow.id] = anchor

      // AI analysis on the new row
      const insight = analyzeRow(extRow, { ...anchors, ...newAnchors }, editedSinceSeal)
      updatedRows[newIdx] = {
        ...updatedRows[newIdx],
        notes: `${updatedRows[newIdx].notes}\n${insight.conciseNote}`,
      }

      // RACI notification for new service craft
      const raciParty = getRACIParty(extRow)
      const priority = pickPriority(extRow.status)
      const stakeholders = [raciParty, ...getStakeholders(priority, role).filter(s => s !== raciParty)]

      notifications.push({
        id: makeNotifId(),
        timestamp: new Date().toISOString(),
        title: `${extRow.id} — New service craft detected from NSERC IDE (PMS 300)`,
        body: `New service craft detected and sealed from NSERC IDE (PMS 300) [${modeLabel}]: ${extRow.title}\nSealed to XRPL — TX: ${anchor.txHash.slice(0, 16)}…${anchor.explorerUrl ? ' (verified)' : ''}`,

        priority,
        rowId: extRow.id,
        rowTitle: extRow.title,
        stakeholders,
        read: false,
        changes: changes.filter(c => c.rowId === extRow.id),
        isReal,
      })

      continue
    }

    const currentRow = updatedRows[idx]

    // Diff: detect which fields actually changed
    const fieldsToCheck: (keyof DRLRow)[] = ['notes', 'actualSubmissionDate', 'status', 'received']
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

    // ── Step 3: Audit Trail — tagged "Synced from NSERC IDE (PMS 300)" ──
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
      title: `${updatedRow.id} — Synced from NSERC IDE (PMS 300)`,
      body: `Synced from NSERC IDE (PMS 300) [${modeLabel}]: ${(extRow.notes || '').split(']').pop()?.trim() || 'Updated'}\nSealed to XRPL — TX: ${anchor.txHash.slice(0, 16)}…${anchor.explorerUrl ? ' (verified)' : ''}`,
      priority,
      rowId: updatedRow.id,
      rowTitle: updatedRow.title,
      stakeholders,
      read: false,
      changes: changes.filter(c => c.rowId === updatedRow.id),
      isReal,
    })
  }

  return {
    changes, notifications, updatedRows, newAnchors, newCraftDetected,
    isSimulation: !serviceResult.isReal,
    warnings: serviceResult.warnings,
  }
}

/**
 * Generate rows for a manually entered craft (offline / fallback).
 * Creates deliverable rows for a user-provided craft name, seals them,
 * and runs AI analysis.
 */
export async function manualCraftPipeline(
  data: DRLRow[],
  craftName: string,
  role: UserRole,
  anchors: Record<string, AnchorRecord>,
  editedSinceSeal: Set<string>,
): Promise<{
  changes: SyncChange[]
  notifications: SyncNotification[]
  updatedRows: DRLRow[]
  newAnchors: Record<string, AnchorRecord>
  newCraftDetected: string
}> {
  const newRows = generateManualCraftRows(data, craftName)

  const changes: SyncChange[] = []
  const notifications: SyncNotification[] = []
  const updatedRows = [...data]
  const newAnchors: Record<string, AnchorRecord> = {}
  const modeLabel = 'Manual Entry'
  const source = 'Manual (NSERC IDE Offline)'

  for (const extRow of newRows) {
    const newIdx = updatedRows.length
    updatedRows.push(extRow)

    const fieldsToLog: (keyof DRLRow)[] = ['title', 'notes', 'status', 'diNumber']
    for (const field of fieldsToLog) {
      changes.push({
        rowId: extRow.id,
        rowTitle: extRow.title,
        field,
        oldValue: '',
        newValue: String(extRow[field] ?? ''),
        source,
        isReal: false,
      })
    }

    recordExternalFeed(
      extRow,
      `${source} [${modeLabel}]`,
      `${modeLabel}: New service craft added — ${extRow.title}`,
    )

    const hash = await hashRow(extRow as unknown as Record<string, unknown>)
    const anchor = await anchorToXRPL(extRow.id, hash, extRow.title)
    storeSealed(extRow.id, extRow)
    recordSeal(extRow, anchor)
    newAnchors[extRow.id] = anchor

    const insight = analyzeRow(extRow, { ...anchors, ...newAnchors }, editedSinceSeal)
    updatedRows[newIdx] = {
      ...updatedRows[newIdx],
      notes: `${updatedRows[newIdx].notes}\n${insight.conciseNote}`,
    }

    const raciParty = getRACIParty(extRow)
    const priority = pickPriority(extRow.status)
    const stakeholders = [raciParty, ...getStakeholders(priority, role).filter(s => s !== raciParty)]

    notifications.push({
      id: makeNotifId(),
      timestamp: new Date().toISOString(),
      title: `${extRow.id} — Manual craft added: ${craftName}`,
      body: `Manual craft entry: ${extRow.title}\nSealed to XRPL — TX: ${anchor.txHash.slice(0, 16)}…${anchor.explorerUrl ? ' (verified)' : ''}`,
      priority,
      rowId: extRow.id,
      rowTitle: extRow.title,
      stakeholders,
      read: false,
      changes: changes.filter(c => c.rowId === extRow.id),
      isReal: false,
    })
  }

  return {
    changes,
    notifications,
    updatedRows,
    newAnchors,
    newCraftDetected: craftName,
  }
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
