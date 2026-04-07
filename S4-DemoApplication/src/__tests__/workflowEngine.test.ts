/**
 * ═══════════════════════════════════════════════════════════════
 *  Workflow Engine Tests — state machine, transitions, SLA
 * ═══════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest'
import {
  createWorkflowState,
  getTemplate,
  inferWorkflowState,
  getAvailableTransitions,
  executeTransition,
  isSLABreached,
  getSLADaysRemaining,
  isTerminal,
  getTimelineStages,
  getWorkflowBadge,
  WORKFLOW_TEMPLATES,
} from '../utils/workflowEngine'
import type { DRLRow } from '../types'

/* ─── Helper ─────────────────────────────────────────────────── */

function makeRow(overrides: Partial<DRLRow> = {}): DRLRow {
  return {
    id: 'WF-001',
    title: 'Test DRL',
    diNumber: 'DI-TEST',
    contractDueFinish: '2026-12-01',
    calculatedDueDate: '2026-12-01',
    submittalGuidance: '',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: '',
    status: 'pending',
    ...overrides,
  }
}

/* ─── Template Registry ──────────────────────────────────────── */

describe('WORKFLOW_TEMPLATES', () => {
  it('includes standard-drl and expedited templates', () => {
    expect(WORKFLOW_TEMPLATES.length).toBeGreaterThanOrEqual(2)
    expect(WORKFLOW_TEMPLATES.find(t => t.id === 'standard-drl')).toBeDefined()
    expect(WORKFLOW_TEMPLATES.find(t => t.id === 'expedited')).toBeDefined()
  })
})

describe('getTemplate', () => {
  it('returns standard-drl by default for unknown id', () => {
    const t = getTemplate('nonexistent')
    expect(t.id).toBe('standard-drl')
  })

  it('returns the correct template for a known id', () => {
    const t = getTemplate('expedited')
    expect(t.id).toBe('expedited')
    expect(t.name).toContain('Expedited')
  })
})

/* ─── createWorkflowState ────────────────────────────────────── */

describe('createWorkflowState', () => {
  it('starts at the initial stage with empty history', () => {
    const state = createWorkflowState()
    expect(state.currentStage).toBe('draft')
    expect(state.templateId).toBe('standard-drl')
    expect(state.history).toHaveLength(0)
  })

  it('respects custom template id', () => {
    const state = createWorkflowState('expedited')
    expect(state.templateId).toBe('expedited')
    expect(state.currentStage).toBe('draft')
  })
})

/* ─── inferWorkflowState ─────────────────────────────────────── */

describe('inferWorkflowState', () => {
  it('infers draft for unsubmitted row', () => {
    const state = inferWorkflowState(makeRow())
    expect(state.currentStage).toBe('draft')
  })

  it('infers submitted for pending with submission date', () => {
    const state = inferWorkflowState(makeRow({
      status: 'pending',
      actualSubmissionDate: '2026-06-15',
    }))
    expect(state.currentStage).toBe('submitted')
  })

  it('infers accepted for green+received row', () => {
    const state = inferWorkflowState(makeRow({
      status: 'green',
      actualSubmissionDate: '2026-06-15',
      received: 'Yes',
    }))
    expect(state.currentStage).toBe('accepted')
  })

  it('infers under_review for yellow+submitted', () => {
    const state = inferWorkflowState(makeRow({
      status: 'yellow',
      actualSubmissionDate: '2026-06-15',
    }))
    expect(state.currentStage).toBe('under_review')
  })

  it('uses submission date for enteredStageAt when available', () => {
    const state = inferWorkflowState(makeRow({
      status: 'pending',
      actualSubmissionDate: '2026-06-15',
    }))
    expect(state.enteredStageAt).toContain('2026-06-15')
  })
})

/* ─── getAvailableTransitions ────────────────────────────────── */

describe('getAvailableTransitions', () => {
  it('shows Submit for Shipbuilder in draft', () => {
    const state = createWorkflowState()
    const transitions = getAvailableTransitions(state, 'Shipbuilder')
    expect(transitions).toHaveLength(1)
    expect(transitions[0].action).toContain('Submit')
  })

  it('shows no transitions for Shipbuilder in under_review', () => {
    const state = { ...createWorkflowState(), currentStage: 'under_review' as const }
    const transitions = getAvailableTransitions(state, 'Shipbuilder')
    expect(transitions).toHaveLength(0)
  })

  it('shows Forward + Return for Contractor in under_review', () => {
    const state = { ...createWorkflowState(), currentStage: 'under_review' as const }
    const transitions = getAvailableTransitions(state, 'Contractor')
    expect(transitions.length).toBeGreaterThanOrEqual(2)
  })

  it('shows Accept + Reject + Return for Government in disposition', () => {
    const state = { ...createWorkflowState(), currentStage: 'disposition' as const }
    const transitions = getAvailableTransitions(state, 'Government')
    expect(transitions).toHaveLength(3)
  })
})

/* ─── executeTransition ──────────────────────────────────────── */

describe('executeTransition', () => {
  it('advances the state and records history', () => {
    const state = createWorkflowState()
    const transitions = getAvailableTransitions(state, 'Shipbuilder')
    const next = executeTransition(state, transitions[0], 'user@test.com', 'Shipbuilder', '', 'WF-001')
    expect(next.currentStage).toBe('submitted')
    expect(next.history).toHaveLength(1)
    expect(next.history[0].from).toBe('draft')
    expect(next.history[0].to).toBe('submitted')
    expect(next.history[0].performedBy).toBe('user@test.com')
  })

  it('preserves previous history entries', () => {
    let state = createWorkflowState()
    const t1 = getAvailableTransitions(state, 'Shipbuilder')
    state = executeTransition(state, t1[0], 'user@test.com', 'Shipbuilder')
    const t2 = getAvailableTransitions(state, 'Government')
    state = executeTransition(state, t2[0], 'pm@navy.mil', 'Government')
    expect(state.history).toHaveLength(2)
  })
})

/* ─── isTerminal ─────────────────────────────────────────────── */

describe('isTerminal', () => {
  it('returns false for non-terminal stages', () => {
    expect(isTerminal(createWorkflowState())).toBe(false)
  })

  it('returns true for accepted', () => {
    const state = { ...createWorkflowState(), currentStage: 'accepted' as const }
    expect(isTerminal(state)).toBe(true)
  })

  it('returns true for rejected', () => {
    const state = { ...createWorkflowState(), currentStage: 'rejected' as const }
    expect(isTerminal(state)).toBe(true)
  })
})

/* ─── SLA ────────────────────────────────────────────────────── */

describe('isSLABreached / getSLADaysRemaining', () => {
  it('returns false/null for stages with no SLA', () => {
    const state = createWorkflowState() // draft — no SLA
    expect(isSLABreached(state)).toBe(false)
    expect(getSLADaysRemaining(state)).toBeNull()
  })

  it('detects SLA breach when entered >30 days ago for under_review', () => {
    const past = new Date()
    past.setDate(past.getDate() - 35)
    const state = {
      ...createWorkflowState(),
      currentStage: 'under_review' as const,
      enteredStageAt: past.toISOString(),
    }
    expect(isSLABreached(state)).toBe(true)
    const remaining = getSLADaysRemaining(state)
    expect(remaining).not.toBeNull()
    expect(remaining!).toBeLessThan(0)
  })

  it('reports positive days remaining when within SLA', () => {
    const recent = new Date()
    recent.setDate(recent.getDate() - 5)
    const state = {
      ...createWorkflowState(),
      currentStage: 'under_review' as const,
      enteredStageAt: recent.toISOString(),
    }
    expect(isSLABreached(state)).toBe(false)
    expect(getSLADaysRemaining(state)!).toBeGreaterThan(0)
  })
})

/* ─── getWorkflowBadge ───────────────────────────────────────── */

describe('getWorkflowBadge', () => {
  it('shows COMPLETE for accepted terminal stage', () => {
    const state = { ...createWorkflowState(), currentStage: 'accepted' as const }
    const badge = getWorkflowBadge(makeRow(), state, 'Government')
    expect(badge.label).toBe('COMPLETE')
    expect(badge.color).toBe('green')
  })

  it('shows CLOSED for rejected terminal stage', () => {
    const state = { ...createWorkflowState(), currentStage: 'rejected' as const }
    const badge = getWorkflowBadge(makeRow(), state, 'Government')
    expect(badge.label).toBe('CLOSED')
    expect(badge.color).toBe('red')
  })

  it('shows ACTIVE when viewer is responsible and not overdue', () => {
    const state = { ...createWorkflowState(), currentStage: 'draft' as const }
    const badge = getWorkflowBadge(makeRow(), state, 'Shipbuilder')
    expect(badge.label).toBe('ACTIVE')
    expect(badge.color).toBe('blue')
  })
})

/* ─── getTimelineStages ──────────────────────────────────────── */

describe('getTimelineStages', () => {
  it('excludes negative-order stub stages', () => {
    const state = createWorkflowState('expedited')
    const stages = getTimelineStages(state)
    expect(stages.every(s => s.order >= 0)).toBe(true)
  })

  it('returns stages sorted by order', () => {
    const state = createWorkflowState()
    const stages = getTimelineStages(state)
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].order).toBeGreaterThanOrEqual(stages[i - 1].order)
    }
  })
})
