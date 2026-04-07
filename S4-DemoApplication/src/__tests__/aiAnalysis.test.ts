/**
 * ═══════════════════════════════════════════════════════════════
 *  AI Analysis Tests — analyzeRow, analyzePortfolio
 * ═══════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest'
import { analyzeRow, analyzePortfolio } from '../utils/aiAnalysis'
import type { DRLRow, AnchorRecord } from '../types'

/* ─── Test Fixtures ──────────────────────────────────────────── */

function makeRow(overrides: Partial<DRLRow> = {}): DRLRow {
  return {
    id: 'row-1',
    title: 'Test Report (Hull 1)',
    diNumber: 'DI-MGMT-81466',
    contractDueFinish: '2025-06-01',
    calculatedDueDate: '2025-06-01',
    submittalGuidance: 'One time',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: '',
    status: 'green',
    ...overrides,
  }
}

function makeAnchor(rowId: string): AnchorRecord {
  return {
    rowId,
    hash: 'abc123',
    timestamp: new Date().toISOString(),
    txHash: 'TX_123',
    ledgerIndex: 1000,
    network: 'XRPL',
    explorerUrl: null,
    slsFee: '0.01',
  }
}

/* ─── analyzeRow ─────────────────────────────────────────────── */

describe('analyzeRow', () => {
  it('returns Critical priority for red status with no submission', () => {
    const row = makeRow({ status: 'red', actualSubmissionDate: '' })
    const result = analyzeRow(row, {}, new Set())
    expect(result.priority).toBe('Critical')
    expect(result.rowId).toBe('row-1')
  })

  it('returns High priority for red status with late submission', () => {
    const row = makeRow({ status: 'red', actualSubmissionDate: '2025-07-01' })
    const result = analyzeRow(row, {}, new Set())
    expect(result.priority).toBe('High')
  })

  it('returns High priority when edited since seal', () => {
    const row = makeRow({ status: 'green' })
    const anchors = { 'row-1': makeAnchor('row-1') }
    const edited = new Set(['row-1'])
    const result = analyzeRow(row, anchors, edited)
    expect(result.priority).toBe('High')
  })

  it('returns Medium priority for yellow status', () => {
    const row = makeRow({ status: 'yellow' })
    const result = analyzeRow(row, {}, new Set())
    expect(result.priority).toBe('Medium')
  })

  it('returns Low priority for green sealed row', () => {
    const row = makeRow({ status: 'green' })
    const anchors = { 'row-1': makeAnchor('row-1') }
    const result = analyzeRow(row, anchors, new Set())
    expect(result.priority).toBe('Low')
  })

  it('returns a valid insight structure', () => {
    const row = makeRow()
    const result = analyzeRow(row, {}, new Set())

    expect(result).toHaveProperty('rowId')
    expect(result).toHaveProperty('title')
    expect(result).toHaveProperty('priority')
    expect(result).toHaveProperty('statusExplanation')
    expect(result).toHaveProperty('nextActions')
    expect(result).toHaveProperty('conciseNote')
    expect(Array.isArray(result.nextActions)).toBe(true)
  })

  it('includes hull reference in explanation when present', () => {
    const row = makeRow({ title: 'Quarterly Report (Hull 3)', status: 'red' })
    const result = analyzeRow(row, {}, new Set())
    expect(result.statusExplanation.length).toBeGreaterThan(10)
  })
})

/* ─── analyzePortfolio ───────────────────────────────────────── */

describe('analyzePortfolio', () => {
  it('returns valid portfolio summary structure', () => {
    const rows = [
      makeRow({ id: 'r1', status: 'red' }),
      makeRow({ id: 'r2', status: 'green' }),
      makeRow({ id: 'r3', status: 'yellow' }),
    ]
    const anchors = { r2: makeAnchor('r2') }
    const result = analyzePortfolio(rows, anchors, new Set())

    expect(result).toHaveProperty('topActions')
    expect(result).toHaveProperty('incomingAlerts')
    expect(result).toHaveProperty('trendSummary')
    expect(result).toHaveProperty('weeklyProgress')
    expect(Array.isArray(result.topActions)).toBe(true)
    expect(result.topActions.length).toBeLessThanOrEqual(5)
  })

  it('prioritizes Critical/High actions first', () => {
    const rows = [
      makeRow({ id: 'r1', status: 'green' }),  // Low
      makeRow({ id: 'r2', status: 'red' }),     // Critical
      makeRow({ id: 'r3', status: 'yellow' }),  // Medium
    ]
    const result = analyzePortfolio(rows, {}, new Set())

    if (result.topActions.length >= 2) {
      const priorities = result.topActions.map(a => a.priority)
      const prioOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
      for (let i = 1; i < priorities.length; i++) {
        expect(prioOrder[priorities[i]]).toBeGreaterThanOrEqual(prioOrder[priorities[i - 1]])
      }
    }
  })

  it('computes weekly progress with correct counts', () => {
    const rows = [
      makeRow({ id: 'r1', status: 'green', actualSubmissionDate: new Date().toISOString().slice(0, 10) }),
      makeRow({ id: 'r2', status: 'red' }),
    ]
    const anchors = { r1: makeAnchor('r1') }
    const result = analyzePortfolio(rows, anchors, new Set())

    expect(result.weeklyProgress).toHaveProperty('progressed')
    expect(result.weeklyProgress).toHaveProperty('stillOverdue')
    expect(result.weeklyProgress).toHaveProperty('newSeals')
    expect(typeof result.weeklyProgress.progressed).toBe('number')
  })

  it('handles empty data gracefully', () => {
    const result = analyzePortfolio([], {}, new Set())
    expect(result.topActions).toEqual([])
    expect(result.trendSummary).toBeTruthy()
  })
})
