import { DRLRow, Organization } from '../types'

/* ═══════════════════════════════════════════════════════════════
   Configurable Workflow Engine
   ─────────────────────────────────────────────────────────────
   State machine per DRL item with:
   • Configurable templates (stages, transitions, SLA)
   • Role-gated transitions (who can advance / reject)
   • SLA timers with overdue detection
   • Transition history tracking
   ═══════════════════════════════════════════════════════════════ */

/* ─── Core Types ─────────────────────────────────────────────── */

export type WorkflowStageId =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'disposition'
  | 'revision_required'
  | 'resubmitted'
  | 'accepted'
  | 'rejected'

export interface WorkflowStageDef {
  id: WorkflowStageId
  label: string
  description: string
  responsible: Organization
  /** FontAwesome icon class representing this stage's function */
  icon: string
  /** SLA in calendar days from entering this stage */
  slaDays: number | null
  /** Fields that must be non-empty before leaving this stage */
  requiredFields?: (keyof DRLRow)[]
  /** Stage order for timeline display (0-based) */
  order: number
  /** If true, only shown in timeline when visited or current */
  conditionalDisplay?: boolean
}

export interface WorkflowTransition {
  from: WorkflowStageId
  to: WorkflowStageId
  action: string          // button label
  icon: string            // FontAwesome icon class
  /** Which orgs can trigger this transition */
  allowedOrgs: Organization[]
  /** Color theme for button */
  variant: 'primary' | 'success' | 'danger' | 'warning' | 'neutral'
  /** Whether a comment is required for this transition */
  requiresComment: boolean
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  stages: WorkflowStageDef[]
  transitions: WorkflowTransition[]
  /** Initial stage when a DRL row enters this workflow */
  initialStage: WorkflowStageId
  /** Stages that represent a terminal (completed/closed) state */
  terminalStages: WorkflowStageId[]
}

export interface WorkflowTransitionRecord {
  id: string
  rowId: string
  from: WorkflowStageId
  to: WorkflowStageId
  action: string
  performedBy: string       // user email or role
  performedByOrg: Organization
  timestamp: string         // ISO date
  comment: string
}

export interface WorkflowState {
  currentStage: WorkflowStageId
  templateId: string
  enteredStageAt: string    // ISO date when current stage was entered
  history: WorkflowTransitionRecord[]
}

/* ─── Template Registry ──────────────────────────────────────── */

const STANDARD_DRL_TEMPLATE: WorkflowTemplate = {
  id: 'standard-drl',
  name: 'Standard DRL Review',
  description: 'Default 5-stage workflow: Submit → Review → Disposition → Accept/Revise',
  initialStage: 'draft',
  terminalStages: ['accepted', 'rejected'],
  stages: [
    {
      id: 'draft',
      label: 'Draft / Preparation',
      description: 'Shipbuilder prepares and drafts the deliverable for submission',
      responsible: 'Shipbuilder',
      icon: 'fa-pen-to-square',
      slaDays: null,
      order: 0,
    },
    {
      id: 'submitted',
      label: 'Submitted',
      description: 'Deliverable has been submitted by the Shipbuilder for review',
      responsible: 'Shipbuilder',
      icon: 'fa-paper-plane',
      slaDays: null,
      requiredFields: ['actualSubmissionDate'],
      order: 1,
    },
    {
      id: 'under_review',
      label: 'Under Review',
      description: 'Contractor / SDM is reviewing the submitted deliverable',
      responsible: 'Contractor',
      icon: 'fa-magnifying-glass',
      slaDays: 30,
      order: 2,
    },
    {
      id: 'disposition',
      label: 'Final Disposition',
      description: 'Program Manager makes the final accept/reject decision',
      responsible: 'Government',
      icon: 'fa-gavel',
      slaDays: 14,
      order: 3,
    },
    {
      id: 'revision_required',
      label: 'Revision Required',
      description: 'Deliverable returned to Shipbuilder for corrections and resubmission',
      responsible: 'Shipbuilder',
      icon: 'fa-rotate-left',
      slaDays: 21,
      order: 4,
      conditionalDisplay: true,
    },
    {
      id: 'resubmitted',
      label: 'Resubmitted',
      description: 'Revised deliverable resubmitted for re-review',
      responsible: 'Shipbuilder',
      icon: 'fa-paper-plane',
      slaDays: null,
      order: 5,
      conditionalDisplay: true,
    },
    {
      id: 'accepted',
      label: 'Accepted',
      description: 'Deliverable accepted — no further action required',
      responsible: 'Government',
      icon: 'fa-circle-check',
      slaDays: null,
      order: 6,
    },
    {
      id: 'rejected',
      label: 'Rejected',
      description: 'Deliverable rejected — contract action may be required',
      responsible: 'Government',
      icon: 'fa-circle-xmark',
      slaDays: null,
      order: 7,
    },
  ],
  transitions: [
    {
      from: 'draft',
      to: 'submitted',
      action: 'Submit Deliverable',
      icon: 'fa-paper-plane',
      allowedOrgs: ['Shipbuilder'],
      variant: 'primary',
      requiresComment: false,
    },
    {
      from: 'submitted',
      to: 'under_review',
      action: 'Begin Review',
      icon: 'fa-search',
      allowedOrgs: ['Contractor', 'Government'],
      variant: 'primary',
      requiresComment: false,
    },
    {
      from: 'under_review',
      to: 'disposition',
      action: 'Forward to PM',
      icon: 'fa-arrow-right',
      allowedOrgs: ['Contractor', 'Government'],
      variant: 'primary',
      requiresComment: true,
    },
    {
      from: 'under_review',
      to: 'revision_required',
      action: 'Return for Revision',
      icon: 'fa-undo',
      allowedOrgs: ['Contractor', 'Government'],
      variant: 'warning',
      requiresComment: true,
    },
    {
      from: 'disposition',
      to: 'accepted',
      action: 'Accept Deliverable',
      icon: 'fa-check',
      allowedOrgs: ['Government'],
      variant: 'success',
      requiresComment: false,
    },
    {
      from: 'disposition',
      to: 'revision_required',
      action: 'Return for Revision',
      icon: 'fa-undo',
      allowedOrgs: ['Government'],
      variant: 'warning',
      requiresComment: true,
    },
    {
      from: 'disposition',
      to: 'rejected',
      action: 'Reject Deliverable',
      icon: 'fa-times',
      allowedOrgs: ['Government'],
      variant: 'danger',
      requiresComment: true,
    },
    {
      from: 'revision_required',
      to: 'resubmitted',
      action: 'Resubmit Deliverable',
      icon: 'fa-paper-plane',
      allowedOrgs: ['Shipbuilder'],
      variant: 'primary',
      requiresComment: true,
    },
    {
      from: 'resubmitted',
      to: 'under_review',
      action: 'Begin Re-Review',
      icon: 'fa-search',
      allowedOrgs: ['Contractor', 'Government'],
      variant: 'primary',
      requiresComment: false,
    },
  ],
}

const EXPEDITED_TEMPLATE: WorkflowTemplate = {
  id: 'expedited',
  name: 'Expedited Review',
  description: 'Simplified 3-stage workflow for low-risk or time-critical deliverables',
  initialStage: 'draft',
  terminalStages: ['accepted', 'rejected'],
  stages: [
    {
      id: 'draft',
      label: 'Draft / Preparation',
      description: 'Shipbuilder prepares deliverable',
      responsible: 'Shipbuilder',
      icon: 'fa-pen-to-square',
      slaDays: null,
      order: 0,
    },
    {
      id: 'submitted',
      label: 'Submitted for Approval',
      description: 'Deliverable submitted directly to Government for approval',
      responsible: 'Shipbuilder',
      icon: 'fa-paper-plane',
      slaDays: null,
      order: 1,
    },
    {
      id: 'disposition',
      label: 'Government Review',
      description: 'Government reviews and makes final disposition',
      responsible: 'Government',
      icon: 'fa-gavel',
      slaDays: 7,
      order: 2,
    },
    {
      id: 'accepted',
      label: 'Accepted',
      description: 'Deliverable accepted',
      responsible: 'Government',
      icon: 'fa-circle-check',
      slaDays: null,
      order: 3,
    },
    {
      id: 'rejected',
      label: 'Rejected',
      description: 'Deliverable rejected',
      responsible: 'Government',
      icon: 'fa-circle-xmark',
      slaDays: null,
      order: 4,
    },
    // Provide stubs for all WorkflowStageId values so TS is happy
    {
      id: 'under_review',
      label: 'Under Review',
      description: 'N/A for expedited',
      responsible: 'Contractor',
      icon: 'fa-magnifying-glass',
      slaDays: null,
      order: -1,
    },
    {
      id: 'revision_required',
      label: 'Revision Required',
      description: 'N/A for expedited',
      responsible: 'Shipbuilder',
      icon: 'fa-rotate-left',
      slaDays: null,
      order: -1,
    },
    {
      id: 'resubmitted',
      label: 'Resubmitted',
      description: 'N/A for expedited',
      responsible: 'Shipbuilder',
      icon: 'fa-paper-plane',
      slaDays: null,
      order: -1,
    },
  ],
  transitions: [
    {
      from: 'draft',
      to: 'submitted',
      action: 'Submit Deliverable',
      icon: 'fa-paper-plane',
      allowedOrgs: ['Shipbuilder'],
      variant: 'primary',
      requiresComment: false,
    },
    {
      from: 'submitted',
      to: 'disposition',
      action: 'Begin Review',
      icon: 'fa-search',
      allowedOrgs: ['Government'],
      variant: 'primary',
      requiresComment: false,
    },
    {
      from: 'disposition',
      to: 'accepted',
      action: 'Accept',
      icon: 'fa-check',
      allowedOrgs: ['Government'],
      variant: 'success',
      requiresComment: false,
    },
    {
      from: 'disposition',
      to: 'rejected',
      action: 'Reject',
      icon: 'fa-times',
      allowedOrgs: ['Government'],
      variant: 'danger',
      requiresComment: true,
    },
  ],
}

/** All available workflow templates */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  STANDARD_DRL_TEMPLATE,
  EXPEDITED_TEMPLATE,
]

/* ─── Engine Functions ───────────────────────────────────────── */

export function getTemplate(templateId: string): WorkflowTemplate {
  return WORKFLOW_TEMPLATES.find(t => t.id === templateId) || STANDARD_DRL_TEMPLATE
}

/** Create initial workflow state for a DRL row */
export function createWorkflowState(templateId: string = 'standard-drl'): WorkflowState {
  const template = getTemplate(templateId)
  return {
    currentStage: template.initialStage,
    templateId,
    enteredStageAt: new Date().toISOString(),
    history: [],
  }
}

/** Infer workflow state from existing DRLRow fields (for backward compat with existing data) */
export function inferWorkflowState(row: DRLRow): WorkflowState {
  const templateId = 'standard-drl'
  let stage: WorkflowStageId = 'draft'

  const submitted = !!row.actualSubmissionDate && row.actualSubmissionDate !== '—' && row.actualSubmissionDate !== ''
  const received = row.received === 'Yes'
  const reviewed = received && row.calendarDaysToReview !== null

  if (row.status === 'green' && received) {
    stage = 'accepted'
  } else if (row.status === 'green' && submitted) {
    stage = 'disposition'  // submitted and green but not marked received yet
  } else if (row.status === 'red' && reviewed) {
    stage = 'disposition'  // overdue, reviewed, awaiting final decision
  } else if (row.status === 'red' && submitted) {
    stage = 'under_review'  // overdue and submitted — still under review
  } else if (row.status === 'red' && !submitted) {
    stage = 'draft'  // overdue but never submitted
  } else if (row.status === 'yellow' && reviewed) {
    stage = 'revision_required'  // comments/RIDs → needs Shipbuilder action
  } else if (row.status === 'yellow' && submitted) {
    stage = 'under_review'
  } else if (row.status === 'pending' && submitted && received) {
    stage = 'under_review'  // submitted, received, pending Gov't review
  } else if (row.status === 'pending' && submitted) {
    stage = 'submitted'  // pending = awaiting review start
  } else if (submitted) {
    stage = 'submitted'
  }

  // Determine the most accurate enteredStageAt:
  // 1. Submitted items → use submission date
  // 2. Not-yet-submitted → use calculatedDueDate or contractDueFinish (for SLA tracking)
  let enteredStageAt = new Date().toISOString()
  if (submitted) {
    const parsed = new Date(row.actualSubmissionDate)
    if (!isNaN(parsed.getTime())) {
      enteredStageAt = parsed.toISOString()
    }
  } else {
    // For items still in draft, use the due date so SLA timer reflects reality
    const dueStr = row.calculatedDueDate || row.contractDueFinish
    if (dueStr) {
      const parsed = new Date(dueStr)
      if (!isNaN(parsed.getTime())) {
        enteredStageAt = parsed.toISOString()
      }
    }
  }

  return {
    currentStage: stage,
    templateId,
    enteredStageAt,
    history: [],
  }
}

/** Check if a DRL item is contractually overdue (due date has passed and not yet accepted/rejected) */
export function isContractOverdue(row: DRLRow): boolean {
  const dueStr = row.calculatedDueDate || row.contractDueFinish
  if (!dueStr) return false
  const due = new Date(dueStr)
  if (isNaN(due.getTime())) return false
  return due.getTime() < Date.now()
}

/** Get the number of calendar days overdue (positive = overdue, negative = days remaining) */
export function getContractOverdueDays(row: DRLRow): number | null {
  const dueStr = row.calculatedDueDate || row.contractDueFinish
  if (!dueStr) return null
  const due = new Date(dueStr)
  if (isNaN(due.getTime())) return null
  return Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get the appropriate status badge for the workflow popup, relative to the viewing org.
 * Returns { label, color } for the badge.
 *
 * Rules:
 * - Terminal stages → COMPLETE / CLOSED (no org-specific logic)
 * - If contract due date passed AND viewer's org is the stage's responsible → OVERDUE (red)
 * - If contract due date passed AND viewer's org is NOT responsible → AWAITING [responsible] (amber)
 * - If not overdue, stage is active for the responsible org → ACTIVE / PENDING
 */
export function getWorkflowBadge(
  row: DRLRow,
  state: WorkflowState,
  viewerOrg: Organization,
): { label: string; color: 'green' | 'red' | 'amber' | 'blue' | 'gray' } {
  const template = getTemplate(state.templateId)

  // Terminal stages
  if (template.terminalStages.includes(state.currentStage)) {
    return state.currentStage === 'accepted'
      ? { label: 'COMPLETE', color: 'green' }
      : { label: 'CLOSED', color: 'red' }
  }

  const currentStageDef = template.stages.find(s => s.id === state.currentStage)
  const responsibleOrg = currentStageDef?.responsible || 'Government'
  const overdue = isContractOverdue(row)
  const overdueDays = getContractOverdueDays(row)

  if (overdue && overdueDays !== null) {
    if (viewerOrg === responsibleOrg) {
      // Viewer's org is responsible and it's overdue → they need to act
      return { label: `OVERDUE ${overdueDays}d`, color: 'red' }
    }
    // Viewer's org is NOT responsible — show who they're waiting on
    return { label: `AWAITING ${responsibleOrg.toUpperCase()}`, color: 'amber' }
  }

  // Not overdue — check if viewer's org is the responsible party
  if (viewerOrg === responsibleOrg) {
    return { label: 'ACTIVE', color: 'blue' }
  }
  return { label: `PENDING — ${responsibleOrg}`, color: 'gray' }
}

/** Get available transitions for current state + user's org */
export function getAvailableTransitions(
  state: WorkflowState,
  userOrg: Organization,
): WorkflowTransition[] {
  const template = getTemplate(state.templateId)
  return template.transitions.filter(
    t => t.from === state.currentStage && t.allowedOrgs.includes(userOrg)
  )
}

/** Execute a transition, returning the updated workflow state */
export function executeTransition(
  state: WorkflowState,
  transition: WorkflowTransition,
  performedBy: string,
  performedByOrg: Organization,
  comment: string = '',
  rowId: string = '',
): WorkflowState {
  const record: WorkflowTransitionRecord = {
    id: `WFT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    rowId,
    from: transition.from,
    to: transition.to,
    action: transition.action,
    performedBy,
    performedByOrg,
    timestamp: new Date().toISOString(),
    comment,
  }

  return {
    ...state,
    currentStage: transition.to,
    enteredStageAt: record.timestamp,
    history: [...state.history, record],
  }
}

/** Check if stage SLA is breached */
export function isSLABreached(state: WorkflowState): boolean {
  const template = getTemplate(state.templateId)
  const stageDef = template.stages.find(s => s.id === state.currentStage)
  if (!stageDef?.slaDays) return false

  const entered = new Date(state.enteredStageAt)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24))
  return daysDiff > stageDef.slaDays
}

/** Get days remaining for SLA (negative = overdue) */
export function getSLADaysRemaining(state: WorkflowState): number | null {
  const template = getTemplate(state.templateId)
  const stageDef = template.stages.find(s => s.id === state.currentStage)
  if (!stageDef?.slaDays) return null

  const entered = new Date(state.enteredStageAt)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24))
  return stageDef.slaDays - daysDiff
}

/** Check if workflow is in a terminal (completed) stage */
export function isTerminal(state: WorkflowState): boolean {
  const template = getTemplate(state.templateId)
  return template.terminalStages.includes(state.currentStage)
}

/** Get the active (visible) stages for timeline display, sorted by order */
export function getTimelineStages(state: WorkflowState): WorkflowStageDef[] {
  const template = getTemplate(state.templateId)

  // Determine which terminal stage to show (only the actual outcome, not both)
  const isInTerminal = template.terminalStages.includes(state.currentStage)

  return template.stages
    .filter(s => {
      // Remove stubs with order < 0
      if (s.order < 0) return false

      // Terminal stages: only show the one that matches the outcome (or both if not yet terminal)
      if (template.terminalStages.includes(s.id)) {
        if (isInTerminal) {
          return s.id === state.currentStage  // only show the actual outcome
        }
        // Not terminal yet — show accepted as the "target" stage, hide rejected
        return s.id === 'accepted'
      }

      // Conditional stages (revision_required, resubmitted): only show if visited or current
      if (s.conditionalDisplay) {
        if (s.id === state.currentStage) return true
        return state.history.some(h => h.to === s.id || h.from === s.id)
      }

      return true
    })
    .sort((a, b) => a.order - b.order)
}

/** Get stage definition by ID */
export function getStageDef(state: WorkflowState, stageId: WorkflowStageId): WorkflowStageDef | undefined {
  const template = getTemplate(state.templateId)
  return template.stages.find(s => s.id === stageId)
}

/** Determine display status of a stage relative to current state */
export function getStageDisplayStatus(
  state: WorkflowState,
  stageDef: WorkflowStageDef,
): 'completed' | 'current' | 'upcoming' | 'skipped' {
  const template = getTemplate(state.templateId)
  const currentDef = template.stages.find(s => s.id === state.currentStage)
  if (!currentDef) return 'upcoming'

  // Current stage
  if (stageDef.id === state.currentStage) return 'current'

  // Check if this stage was ever transitioned INTO
  const wasVisited = state.history.some(h => h.to === stageDef.id)

  // Terminal states — everything before the terminal is completed or skipped
  if (template.terminalStages.includes(state.currentStage)) {
    if (wasVisited) return 'completed'
    // Stages before current order that weren't visited are skipped
    if (stageDef.order < currentDef.order) return 'skipped'
    return 'skipped'
  }

  // For revision loop stages: if the item is past review/disposition and
  // this is a revision/resubmitted stage, check if it's actually been used
  if (stageDef.conditionalDisplay) {
    if (wasVisited && stageDef.order < currentDef.order) return 'completed'
    if (wasVisited) return 'completed'  // was visited but now past it in a loop
    return 'upcoming'
  }

  // Standard forward progression
  if (wasVisited) return 'completed'
  if (stageDef.order < currentDef.order) return 'completed'
  return 'upcoming'
}
