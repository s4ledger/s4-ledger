import { DRLRow } from '../types'

/* ─── RACI party for each DRL ────────────────────────────────── */

export type RACIParty = 'Shipbuilder' | 'SDM' | 'Contractor' | 'Lead Reviewer' | 'Program Manager'

const DI_RACI: Record<string, RACIParty> = {
  'DI-MGMT-81024A': 'Shipbuilder',
  'DI-TMSS-80301C': 'Contractor',
  'DI-ILSS-81495':  'Contractor',
  'DI-MGMT-81650':  'Lead Reviewer',
  'DI-MISC-80711B':  'SDM',
  'DI-CMAN-81288D':  'Shipbuilder',
  'DI-SESS-81521':   'Shipbuilder',
  'DI-ILSS-80085A':  'Lead Reviewer',
  'DI-MGMT-81334A':  'SDM',
  'DI-QCIC-80123':   'Contractor',
  'DI-MGMT-80368A':  'Lead Reviewer',
  'DI-MISC-80508A':  'Program Manager',
}

export function getRACIParty(row: DRLRow): RACIParty {
  return DI_RACI[row.diNumber] || (row.status === 'red' ? 'Program Manager' : 'Shipbuilder')
}

export function getRACIColor(party: RACIParty): string {
  switch (party) {
    case 'Shipbuilder':     return 'bg-blue-500/12 text-blue-600 border-blue-500/20'
    case 'SDM':             return 'bg-purple-500/12 text-purple-600 border-purple-500/20'
    case 'Contractor':      return 'bg-teal-500/12 text-teal-600 border-teal-500/20'
    case 'Lead Reviewer':   return 'bg-orange-500/12 text-orange-600 border-orange-500/20'
    case 'Program Manager': return 'bg-gray-500/12 text-gray-600 border-gray-500/20'
  }
}

/* ─── Workflow stage model ───────────────────────────────────── */

export type StageStatus = 'Completed' | 'In Progress' | 'Pending' | 'Overdue'

export interface WorkflowStage {
  label: string
  responsible: string
  status: StageStatus
  date: string | null
  comments: string
}

export function getWorkflowStages(row: DRLRow): WorkflowStage[] {
  const submitted = !!row.actualSubmissionDate && row.actualSubmissionDate !== '—'
  const received = row.received === 'Yes'
  const isOverdue = row.status === 'red'
  const isReview = row.status === 'yellow'

  const today = new Date().toISOString().slice(0, 10)

  // Stage 1: Shipbuilder Submission
  const stage1: WorkflowStage = {
    label: 'Shipbuilder Submission',
    responsible: 'Shipbuilder',
    status: submitted ? 'Completed' : (isOverdue ? 'Overdue' : 'In Progress'),
    date: submitted ? row.actualSubmissionDate : null,
    comments: submitted
      ? `Submitted${row.actualSubmissionDate > row.contractDueFinish ? ' (late — past contract due)' : ' on time'}`
      : (isOverdue ? `Past due — contract required by ${row.contractDueFinish}` : `Due by ${row.contractDueFinish}`),
  }

  // Stage 2: Reviewer (Contractor / SDM)
  const reviewDone = received && row.calendarDaysToReview !== null
  const stage2: WorkflowStage = {
    label: 'Reviewer (Contractor / SDM)',
    responsible: getRACIParty(row) === 'SDM' ? 'SDM' : 'Contractor',
    status: !submitted ? 'Pending' : (reviewDone ? 'Completed' : (isOverdue ? 'Overdue' : 'In Progress')),
    date: reviewDone ? today : null,
    comments: !submitted
      ? 'Awaiting shipbuilder submission'
      : (reviewDone
        ? `Reviewed in ${row.calendarDaysToReview} calendar days`
        : (isReview ? 'Under active review' : 'Review pending')),
  }

  // Stage 3: Final Disposition (Program Manager)
  const completed = row.status === 'green' && received
  const stage3: WorkflowStage = {
    label: 'Final Disposition (PM)',
    responsible: 'Program Manager',
    status: !reviewDone ? 'Pending' : (completed ? 'Completed' : 'In Progress'),
    date: completed ? today : null,
    comments: completed
      ? 'Completed — no further action required'
      : (!reviewDone ? 'Awaiting review completion' : 'Disposition pending PM decision'),
  }

  // Stage 4: Return to Shipbuilder
  const stage4: WorkflowStage = {
    label: 'Return to Shipbuilder',
    responsible: 'Shipbuilder',
    status: completed ? 'Completed' : (isOverdue ? 'Overdue' : 'Pending'),
    date: completed ? today : null,
    comments: completed
      ? 'Completed — deliverable accepted'
      : (isOverdue
        ? 'Corrective action required — resubmittal needed'
        : (isReview ? 'May require comments incorporation' : 'Awaiting workflow completion')),
  }

  return [stage1, stage2, stage3, stage4]
}
