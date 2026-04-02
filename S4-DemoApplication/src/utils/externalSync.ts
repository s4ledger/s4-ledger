import { CDRLRow, UserRole, AnchorRecord } from '../types'
import { hashRow } from './hash'
import { anchorToXRPL } from './xrpl'
import { storeSealed } from './sealedVault'
import { recordSeal, recordExternalFeed } from './auditTrail'
import { analyzeRow } from './aiAnalysis'
import { getRACIParty } from './raciWorkflow'

/* ─── Types ──────────────────────────────────────────────────── */

export interface SyncChange {
  rowId: string
  rowTitle: string
  field: string
  oldValue: string
  newValue: string
  source: string
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
}

export interface SyncStatus {
  connected: boolean
  lastSync: string | null
  totalSyncs: number
  changesSynced: number
  isOnline: boolean
}

/* ─── Deterministic simulation: NSERC IDE external feed ─────── */

let notifCounter = 0
function makeNotifId(): string {
  return `notif-${++notifCounter}-${Date.now()}`
}

const EXTERNAL_SOURCES = [
  'NSERC IDE Portal',
  'DCMA eStar Gateway',
  'PMS 515 Data Feed',
  'Navy ERP Interface',
]

/** Deterministic remarks from external systems */
const EXTERNAL_REMARKS: Record<string, string[]> = {
  green: [
    'Approved — government review complete, no further action required.',
    'Final deliverable accepted per CDRL requirements.',
    'Revision incorporated — Contracting Officer approved.',
  ],
  yellow: [
    'Pending government review — response expected within 15 calendar days.',
    'Minor comments returned — contractor resubmittal requested.',
    'Under technical evaluation by NAVSEA engineering division.',
  ],
  red: [
    'Delinquent — past contractual due date, DCMA cure notice in progress.',
    'Rejected — significant deficiencies identified, resubmittal required.',
    'Overdue submittal — escalated to Program Manager for corrective action.',
  ],
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

/** Real sync pipeline: generate realistic changes, seal each to XRPL, run AI analysis */
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

  // Pick 2–4 rows to receive external updates
  const numUpdates = 2 + Math.floor(Math.random() * 3)
  const indices = new Set<number>()
  while (indices.size < Math.min(numUpdates, data.length)) {
    indices.add(Math.floor(Math.random() * data.length))
  }

  const source = EXTERNAL_SOURCES[Math.floor(Math.random() * EXTERNAL_SOURCES.length)]

  for (const idx of indices) {
    const row = data[idx]
    const remarks = EXTERNAL_REMARKS[row.status]
    const newRemark = remarks[Math.floor(Math.random() * remarks.length)]

    // Build realistic notes update from external source
    const change: SyncChange = {
      rowId: row.id,
      rowTitle: row.title,
      field: 'notes',
      oldValue: row.notes,
      newValue: `[${source}] ${newRemark}`,
      source,
    }
    changes.push(change)

    // Apply notes change
    updatedRows[idx] = { ...updatedRows[idx], notes: change.newValue }

    // Possibly update submission date for yellow/red rows
    if (row.status !== 'green' && Math.random() > 0.5) {
      const today = new Date()
      const newDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      changes.push({
        rowId: row.id,
        rowTitle: row.title,
        field: 'actualSubmissionDate',
        oldValue: row.actualSubmissionDate || '—',
        newValue: newDate,
        source,
      })
      updatedRows[idx] = { ...updatedRows[idx], actualSubmissionDate: newDate }
    }

    const updatedRow = updatedRows[idx]

    // Record external feed in audit trail
    recordExternalFeed(updatedRow, source, `Synced from ${source}: ${newRemark.slice(0, 60)}`)

    // Real XRPL seal: hash the updated row, anchor to ledger, store in vault
    const hash = await hashRow(updatedRow as unknown as Record<string, unknown>)
    const anchor = await anchorToXRPL(updatedRow.id, hash, updatedRow.title)
    storeSealed(updatedRow.id, updatedRow)
    recordSeal(updatedRow, anchor)
    newAnchors[updatedRow.id] = anchor

    // Run AI analysis on the changed row for a smart remark
    const insight = analyzeRow(updatedRow, { ...anchors, ...newAnchors }, editedSinceSeal)
    const aiNote = insight.conciseNote

    // Update notes with AI remark appended
    updatedRows[idx] = {
      ...updatedRows[idx],
      notes: `${updatedRows[idx].notes}\n${aiNote}`,
    }

    // RACI-aware notification with real XRPL data
    const raciParty = getRACIParty(updatedRow)
    const priority = pickPriority(updatedRow.status)
    const stakeholders = [raciParty, ...getStakeholders(priority, role).filter(s => s !== raciParty)]

    notifications.push({
      id: makeNotifId(),
      timestamp: new Date().toISOString(),
      title: `${updatedRow.id} — Synced & Sealed`,
      body: `${source}: ${newRemark}\nSealed to XRPL — TX: ${anchor.txHash.slice(0, 16)}…${anchor.explorerUrl ? ' (verified)' : ''}`,
      priority,
      rowId: updatedRow.id,
      rowTitle: updatedRow.title,
      stakeholders,
      read: false,
      changes: changes.filter(c => c.rowId === updatedRow.id),
    })
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

Source: ${notification.changes[0]?.source || 'NSERC IDE'}
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
This notification was generated by S4 Ledger Automated Sync.
All data is cryptographically anchored to XRPL for integrity verification.`

  return { subject, to, body }
}
