import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAuditLog,
  getAuditLogForRow,
  clearAuditLog,
  recordSeal,
  recordReseal,
  recordVerification,
  recordEdit,
  recordAIRemarkUpdate,
  recordExternalFeed,
  getAuditSummary,
  seedAuditHistory,
} from '../utils/auditTrail'
import type { DRLRow, AnchorRecord } from '../types'

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

function makeAnchor(overrides: Partial<AnchorRecord> = {}): AnchorRecord {
  return {
    rowId: 'DRL-001',
    hash: 'abc123def456abc123def456abc123de',
    timestamp: '2026-04-01T10:00:00.000Z',
    txHash: 'TX123ABC',
    ledgerIndex: 42000,
    network: 'testnet',
    explorerUrl: 'https://testnet.xrpl.org/tx/TX123ABC',
    slsFee: '0.000012',
    ...overrides,
  }
}

/* ─── Tests ──────────────────────────────────────────────────── */

describe('auditTrail', () => {
  beforeEach(() => {
    clearAuditLog()
  })

  it('starts with an empty audit log', () => {
    expect(getAuditLog()).toEqual([])
  })

  it('recordSeal adds a Sealed event', () => {
    const row = makeRow()
    const anchor = makeAnchor()
    recordSeal(row, anchor)

    const log = getAuditLog()
    expect(log).toHaveLength(1)
    expect(log[0].type).toBe('Sealed')
    expect(log[0].rowId).toBe('DRL-001')
    expect(log[0].txHash).toBe('TX123ABC')
    expect(log[0].description).toContain('sealed to XRPL')
  })

  it('recordReseal adds a Re-Sealed event', () => {
    const row = makeRow()
    const anchor = makeAnchor()
    recordReseal(row, anchor)

    const log = getAuditLog()
    expect(log).toHaveLength(1)
    expect(log[0].type).toBe('Re-Sealed')
    expect(log[0].description).toContain('re-sealed')
  })

  it('recordVerification adds a Verified event on match', () => {
    const row = makeRow()
    recordVerification(row, true, 'hash1', 'hash1', 'TX123')

    const log = getAuditLog()
    expect(log).toHaveLength(1)
    expect(log[0].type).toBe('Verified')
    expect(log[0].description).toContain('verification passed')
  })

  it('recordVerification adds a Mismatch event on no match', () => {
    const row = makeRow()
    recordVerification(row, false, 'currentHash123', 'anchorHash456', 'TX123')

    const log = getAuditLog()
    expect(log).toHaveLength(1)
    expect(log[0].type).toBe('Mismatch Detected')
    expect(log[0].details?.currentHash).toBeDefined()
    expect(log[0].details?.anchoredHash).toBeDefined()
  })

  it('recordEdit adds an Edited event with details', () => {
    const row = makeRow()
    recordEdit(row, 'notes', 'old note', 'new note')

    const log = getAuditLog()
    expect(log).toHaveLength(1)
    expect(log[0].type).toBe('Edited')
    expect(log[0].details?.field).toBe('notes')
    expect(log[0].details?.oldValue).toBe('old note')
    expect(log[0].details?.newValue).toBe('new note')
  })

  it('recordEdit skips when old === new', () => {
    const row = makeRow()
    recordEdit(row, 'notes', 'same', 'same')
    expect(getAuditLog()).toHaveLength(0)
  })

  it('recordAIRemarkUpdate adds AI Remark Updated event', () => {
    const row = makeRow()
    recordAIRemarkUpdate(row, 'AI says this looks good')

    const log = getAuditLog()
    expect(log).toHaveLength(1)
    expect(log[0].type).toBe('AI Remark Updated')
  })

  it('recordExternalFeed adds External Data Feed event', () => {
    const row = makeRow()
    recordExternalFeed(row, 'NSERC IDE', 'Row synced from PMS 300')

    const log = getAuditLog()
    expect(log).toHaveLength(1)
    expect(log[0].type).toBe('External Data Feed')
    expect(log[0].description).toContain('NSERC IDE')
  })

  it('getAuditLogForRow filters by rowId', () => {
    const row1 = makeRow({ id: 'DRL-001' })
    const row2 = makeRow({ id: 'DRL-002', title: 'Other' })
    recordSeal(row1, makeAnchor({ rowId: 'DRL-001' }))
    recordSeal(row2, makeAnchor({ rowId: 'DRL-002' }))

    expect(getAuditLogForRow('DRL-001')).toHaveLength(1)
    expect(getAuditLogForRow('DRL-002')).toHaveLength(1)
    expect(getAuditLogForRow('DRL-999')).toHaveLength(0)
  })

  it('clearAuditLog removes all events', () => {
    recordSeal(makeRow(), makeAnchor())
    expect(getAuditLog()).toHaveLength(1)
    clearAuditLog()
    expect(getAuditLog()).toHaveLength(0)
  })

  it('getAuditLog returns a copy (not a reference)', () => {
    recordSeal(makeRow(), makeAnchor())
    const log1 = getAuditLog()
    const log2 = getAuditLog()
    expect(log1).not.toBe(log2)
    expect(log1).toEqual(log2)
  })
})

describe('getAuditSummary', () => {
  beforeEach(() => {
    clearAuditLog()
  })

  it('returns correct counts', () => {
    const row = makeRow()
    const anchor = makeAnchor()
    recordSeal(row, anchor)
    recordVerification(row, true, 'h', 'h', 'tx')
    recordEdit(row, 'notes', 'a', 'b')

    const summary = getAuditSummary()
    expect(summary.totalSeals).toBe(1)
    expect(summary.totalVerifications).toBe(1)
    expect(summary.totalMismatches).toBe(0)
    expect(summary.totalEdits).toBe(1)
  })

  it('returns green trust status when sealed and verified', () => {
    recordSeal(makeRow(), makeAnchor())
    recordVerification(makeRow(), true, 'h', 'h', 'tx')

    const summary = getAuditSummary()
    expect(summary.trustStatus).toBe('Fully Verified & Sealed')
    expect(summary.trustColor).toBe('green')
  })

  it('returns yellow trust status when no seals exist', () => {
    const summary = getAuditSummary()
    expect(summary.trustStatus).toBe('Pending Review')
    expect(summary.trustColor).toBe('yellow')
  })

  it('returns red trust status when unresolved mismatches exist', () => {
    const row = makeRow()
    recordSeal(row, makeAnchor())
    recordVerification(row, false, 'current', 'sealed', 'tx')

    const summary = getAuditSummary()
    expect(summary.trustStatus).toBe('Mismatches Detected')
    expect(summary.trustColor).toBe('red')
  })

  it('filters by rowIds when provided', () => {
    const row1 = makeRow({ id: 'DRL-001' })
    const row2 = makeRow({ id: 'DRL-002' })
    recordSeal(row1, makeAnchor({ rowId: 'DRL-001' }))
    recordSeal(row2, makeAnchor({ rowId: 'DRL-002' }))

    const summary = getAuditSummary(['DRL-001'])
    expect(summary.totalSeals).toBe(1)
  })
})

describe('seedAuditHistory', () => {
  beforeEach(() => {
    clearAuditLog()
  })

  it('seeds events for rows with anchors', () => {
    const rows = [makeRow()]
    const anchors = { 'DRL-001': makeAnchor() }
    seedAuditHistory(rows, anchors)

    const log = getAuditLog()
    // Each anchored row gets: External Data Feed + Sealed + Verified = 3
    expect(log.length).toBeGreaterThanOrEqual(3)
  })

  it('does not re-seed if already seeded', () => {
    const rows = [makeRow()]
    const anchors = { 'DRL-001': makeAnchor() }
    seedAuditHistory(rows, anchors)
    const count = getAuditLog().length
    seedAuditHistory(rows, anchors)
    expect(getAuditLog().length).toBe(count)
  })
})
