import { CDRLRow, UserRole } from '../types'

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

/** Simulate an external sync — returns changes and notifications */
export function simulateExternalSync(
  data: CDRLRow[],
  role: UserRole
): { changes: SyncChange[]; notifications: SyncNotification[]; updatedRows: CDRLRow[] } {
  const changes: SyncChange[] = []
  const notifications: SyncNotification[] = []
  const updatedRows = [...data]

  // Pick 2–4 rows to simulate updates on
  const numUpdates = 2 + Math.floor(Math.random() * 3)
  const indices = new Set<number>()
  while (indices.size < Math.min(numUpdates, data.length)) {
    indices.add(Math.floor(Math.random() * data.length))
  }

  const source = EXTERNAL_SOURCES[Math.floor(Math.random() * EXTERNAL_SOURCES.length)]

  indices.forEach(idx => {
    const row = data[idx]
    const remarks = EXTERNAL_REMARKS[row.status]
    const newRemark = remarks[Math.floor(Math.random() * remarks.length)]

    // Simulate a notes update from external system
    const change: SyncChange = {
      rowId: row.id,
      rowTitle: row.title,
      field: 'notes',
      oldValue: row.notes,
      newValue: `[${source}] ${newRemark}`,
      source,
    }
    changes.push(change)

    // Apply the change
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

    // Generate notification
    const priority = pickPriority(row.status)
    notifications.push({
      id: makeNotifId(),
      timestamp: new Date().toISOString(),
      title: `${row.id} — External Update`,
      body: `${source}: ${newRemark}`,
      priority,
      rowId: row.id,
      rowTitle: row.title,
      stakeholders: getStakeholders(priority, role),
      read: false,
      changes: changes.filter(c => c.rowId === row.id),
    })
  })

  return { changes, notifications, updatedRows }
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
