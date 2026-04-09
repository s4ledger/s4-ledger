import { describe, it, expect } from 'vitest'
import { runAnomalyDetection, getAnomalySummary } from '../utils/anomalyDetection'
import type { DRLRow, AnchorRecord } from '../types'
import type { AuditEvent } from '../utils/auditTrail'
import type { ChangeEntry } from '../utils/changeLog'

/* ─── Fixtures ───────────────────────────────────────────────── */

function makeRow(overrides: Partial<DRLRow> = {}): DRLRow {
  return {
    id: 'DRL-001',
    title: 'Test Plan',
    diNumber: 'DI-MGMT-81024A',
    contractDueFinish: '2026-06-01',
    calculatedDueDate: '2026-05-15',
    submittalGuidance: 'Per contract',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: '',
    status: 'pending',
    ...overrides,
  }
}

function makeChange(overrides: Partial<ChangeEntry> = {}): ChangeEntry {
  return {
    id: 'chg-1',
    user_email: 'user@test.mil',
    user_role: 'PM',
    user_org: null,
    row_id: 'DRL-001',
    row_title: 'Test Plan',
    field: 'notes',
    field_label: 'Notes',
    old_value: 'old',
    new_value: 'new',
    change_type: 'edit',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/* ─── Tests ──────────────────────────────────────────────────── */

describe('anomalyDetection', () => {
  const emptyAnchors: Record<string, AnchorRecord> = {}
  const emptyAudit: AuditEvent[] = []
  const emptyChanges: ChangeEntry[] = []
  const emptyEdited = new Set<string>()

  it('returns empty anomalies for clean data', () => {
    const data = [makeRow({ status: 'green', received: 'Yes', actualSubmissionDate: '2026-05-01' })]
    const result = runAnomalyDetection(data, emptyAnchors, emptyAudit, emptyChanges, emptyEdited)
    expect(result.length).toBe(0)
  })

  it('detects status regression (green → red)', () => {
    const changes = [
      makeChange({
        field: 'status',
        change_type: 'status_change',
        old_value: 'green',
        new_value: 'red',
      }),
    ]
    const result = runAnomalyDetection([makeRow()], emptyAnchors, emptyAudit, changes, emptyEdited)
    const regression = result.find(a => a.type === 'status_regression')
    expect(regression).toBeDefined()
    expect(regression!.severity).toBe('critical')
  })

  it('detects SLA breach for overdue deliverables', () => {
    const row = makeRow({
      contractDueFinish: '2025-01-01', // well past due
      received: 'No',
      actualSubmissionDate: '',
    })
    const result = runAnomalyDetection([row], emptyAnchors, emptyAudit, emptyChanges, emptyEdited)
    const breach = result.find(a => a.type === 'sla_breach')
    expect(breach).toBeDefined()
    expect(breach!.severity).toBe('critical') // >30 days late
  })

  it('detects unsealed edits', () => {
    const row = makeRow({ id: 'DRL-001' })
    const anchors: Record<string, AnchorRecord> = {
      'DRL-001': {
        rowId: 'DRL-001', hash: 'abc', timestamp: '2026-01-01T00:00:00Z',
        txHash: 'tx1', ledgerIndex: 100, network: 'testnet',
        explorerUrl: null, slsFee: null,
      },
    }
    const edited = new Set(['DRL-001'])
    const result = runAnomalyDetection([row], anchors, emptyAudit, emptyChanges, edited)
    const unsealed = result.find(a => a.type === 'unsealed_edit')
    expect(unsealed).toBeDefined()
    expect(unsealed!.severity).toBe('warning')
  })

  it('detects missing submissions for pending rows', () => {
    const row = makeRow({ status: 'pending', received: 'No', actualSubmissionDate: '' })
    const result = runAnomalyDetection([row], emptyAnchors, emptyAudit, emptyChanges, emptyEdited)
    const missing = result.find(a => a.type === 'missing_submission')
    expect(missing).toBeDefined()
    expect(missing!.severity).toBe('info')
  })

  it('detects compliance drift when >25% red', () => {
    const rows = [
      makeRow({ id: 'DRL-001', status: 'red' }),
      makeRow({ id: 'DRL-002', status: 'red' }),
      makeRow({ id: 'DRL-003', status: 'green', received: 'Yes', actualSubmissionDate: '2026-05-01' }),
    ]
    const result = runAnomalyDetection(rows, emptyAnchors, emptyAudit, emptyChanges, emptyEdited)
    const drift = result.find(a => a.type === 'compliance_drift')
    expect(drift).toBeDefined()
    expect(drift!.severity).toBe('critical')
  })

  it('detects overdue review (>30 days)', () => {
    const row = makeRow({ calendarDaysToReview: 45, received: 'Yes', actualSubmissionDate: '2026-01-01' })
    const result = runAnomalyDetection([row], emptyAnchors, emptyAudit, emptyChanges, emptyEdited)
    const overdue = result.find(a => a.type === 'overdue_review')
    expect(overdue).toBeDefined()
    expect(overdue!.severity).toBe('warning')
  })

  it('sorts anomalies by severity (critical first)', () => {
    const rows = [
      makeRow({ id: 'DRL-001', status: 'red', contractDueFinish: '2024-01-01', received: 'No' }),
      makeRow({ id: 'DRL-002', status: 'pending', received: 'No' }),
    ]
    const result = runAnomalyDetection(rows, emptyAnchors, emptyAudit, emptyChanges, emptyEdited)
    if (result.length >= 2) {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      for (let i = 1; i < result.length; i++) {
        expect(severityOrder[result[i].severity]).toBeGreaterThanOrEqual(
          severityOrder[result[i - 1].severity]
        )
      }
    }
  })
})

describe('getAnomalySummary', () => {
  it('counts anomalies by severity', () => {
    const anomalies = [
      { id: '1', type: 'sla_breach' as const, severity: 'critical' as const, title: '', description: '', affectedRows: [], detectedAt: '' },
      { id: '2', type: 'unsealed_edit' as const, severity: 'warning' as const, title: '', description: '', affectedRows: [], detectedAt: '' },
      { id: '3', type: 'missing_submission' as const, severity: 'info' as const, title: '', description: '', affectedRows: [], detectedAt: '' },
    ]
    const summary = getAnomalySummary(anomalies)
    expect(summary.critical).toBe(1)
    expect(summary.warning).toBe(1)
    expect(summary.info).toBe(1)
    expect(summary.total).toBe(3)
  })

  it('returns zeros for empty array', () => {
    const summary = getAnomalySummary([])
    expect(summary.total).toBe(0)
    expect(summary.critical).toBe(0)
  })
})
