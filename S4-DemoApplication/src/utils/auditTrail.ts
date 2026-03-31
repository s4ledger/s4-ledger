import { CDRLRow, AnchorRecord } from '../types'

/* ─── Event types ────────────────────────────────────────────── */
export type AuditEventType =
  | 'Sealed'
  | 'Verified'
  | 'Mismatch Detected'
  | 'Re-Sealed'
  | 'Edited'
  | 'AI Remark Updated'
  | 'External Data Feed'

export interface AuditEvent {
  id: string
  rowId: string
  rowTitle: string
  timestamp: string
  type: AuditEventType
  description: string
  aiSummary: string
  txHash?: string
  explorerUrl?: string | null
  details?: Record<string, string>
}

/* ─── Audit log store (in-memory, survives across renders) ──── */
let auditLog: AuditEvent[] = []
let nextId = 1

function makeId(): string {
  return `evt-${nextId++}-${Date.now()}`
}

function now(): string {
  return new Date().toISOString()
}

/* ─── Public API ─────────────────────────────────────────────── */

export function getAuditLog(): AuditEvent[] {
  return [...auditLog]
}

export function getAuditLogForRow(rowId: string): AuditEvent[] {
  return auditLog.filter(e => e.rowId === rowId)
}

export function clearAuditLog(): void {
  auditLog = []
  nextId = 1
}

/* ─── Record events ──────────────────────────────────────────── */

export function recordSeal(row: CDRLRow, anchor: AnchorRecord): void {
  auditLog.push({
    id: makeId(),
    rowId: row.id,
    rowTitle: row.title,
    timestamp: anchor.timestamp || now(),
    type: 'Sealed',
    description: `${row.id} sealed to XRPL. Hash: ${anchor.hash.slice(0, 16)}… Transaction confirmed on ledger ${anchor.ledgerIndex}.`,
    aiSummary: `Record integrity for "${row.title}" is now cryptographically provable — any future modification will be detectable.`,
    txHash: anchor.txHash,
    explorerUrl: anchor.explorerUrl,
  })
}

export function recordReseal(row: CDRLRow, anchor: AnchorRecord): void {
  auditLog.push({
    id: makeId(),
    rowId: row.id,
    rowTitle: row.title,
    timestamp: anchor.timestamp || now(),
    type: 'Re-Sealed',
    description: `${row.id} re-sealed after post-seal edit. New hash: ${anchor.hash.slice(0, 16)}… Previous seal superseded.`,
    aiSummary: `Trust restored — the edited record now has a fresh cryptographic seal reflecting current data state.`,
    txHash: anchor.txHash,
    explorerUrl: anchor.explorerUrl,
  })
}

export function recordVerification(row: CDRLRow, match: boolean, currentHash: string, anchoredHash: string, txHash: string): void {
  if (match) {
    auditLog.push({
      id: makeId(),
      rowId: row.id,
      rowTitle: row.title,
      timestamp: now(),
      type: 'Verified',
      description: `${row.id} verification passed. Current data matches sealed hash.`,
      aiSummary: `Integrity confirmed — no modifications detected since the Ledger Seal was applied.`,
      txHash,
    })
  } else {
    auditLog.push({
      id: makeId(),
      rowId: row.id,
      rowTitle: row.title,
      timestamp: now(),
      type: 'Mismatch Detected',
      description: `${row.id} hash mismatch. Current: ${currentHash.slice(0, 12)}… vs Sealed: ${anchoredHash.slice(0, 12)}…`,
      aiSummary: `Data has been modified since the last Ledger Seal — review changes and consider re-sealing to restore trust status.`,
      txHash,
      details: {
        currentHash: currentHash.slice(0, 24),
        anchoredHash: anchoredHash.slice(0, 24),
      },
    })
  }
}

export function recordEdit(row: CDRLRow, field: string, oldValue: string, newValue: string): void {
  if (oldValue === newValue) return
  auditLog.push({
    id: makeId(),
    rowId: row.id,
    rowTitle: row.title,
    timestamp: now(),
    type: 'Edited',
    description: `Field "${field}" changed from "${oldValue.slice(0, 40)}" to "${newValue.slice(0, 40)}".`,
    aiSummary: generateEditSummary(row, field, oldValue, newValue),
    details: { field, oldValue: oldValue.slice(0, 80), newValue: newValue.slice(0, 80) },
  })
}

export function recordAIRemarkUpdate(row: CDRLRow, remark: string): void {
  auditLog.push({
    id: makeId(),
    rowId: row.id,
    rowTitle: row.title,
    timestamp: now(),
    type: 'AI Remark Updated',
    description: `AI-generated remark saved to notes: "${remark.slice(0, 60)}${remark.length > 60 ? '…' : ''}"`,
    aiSummary: `Program management notes updated with AI analysis — this ensures the latest contractual assessment is reflected in the record.`,
  })
}

export function recordExternalFeed(row: CDRLRow, feedSource: string, feedDetail: string): void {
  auditLog.push({
    id: makeId(),
    rowId: row.id,
    rowTitle: row.title,
    timestamp: now(),
    type: 'External Data Feed',
    description: `${feedSource}: ${feedDetail}`,
    aiSummary: `External system update received — cross-referencing with current DRL status for consistency.`,
  })
}

/* ─── Seed simulated history for demo rows ───────────────────── */
export function seedAuditHistory(data: CDRLRow[], anchors: Record<string, AnchorRecord>): void {
  if (auditLog.length > 0) return // already seeded

  const baseDate = new Date('2026-03-15T09:00:00Z')

  data.forEach((row, i) => {
    // Simulated IDE feed entry
    const feedDate = new Date(baseDate.getTime() + i * 3600000)
    auditLog.push({
      id: makeId(),
      rowId: row.id,
      rowTitle: row.title,
      timestamp: feedDate.toISOString(),
      type: 'External Data Feed',
      description: `NSERC IDE: ${row.id} registered in Integrated Data Environment. Submittal tracking initiated.`,
      aiSummary: `Deliverable entered external tracking — automated monitoring active for contract compliance.`,
    })

    // If anchored, add seal event
    if (anchors[row.id]) {
      const a = anchors[row.id]
      auditLog.push({
        id: makeId(),
        rowId: row.id,
        rowTitle: row.title,
        timestamp: a.timestamp || new Date(feedDate.getTime() + 1800000).toISOString(),
        type: 'Sealed',
        description: `${row.id} sealed to XRPL. Hash: ${a.hash.slice(0, 16)}… Ledger ${a.ledgerIndex}.`,
        aiSummary: `Record integrity now cryptographically provable on XRPL.`,
        txHash: a.txHash,
        explorerUrl: a.explorerUrl,
      })

      // Simulated verification
      auditLog.push({
        id: makeId(),
        rowId: row.id,
        rowTitle: row.title,
        timestamp: new Date(feedDate.getTime() + 7200000).toISOString(),
        type: 'Verified',
        description: `${row.id} verification passed. Data integrity confirmed.`,
        aiSummary: `No modifications detected — record fully consistent with sealed state.`,
        txHash: a.txHash,
      })
    }
  })

  // Sort chronologically
  auditLog.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

/* ─── Helpers ────────────────────────────────────────────────── */

function generateEditSummary(row: CDRLRow, field: string, _oldValue: string, _newValue: string): string {
  const fieldLabels: Record<string, string> = {
    title: 'deliverable title',
    diNumber: 'DI number',
    contractDueFinish: 'contract due date',
    calculatedDueDate: 'calculated due date',
    submittalGuidance: 'submittal guidance',
    actualSubmissionDate: 'actual submission date',
    received: 'receipt status',
    calendarDaysToReview: 'review period',
    notes: 'program notes',
  }
  const label = fieldLabels[field] || field

  if (field === 'contractDueFinish' || field === 'calculatedDueDate') {
    return `Schedule change detected on ${row.id} — ${label} was updated, which may affect milestone tracking and downstream dependencies.`
  }
  if (field === 'actualSubmissionDate') {
    return `Submittal date updated for ${row.id} — this impacts contract compliance calculations and government review timelines.`
  }
  if (field === 'notes') {
    return `Program notes modified for ${row.id} — review the updated remarks for current status and recommended actions.`
  }
  return `The ${label} for ${row.id} was modified — if this record is sealed, a re-seal may be needed to maintain trust integrity.`
}

/* ─── Summary for PDF / sidebar header ───────────────────────── */
export interface AuditSummary {
  totalSeals: number
  totalVerifications: number
  totalMismatches: number
  totalEdits: number
  lastSealDate: string | null
  lastVerifyDate: string | null
  trustStatus: 'Fully Verified & Sealed' | 'Pending Review' | 'Mismatches Detected'
  trustColor: 'green' | 'yellow' | 'red'
}

export function getAuditSummary(rowIds?: string[]): AuditSummary {
  const events = rowIds
    ? auditLog.filter(e => rowIds.includes(e.rowId))
    : auditLog

  const seals = events.filter(e => e.type === 'Sealed' || e.type === 'Re-Sealed')
  const verifications = events.filter(e => e.type === 'Verified')
  const mismatches = events.filter(e => e.type === 'Mismatch Detected')
  const edits = events.filter(e => e.type === 'Edited')

  const lastSeal = seals.length > 0 ? seals[seals.length - 1].timestamp : null
  const lastVerify = verifications.length > 0 ? verifications[verifications.length - 1].timestamp : null

  let trustStatus: AuditSummary['trustStatus'] = 'Fully Verified & Sealed'
  let trustColor: AuditSummary['trustColor'] = 'green'

  if (mismatches.length > 0) {
    // Check if mismatches were resolved by re-seals
    const unresolvedMismatches = mismatches.filter(mm => {
      const laterReseal = seals.find(s => s.rowId === mm.rowId && s.timestamp > mm.timestamp)
      return !laterReseal
    })
    if (unresolvedMismatches.length > 0) {
      trustStatus = 'Mismatches Detected'
      trustColor = 'red'
    }
  }

  if (seals.length === 0 && trustColor === 'green') {
    trustStatus = 'Pending Review'
    trustColor = 'yellow'
  }

  return {
    totalSeals: seals.length,
    totalVerifications: verifications.length,
    totalMismatches: mismatches.length,
    totalEdits: edits.length,
    lastSealDate: lastSeal,
    lastVerifyDate: lastVerify,
    trustStatus,
    trustColor,
  }
}
