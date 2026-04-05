import { useState } from 'react'
import DraggableModal from './DraggableModal'
import { DRLRow, AnchorRecord, UserRole, Organization } from '../types'
import { getRACIParty } from '../utils/raciWorkflow'
import { AIRowInsight } from '../utils/aiAnalysis'
import {
  WorkflowState,
  WorkflowTransition,
  WorkflowStageDef,
  inferWorkflowState,
  getAvailableTransitions,
  executeTransition,
  getTimelineStages,
  getStageDisplayStatus,
  getSLADaysRemaining,
  isSLABreached,
  isTerminal,
  isContractOverdue,
  getContractOverdueDays,
  getWorkflowBadge,
  getTemplate,
  WORKFLOW_TEMPLATES,
} from '../utils/workflowEngine'
import { getDefaultOrg } from '../utils/permissions'

interface Props {
  row: DRLRow
  anchors: Record<string, AnchorRecord>
  role: UserRole
  aiInsight?: AIRowInsight
  onUpdateNotes: (rowId: string, notes: string) => void
  onSendEmail: (row: DRLRow) => void
  onWorkflowTransition?: (rowId: string, updatedState: WorkflowState) => void
  onClose: () => void
}

/* ─── Stage display helpers ──────────────────────────────────── */

type StageDisplayStatus = 'completed' | 'current' | 'upcoming' | 'skipped' | 'accepted' | 'rejected'

/** Colors for the stage circle based on status */
function stageDisplayColor(status: StageDisplayStatus, slaBreach: boolean) {
  if (status === 'accepted') return { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-600', ring: 'ring-4 ring-green-500/30' }
  if (status === 'rejected') return { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-600', ring: 'ring-4 ring-red-500/30' }
  if (status === 'completed') return { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-600', ring: '' }
  if (status === 'current' && slaBreach) return { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-600', ring: 'ring-4 ring-red-500/20' }
  if (status === 'current') return { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-600', ring: 'ring-4 ring-blue-500/20' }
  if (status === 'skipped') return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-300', ring: '' }
  // upcoming
  return { bg: 'bg-white', border: 'border-gray-300', text: 'text-gray-400', ring: '' }
}

/** Simple status-based icon for each stage */
function stageIcon(status: StageDisplayStatus, slaBreach: boolean): string {
  if (status === 'accepted') return 'fas fa-circle-check'
  if (status === 'rejected') return 'fas fa-circle-xmark'
  if (status === 'completed') return 'fas fa-check'
  if (status === 'current' && slaBreach) return 'fas fa-triangle-exclamation'
  if (status === 'current') return 'fas fa-spinner fa-pulse'
  if (status === 'skipped') return 'fas fa-minus'
  // upcoming
  return 'far fa-circle'
}

function transitionButtonClasses(variant: WorkflowTransition['variant']): string {
  switch (variant) {
    case 'success': return 'bg-emerald-600 hover:bg-emerald-700 text-white'
    case 'danger':  return 'bg-red-600 hover:bg-red-700 text-white'
    case 'warning': return 'bg-amber-500 hover:bg-amber-600 text-white'
    case 'primary': return 'bg-blue-600 hover:bg-blue-700 text-white'
    default:        return 'bg-gray-200 hover:bg-gray-300 text-gray-800'
  }
}

/* ─── Main Component ─────────────────────────────────────────── */

export default function WorkflowProgressPopup({
  row,
  anchors,
  role,
  aiInsight,
  onUpdateNotes,
  onSendEmail,
  onWorkflowTransition,
  onClose,
}: Props) {
  // Use persisted workflow state or infer from row fields
  const [workflowState, setWorkflowState] = useState<WorkflowState>(
    () => row.workflowState || inferWorkflowState(row)
  )
  const [transitionComment, setTransitionComment] = useState('')
  const [showCommentFor, setShowCommentFor] = useState<string | null>(null) // transition action name
  const [editingNotes, setEditingNotes] = useState(false)
  const [localNotes, setLocalNotes] = useState(row.notes)

  const raciParty = getRACIParty(row)
  const isSealed = !!anchors[row.id]
  const org = getDefaultOrg(role) as Organization
  const template = getTemplate(workflowState.templateId)
  const timelineStages = getTimelineStages(workflowState)
  const availableTransitions = getAvailableTransitions(workflowState, org)
  const slaBreach = isSLABreached(workflowState)
  const slaDaysLeft = getSLADaysRemaining(workflowState)
  const terminal = isTerminal(workflowState)
  const currentStageDef = template.stages.find(s => s.id === workflowState.currentStage)
  const contractOverdue = isContractOverdue(row)
  const overdueDays = getContractOverdueDays(row)
  const badge = getWorkflowBadge(row, workflowState, org)

  function handleTransition(transition: WorkflowTransition) {
    if (transition.requiresComment && !transitionComment.trim()) {
      setShowCommentFor(transition.action)
      return
    }

    const userEmail = `${role.toLowerCase().replace(/\s+/g, '.')}@s4ledger.mil`
    const newState = executeTransition(
      workflowState,
      transition,
      userEmail,
      org,
      transitionComment.trim(),
      row.id,
    )

    setWorkflowState(newState)
    setTransitionComment('')
    setShowCommentFor(null)

    if (onWorkflowTransition) {
      onWorkflowTransition(row.id, newState)
    }
  }

  function handleSaveNotes() {
    onUpdateNotes(row.id, localNotes)
    setEditingNotes(false)
  }

  return (
    <DraggableModal className="bg-white border border-border rounded-card shadow-2xl" defaultWidth={1000}>
      <div className="max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              terminal && workflowState.currentStage === 'accepted' ? 'bg-green-500/15' :
              terminal && workflowState.currentStage === 'rejected' ? 'bg-red-500/15' :
              contractOverdue || slaBreach ? 'bg-red-500/15' : 'bg-blue-500/15'
            }`}>
              <i className={`fas fa-project-diagram ${
                terminal && workflowState.currentStage === 'accepted' ? 'text-green-500' :
                terminal && workflowState.currentStage === 'rejected' ? 'text-red-500' :
                contractOverdue || slaBreach ? 'text-red-500' : 'text-blue-500'
              }`}></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Workflow — {row.diNumber}</h2>
              <p className="text-xs text-gray-500">{row.id} · {row.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSealed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase rounded-md">
                <i className="fas fa-check-circle text-[9px]"></i> Verified
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase rounded-md">
              <i className="fas fa-user-tag text-[9px]"></i> {raciParty}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 text-purple-600 text-[10px] font-bold uppercase rounded-md" title={template.description}>
              <i className="fas fa-stream text-[9px]"></i> {template.name}
            </span>
            <button onClick={onClose} className="ml-2 w-8 h-8 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ─── Current Stage Banner ─── */}
          <div className={`rounded-lg border p-4 flex items-center justify-between ${
            terminal && workflowState.currentStage === 'accepted' ? 'bg-green-50 border-green-200' :
            terminal && workflowState.currentStage === 'rejected' ? 'bg-red-50 border-red-200' :
            badge.color === 'red' ? 'bg-red-50 border-red-200' :
            badge.color === 'amber' ? 'bg-amber-50 border-amber-200' :
            slaBreach ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${
                  terminal && workflowState.currentStage === 'accepted' ? 'text-green-700' :
                  terminal && workflowState.currentStage === 'rejected' ? 'text-red-700' :
                  badge.color === 'red' ? 'text-red-700' :
                  badge.color === 'amber' ? 'text-amber-700' :
                  slaBreach ? 'text-red-700' : 'text-blue-700'
                }`}>
                  {currentStageDef?.label || workflowState.currentStage}
                </span>
                {/* Role-relative status badge */}
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                  badge.color === 'green' ? 'bg-green-200 text-green-800' :
                  badge.color === 'red' ? 'bg-red-200 text-red-800' :
                  badge.color === 'amber' ? 'bg-amber-200 text-amber-800' :
                  badge.color === 'gray' ? 'bg-gray-200 text-gray-700' :
                  'bg-blue-200 text-blue-800'
                }`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{currentStageDef?.description}</p>
              <p className="text-[10px] text-gray-400 mt-1">
                Responsible: <span className="font-medium text-gray-600">{currentStageDef?.responsible}</span>
                {contractOverdue && overdueDays !== null && !terminal && (
                  <span className="ml-3 font-medium text-red-500">
                    Contract overdue by {overdueDays} day{overdueDays !== 1 ? 's' : ''}
                  </span>
                )}
                {!contractOverdue && slaDaysLeft !== null && (
                  <span className={`ml-3 font-medium ${slaDaysLeft < 0 ? 'text-red-500' : slaDaysLeft <= 3 ? 'text-amber-500' : 'text-gray-500'}`}>
                    {slaDaysLeft < 0
                      ? `SLA breached by ${Math.abs(slaDaysLeft)} day${Math.abs(slaDaysLeft) !== 1 ? 's' : ''}`
                      : `${slaDaysLeft} day${slaDaysLeft !== 1 ? 's' : ''} remaining in SLA`}
                  </span>
                )}
              </p>
            </div>
            {!terminal && availableTransitions.length > 0 && (
              <div className="flex items-center gap-2 ml-4">
                {availableTransitions.map(t => (
                  <button
                    key={t.action}
                    onClick={() => handleTransition(t)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm ${transitionButtonClasses(t.variant)}`}
                  >
                    <i className={`fas ${t.icon} text-[10px]`}></i>
                    {t.action}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Transition comment box ─── */}
          {showCommentFor && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-medium text-amber-800 mb-2">
                <i className="fas fa-comment-alt mr-1"></i>
                A comment is required for "{showCommentFor}"
              </p>
              <textarea
                value={transitionComment}
                onChange={e => setTransitionComment(e.target.value)}
                rows={2}
                placeholder="Enter reason or comments..."
                className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 resize-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => { setShowCommentFor(null); setTransitionComment('') }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const t = availableTransitions.find(tr => tr.action === showCommentFor)
                    if (t && transitionComment.trim()) handleTransition(t)
                  }}
                  disabled={!transitionComment.trim()}
                  className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-all"
                >
                  Confirm & Proceed
                </button>
              </div>
            </div>
          )}

          {/* ─── Workflow Timeline ─── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Workflow Timeline</h3>
            <div className="flex items-start gap-0">
              {timelineStages.map((stageDef, i) => {
                const rawStatus = getStageDisplayStatus(workflowState, stageDef)
                // Resolve terminal stages to accepted/rejected for proper icons
                let displayStatus: StageDisplayStatus = rawStatus
                if (rawStatus === 'current' && terminal) {
                  displayStatus = workflowState.currentStage === 'rejected' ? 'rejected' : 'accepted'
                }
                const isCurrent = rawStatus === 'current'
                const c = stageDisplayColor(displayStatus, isCurrent && slaBreach)
                const iconClass = stageIcon(displayStatus, isCurrent && slaBreach)
                const isLast = i === timelineStages.length - 1

                return (
                  <div key={stageDef.id} className="flex-1 relative">
                    {/* Connector line */}
                    {!isLast && (
                      <div className={`absolute top-4 left-[calc(50%+16px)] right-0 h-0.5 ${
                        displayStatus === 'completed' || displayStatus === 'accepted' ? 'bg-green-400'
                          : displayStatus === 'rejected' ? 'bg-red-300' : 'bg-gray-200'
                      }`} />
                    )}
                    <div className="flex flex-col items-center text-center">
                      {/* Stage circle */}
                      <div className={`w-8 h-8 rounded-full ${c.bg} border-2 ${c.border} flex items-center justify-center z-10 relative ${c.ring}`}>
                        <i className={`${iconClass} text-xs ${c.text}`}></i>
                      </div>
                      {/* Label */}
                      <p className={`text-[11px] font-semibold mt-2 leading-tight px-1 ${
                        displayStatus === 'skipped' ? 'text-gray-300' : 'text-gray-900'
                      }`}>{stageDef.label}</p>
                      {/* Responsible */}
                      <p className="text-[10px] text-gray-400 mt-0.5">{stageDef.responsible}</p>
                      {/* Status badge */}
                      {displayStatus !== 'upcoming' && displayStatus !== 'skipped' && (
                        <span className={`mt-1.5 px-2 py-0.5 text-[9px] font-bold uppercase rounded ${c.bg} ${c.text} border ${c.border}`}>
                          {isCurrent && slaBreach ? 'SLA BREACH'
                            : displayStatus === 'accepted' ? 'Accepted'
                            : displayStatus === 'rejected' ? 'Rejected'
                            : displayStatus === 'completed' ? 'Done' : 'Active'}
                        </span>
                      )}
                      {/* SLA indicator for current stage */}
                      {isCurrent && slaDaysLeft !== null && !slaBreach && !terminal && (
                        <p className="text-[10px] text-amber-500 mt-1 font-medium">{slaDaysLeft}d left</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ─── Key Dates ─── */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Contract Due</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{row.contractDueFinish}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Calculated Due</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{row.calculatedDueDate}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Actual Submission</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{row.actualSubmissionDate || '—'}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Review Days</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{row.calendarDaysToReview ?? '—'}</p>
            </div>
          </div>

          {/* ─── Transition History ─── */}
          {workflowState.history.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Transition History</h3>
              <div className="space-y-2">
                {[...workflowState.history].reverse().map((record, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fas fa-arrow-right text-blue-500 text-[9px]"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800">
                        <span className="font-semibold">{record.action}</span>
                        <span className="text-gray-400"> · {record.performedByOrg} · {record.performedBy}</span>
                      </p>
                      {record.comment && (
                        <p className="text-[11px] text-gray-600 mt-0.5 italic">"{record.comment}"</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── AI Remarks & Notes ─── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Remarks & Notes</h3>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <i className="fas fa-edit mr-0.5"></i> Edit
                </button>
              )}
            </div>

            {aiInsight && (
              <div className="space-y-2 mb-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                  <p className="text-xs text-gray-700 leading-relaxed">{aiInsight.statusExplanation}</p>
                </div>
                {aiInsight.nextActions.length > 0 && (
                  <div className="space-y-1">
                    {aiInsight.nextActions.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <i className="fas fa-arrow-right text-blue-500 text-[9px] mt-1"></i>
                        <div className="flex-1">
                          <p className="text-xs text-gray-800">{a.action}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Due: {a.dueDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {editingNotes ? (
              <div>
                <textarea
                  value={localNotes}
                  onChange={e => setLocalNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 leading-relaxed focus:outline-none focus:border-blue-400 resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => { setLocalNotes(row.notes); setEditingNotes(false) }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveNotes} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-all">
                    Save Notes
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-600 leading-relaxed">
                {row.notes || 'No remarks available.'}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3.5 border-t border-border flex items-center justify-between flex-shrink-0 bg-gray-50/50">
          <p className="text-[10px] text-gray-400">
            <i className="fas fa-shield-alt mr-1"></i>
            All data verified to Ledger — immutable trust layer active
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-black/[0.03] hover:bg-black/[0.06] border border-gray-200 rounded-lg text-sm text-gray-500 transition-all"
            >
              Close
            </button>
            <button
              onClick={() => onSendEmail(row)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all"
            >
              <i className="fas fa-envelope"></i>
              Send Update
            </button>
          </div>
        </div>
      </div>
    </DraggableModal>
  )
}
