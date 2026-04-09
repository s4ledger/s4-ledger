import { DRLRow, AnchorRecord } from '../types'
import { AuditEvent } from './auditTrail'
import { ChangeEntry } from './changeLog'
import { chatWithAI } from './aiService'

/* ─── Types ──────────────────────────────────────────────────── */

export type AnomalySeverity = 'critical' | 'warning' | 'info'

export type AnomalyType =
  | 'status_regression'
  | 'edit_velocity'
  | 'sla_breach'
  | 'bulk_change'
  | 'compliance_drift'
  | 'unsealed_edit'
  | 'unusual_pattern'
  | 'missing_submission'
  | 'overdue_review'

export interface Anomaly {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  title: string
  description: string
  affectedRows: string[]
  detectedAt: string
  aiRecommendation?: string
}

export interface AnomalySummary {
  critical: number
  warning: number
  info: number
  total: number
  lastScan: string
}

/* ─── Helpers ────────────────────────────────────────────────── */

let idCounter = 0
function nextId(): string {
  return `ANOM-${Date.now()}-${++idCounter}`
}

const STATUS_RANK: Record<string, number> = { green: 3, yellow: 2, red: 1, pending: 0 }

/* ─── Detection Rules ────────────────────────────────────────── */

function detectStatusRegressions(
  changes: ChangeEntry[],
): Anomaly[] {
  const anomalies: Anomaly[] = []
  const statusChanges = changes.filter(c => c.change_type === 'status_change' || c.field === 'status')

  // group by row
  const byRow = new Map<string, ChangeEntry[]>()
  for (const c of statusChanges) {
    const arr = byRow.get(c.row_id) || []
    arr.push(c)
    byRow.set(c.row_id, arr)
  }

  for (const [rowId, entries] of byRow) {
    for (const e of entries) {
      const oldRank = STATUS_RANK[e.old_value || ''] ?? -1
      const newRank = STATUS_RANK[e.new_value || ''] ?? -1
      if (oldRank > newRank && newRank <= 1) {
        anomalies.push({
          id: nextId(),
          type: 'status_regression',
          severity: newRank === 1 ? 'critical' : 'warning',
          title: `Status regression on ${e.row_title}`,
          description: `Status changed from "${e.old_value}" to "${e.new_value}" — potential quality or compliance issue.`,
          affectedRows: [rowId],
          detectedAt: e.created_at,
        })
      }
    }
  }
  return anomalies
}

function detectEditVelocity(
  changes: ChangeEntry[],
): Anomaly[] {
  const anomalies: Anomaly[] = []
  const byRow = new Map<string, ChangeEntry[]>()
  for (const c of changes) {
    if (c.change_type !== 'edit') continue
    const arr = byRow.get(c.row_id) || []
    arr.push(c)
    byRow.set(c.row_id, arr)
  }

  for (const [rowId, entries] of byRow) {
    if (entries.length < 2) continue
    // check for bursts — more than 5 edits within a 1-hour window
    const sorted = [...entries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    for (let i = 0; i <= sorted.length - 5; i++) {
      const start = new Date(sorted[i].created_at).getTime()
      const end = new Date(sorted[i + 4].created_at).getTime()
      if (end - start < 3_600_000) {
        anomalies.push({
          id: nextId(),
          type: 'edit_velocity',
          severity: 'warning',
          title: `Rapid edits on ${sorted[i].row_title}`,
          description: `${sorted.length} edits detected in a short window — may indicate data instability or unauthorized bulk modifications.`,
          affectedRows: [rowId],
          detectedAt: sorted[i + 4].created_at,
        })
        break
      }
    }
  }
  return anomalies
}

function detectSLABreaches(data: DRLRow[]): Anomaly[] {
  const anomalies: Anomaly[] = []
  const now = new Date()

  for (const row of data) {
    // Overdue submission
    if (row.received !== 'Yes' && row.contractDueFinish) {
      const due = new Date(row.contractDueFinish)
      if (due < now) {
        const daysLate = Math.ceil((now.getTime() - due.getTime()) / 86_400_000)
        anomalies.push({
          id: nextId(),
          type: 'sla_breach',
          severity: daysLate > 30 ? 'critical' : 'warning',
          title: `Overdue submission: ${row.title}`,
          description: `${daysLate} days past contract due date (${row.contractDueFinish}). No submission received.`,
          affectedRows: [row.id],
          detectedAt: now.toISOString(),
        })
      }
    }

    // Late submission
    if (row.actualSubmissionDate && row.contractDueFinish) {
      const due = new Date(row.contractDueFinish)
      const submitted = new Date(row.actualSubmissionDate)
      if (submitted > due) {
        const daysLate = Math.ceil((submitted.getTime() - due.getTime()) / 86_400_000)
        if (daysLate >= 3) {
          anomalies.push({
            id: nextId(),
            type: 'sla_breach',
            severity: daysLate > 14 ? 'critical' : 'info',
            title: `Late submission: ${row.title}`,
            description: `Submitted ${daysLate} days after contract due date.`,
            affectedRows: [row.id],
            detectedAt: row.actualSubmissionDate,
          })
        }
      }
    }

    // Review duration exceeds threshold
    if (row.calendarDaysToReview !== null && row.calendarDaysToReview > 30) {
      anomalies.push({
        id: nextId(),
        type: 'overdue_review',
        severity: row.calendarDaysToReview > 60 ? 'critical' : 'warning',
        title: `Extended review period: ${row.title}`,
        description: `Review has taken ${row.calendarDaysToReview} calendar days — exceeds 30-day threshold.`,
        affectedRows: [row.id],
        detectedAt: now.toISOString(),
      })
    }
  }
  return anomalies
}

function detectBulkChanges(changes: ChangeEntry[]): Anomaly[] {
  const anomalies: Anomaly[] = []

  // Group changes by user + 15-minute windows
  const byUser = new Map<string, ChangeEntry[]>()
  for (const c of changes) {
    const key = c.user_email || 'unknown'
    const arr = byUser.get(key) || []
    arr.push(c)
    byUser.set(key, arr)
  }

  for (const [user, entries] of byUser) {
    if (entries.length < 8) continue
    const sorted = [...entries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    for (let i = 0; i <= sorted.length - 8; i++) {
      const start = new Date(sorted[i].created_at).getTime()
      const end = new Date(sorted[i + 7].created_at).getTime()
      if (end - start < 900_000) { // 15 minutes
        const affectedIds = [...new Set(sorted.slice(i, i + 8).map(c => c.row_id))]
        anomalies.push({
          id: nextId(),
          type: 'bulk_change',
          severity: 'warning',
          title: `Bulk modification detected`,
          description: `User "${user}" made 8+ changes across ${affectedIds.length} rows in under 15 minutes.`,
          affectedRows: affectedIds,
          detectedAt: sorted[i + 7].created_at,
        })
        break
      }
    }
  }
  return anomalies
}

function detectUnsealedEdits(
  data: DRLRow[],
  anchors: Record<string, AnchorRecord>,
  editedSinceSeal: Set<string>,
): Anomaly[] {
  const anomalies: Anomaly[] = []

  for (const row of data) {
    if (anchors[row.id] && editedSinceSeal.has(row.id)) {
      anomalies.push({
        id: nextId(),
        type: 'unsealed_edit',
        severity: 'warning',
        title: `Unsealed modifications: ${row.title}`,
        description: `This row was edited after being sealed to the S4 Ledger Trust Layer. Data integrity is not guaranteed until re-sealed.`,
        affectedRows: [row.id],
        detectedAt: new Date().toISOString(),
      })
    }
  }
  return anomalies
}

function detectMissingSubmissions(data: DRLRow[]): Anomaly[] {
  const anomalies: Anomaly[] = []

  for (const row of data) {
    if (row.status === 'pending' && !row.actualSubmissionDate && row.received !== 'Yes') {
      anomalies.push({
        id: nextId(),
        type: 'missing_submission',
        severity: 'info',
        title: `No submission date: ${row.title}`,
        description: `Deliverable is marked as pending with no submission date recorded.`,
        affectedRows: [row.id],
        detectedAt: new Date().toISOString(),
      })
    }
  }
  return anomalies
}

function detectComplianceDrift(data: DRLRow[]): Anomaly[] {
  const anomalies: Anomaly[] = []
  const redCount = data.filter(r => r.status === 'red').length
  const total = data.length

  if (total > 0 && redCount / total > 0.25) {
    anomalies.push({
      id: nextId(),
      type: 'compliance_drift',
      severity: 'critical',
      title: `High non-compliance rate across portfolio`,
      description: `${redCount} of ${total} deliverables (${Math.round(redCount / total * 100)}%) are in "red" status — systemic compliance risk detected.`,
      affectedRows: data.filter(r => r.status === 'red').map(r => r.id),
      detectedAt: new Date().toISOString(),
    })
  }

  const yellowCount = data.filter(r => r.status === 'yellow').length
  if (total > 0 && (redCount + yellowCount) / total > 0.5) {
    anomalies.push({
      id: nextId(),
      type: 'compliance_drift',
      severity: 'warning',
      title: `Majority of deliverables require attention`,
      description: `${redCount + yellowCount} of ${total} deliverables (${Math.round((redCount + yellowCount) / total * 100)}%) are in "red" or "yellow" status.`,
      affectedRows: data.filter(r => r.status === 'red' || r.status === 'yellow').map(r => r.id),
      detectedAt: new Date().toISOString(),
    })
  }

  return anomalies
}

/* ─── Main Detection Entry Point ─────────────────────────────── */

export function runAnomalyDetection(
  data: DRLRow[],
  anchors: Record<string, AnchorRecord>,
  _auditEvents: AuditEvent[],
  changes: ChangeEntry[],
  editedSinceSeal: Set<string>,
): Anomaly[] {
  const anomalies: Anomaly[] = [
    ...detectStatusRegressions(changes),
    ...detectEditVelocity(changes),
    ...detectSLABreaches(data),
    ...detectBulkChanges(changes),
    ...detectUnsealedEdits(data, anchors, editedSinceSeal),
    ...detectMissingSubmissions(data),
    ...detectComplianceDrift(data),
  ]

  // Sort by severity (critical first), then by timestamp desc
  const severityOrder: Record<AnomalySeverity, number> = { critical: 0, warning: 1, info: 2 }
  anomalies.sort((a, b) => {
    const sev = severityOrder[a.severity] - severityOrder[b.severity]
    if (sev !== 0) return sev
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  })

  return anomalies
}

export function getAnomalySummary(anomalies: Anomaly[]): AnomalySummary {
  return {
    critical: anomalies.filter(a => a.severity === 'critical').length,
    warning: anomalies.filter(a => a.severity === 'warning').length,
    info: anomalies.filter(a => a.severity === 'info').length,
    total: anomalies.length,
    lastScan: new Date().toISOString(),
  }
}

/* ─── AI-Powered Recommendation ──────────────────────────────── */

export async function enrichAnomalyWithAI(anomaly: Anomaly): Promise<string> {
  try {
    const res = await chatWithAI({
      message: `Analyze this anomaly detected in a U.S. Navy deliverables tracking system and provide a concise actionable recommendation (2-3 sentences max):

Type: ${anomaly.type}
Severity: ${anomaly.severity}
Title: ${anomaly.title}
Description: ${anomaly.description}
Affected Rows: ${anomaly.affectedRows.join(', ')}

Provide a recommendation for a Program Manager to resolve this issue.`,
      tool_context: 'anomaly_detection',
    })
    if (!res.fallback) return res.response
    return getFallbackRecommendation(anomaly)
  } catch {
    return getFallbackRecommendation(anomaly)
  }
}

function getFallbackRecommendation(anomaly: Anomaly): string {
  switch (anomaly.type) {
    case 'status_regression':
      return 'Review the deliverable status change with the responsible party. Determine root cause and issue a corrective action if warranted.'
    case 'edit_velocity':
      return 'Investigate the rapid edits for potential data entry errors or unauthorized modifications. Verify data integrity and consider re-sealing.'
    case 'sla_breach':
      return 'Escalate to the Contracting Officer. Issue a formal notice to the responsible party and update the risk register.'
    case 'bulk_change':
      return 'Audit the bulk modifications to ensure they were authorized. Verify each change against the contract requirements.'
    case 'unsealed_edit':
      return 'Re-seal the modified rows to restore trust layer integrity. Verify changes are authorized before re-sealing.'
    case 'missing_submission':
      return 'Follow up with the responsible party to obtain submission status. Update the tracker with expected delivery date.'
    case 'compliance_drift':
      return 'Schedule a program review to address systemic compliance issues. Prioritize critical deliverables and assign corrective actions.'
    case 'overdue_review':
      return 'Escalate the review delay. Assign additional reviewers if needed and set a firm completion deadline.'
    case 'unusual_pattern':
      return 'Investigate the unusual activity pattern. Cross-reference with authorized personnel and recent system changes.'
    default:
      return 'Review and take appropriate corrective action.'
  }
}
