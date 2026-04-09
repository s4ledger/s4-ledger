import { describe, it, expect } from 'vitest'
import { getRACIParty, getRACIColor, getWorkflowStages } from '../utils/raciWorkflow'
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

describe('getRACIParty', () => {
  it('returns mapped party for known DI number', () => {
    expect(getRACIParty(makeRow({ diNumber: 'DI-MGMT-81024A' }))).toBe('Shipbuilder')
    expect(getRACIParty(makeRow({ diNumber: 'DI-TMSS-80301C' }))).toBe('Contractor')
    expect(getRACIParty(makeRow({ diNumber: 'DI-ILSS-80085A' }))).toBe('Lead Reviewer')
    expect(getRACIParty(makeRow({ diNumber: 'DI-MISC-80508A' }))).toBe('Program Manager')
    expect(getRACIParty(makeRow({ diNumber: 'DI-MISC-80711B' }))).toBe('SDM')
  })

  it('defaults to Program Manager for red status with unknown DI', () => {
    expect(getRACIParty(makeRow({ diNumber: 'DI-UNKNOWN', status: 'red' }))).toBe('Program Manager')
  })

  it('defaults to Shipbuilder for non-red status with unknown DI', () => {
    expect(getRACIParty(makeRow({ diNumber: 'DI-UNKNOWN', status: 'green' }))).toBe('Shipbuilder')
  })
})

describe('getRACIColor', () => {
  it('returns a Tailwind class string for each party', () => {
    const parties = ['Shipbuilder', 'SDM', 'Contractor', 'Lead Reviewer', 'Program Manager'] as const
    for (const party of parties) {
      const color = getRACIColor(party)
      expect(color).toContain('bg-')
      expect(color).toContain('text-')
    }
  })
})

describe('getWorkflowStages', () => {
  it('returns 4 stages', () => {
    const stages = getWorkflowStages(makeRow())
    expect(stages).toHaveLength(4)
  })

  it('stage 1 is In Progress when not submitted', () => {
    const stages = getWorkflowStages(makeRow({ actualSubmissionDate: '' }))
    expect(stages[0].label).toBe('Shipbuilder Submission')
    expect(stages[0].status).toBe('In Progress')
  })

  it('stage 1 is Completed when submitted', () => {
    const stages = getWorkflowStages(makeRow({ actualSubmissionDate: '2026-05-01' }))
    expect(stages[0].status).toBe('Completed')
  })

  it('stage 1 is Overdue when status is red and not submitted', () => {
    const stages = getWorkflowStages(makeRow({ status: 'red', actualSubmissionDate: '' }))
    expect(stages[0].status).toBe('Overdue')
  })

  it('all stages are Completed for a green, received row', () => {
    const row = makeRow({
      status: 'green',
      received: 'Yes',
      actualSubmissionDate: '2026-05-01',
      calendarDaysToReview: 10,
    })
    const stages = getWorkflowStages(row)
    expect(stages[0].status).toBe('Completed')
    expect(stages[1].status).toBe('Completed')
    expect(stages[2].status).toBe('Completed')
    expect(stages[3].status).toBe('Completed')
  })

  it('stage 2 is Pending when not yet submitted', () => {
    const stages = getWorkflowStages(makeRow())
    expect(stages[1].status).toBe('Pending')
  })
})
