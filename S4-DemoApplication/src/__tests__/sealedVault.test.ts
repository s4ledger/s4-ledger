import { describe, it, expect, beforeEach } from 'vitest'
import { storeSealed, getSealed, diffRow, analyzeMismatch } from '../utils/sealedVault'
import type { DRLRow } from '../types'

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

describe('sealedVault', () => {
  describe('storeSealed / getSealed', () => {
    it('stores and retrieves a deep copy', () => {
      const row = makeRow()
      storeSealed('DRL-001', row)
      const sealed = getSealed('DRL-001')
      expect(sealed).toEqual(row)
      expect(sealed).not.toBe(row) // deep copy
    })

    it('returns null for unknown rowId', () => {
      expect(getSealed('NOPE')).toBeNull()
    })

    it('stored copy is immune to external mutation', () => {
      const row = makeRow({ notes: 'original' })
      storeSealed('DRL-001', row)
      row.notes = 'mutated'
      expect(getSealed('DRL-001')!.notes).toBe('original')
    })
  })

  describe('diffRow', () => {
    it('returns empty array when rows are identical', () => {
      const row = makeRow()
      expect(diffRow(row, row)).toEqual([])
    })

    it('detects a single field change', () => {
      const sealed = makeRow({ notes: 'original' })
      const current = makeRow({ notes: 'updated' })
      const diffs = diffRow(current, sealed)
      expect(diffs).toHaveLength(1)
      expect(diffs[0].field).toBe('notes')
      expect(diffs[0].sealed).toBe('original')
      expect(diffs[0].current).toBe('updated')
      expect(diffs[0].label).toBe('Notes')
    })

    it('detects multiple field changes', () => {
      const sealed = makeRow({ status: 'green', received: 'Yes' })
      const current = makeRow({ status: 'red', received: 'No' })
      const diffs = diffRow(current, sealed)
      expect(diffs.length).toBeGreaterThanOrEqual(2)
      const fields = diffs.map(d => d.field)
      expect(fields).toContain('status')
      expect(fields).toContain('received')
    })
  })

  describe('analyzeMismatch', () => {
    const row = makeRow()

    it('returns Low risk when no diffs', () => {
      const result = analyzeMismatch(row, [])
      expect(result.risk).toBe('Low')
      expect(result.summary).toContain('serialization')
    })

    it('returns High risk for critical field changes (status)', () => {
      const result = analyzeMismatch(row, [
        { field: 'status', label: 'Status', sealed: 'green', current: 'red' },
      ])
      expect(result.risk).toBe('High')
      expect(result.summary).toContain('Critical')
    })

    it('returns High risk for received field change', () => {
      const result = analyzeMismatch(row, [
        { field: 'received', label: 'Received', sealed: 'Yes', current: 'No' },
      ])
      expect(result.risk).toBe('High')
    })

    it('returns Medium risk for date changes', () => {
      const result = analyzeMismatch(row, [
        { field: 'contractDueFinish', label: 'Contract Due/Finish', sealed: '2026-06-01', current: '2026-07-01' },
      ])
      expect(result.risk).toBe('Medium')
      expect(result.summary).toContain('Schedule')
    })

    it('returns Low risk for notes-only change', () => {
      const result = analyzeMismatch(row, [
        { field: 'notes', label: 'Notes', sealed: 'old', current: 'new' },
      ])
      expect(result.risk).toBe('Low')
      expect(result.summary).toContain('notes')
    })

    it('returns Medium risk for other field changes', () => {
      const result = analyzeMismatch(row, [
        { field: 'title', label: 'Title', sealed: 'Old Title', current: 'New Title' },
        { field: 'diNumber', label: 'DI Number', sealed: 'DI-001', current: 'DI-002' },
      ])
      expect(result.risk).toBe('Medium')
    })

    it('always returns summary and recommendation', () => {
      const scenarios = [
        [],
        [{ field: 'status', label: 'Status', sealed: 'green', current: 'red' }],
        [{ field: 'notes', label: 'Notes', sealed: 'a', current: 'b' }],
      ]
      for (const diffs of scenarios) {
        const result = analyzeMismatch(row, diffs)
        expect(result.summary.length).toBeGreaterThan(0)
        expect(result.recommendation.length).toBeGreaterThan(0)
      }
    })
  })
})
