import { useState } from 'react'
import DraggableModal from './DraggableModal'
import { DRLRow, AnchorRecord, UserRole } from '../types'
import { getWorkflowStages, getRACIParty, StageStatus, WorkflowStage } from '../utils/raciWorkflow'
import { AIRowInsight } from '../utils/aiAnalysis'

interface Props {
  row: DRLRow
  anchors: Record<string, AnchorRecord>
  role: UserRole
  aiInsight?: AIRowInsight
  onUpdateNotes: (rowId: string, notes: string) => void
  onSendEmail: (row: DRLRow) => void
  onClose: () => void
}

function stageIcon(status: StageStatus): string {
  switch (status) {
    case 'Completed':  return 'fa-check-circle'
    case 'In Progress': return 'fa-spinner'
    case 'Pending':    return 'fa-clock'
    case 'Overdue':    return 'fa-exclamation-triangle'
  }
}

function stageColor(status: StageStatus): { dot: string; text: string; bg: string; border: string } {
  switch (status) {
    case 'Completed':  return { dot: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
    case 'In Progress': return { dot: 'bg-accent', text: 'text-accent', bg: 'bg-accent/5', border: 'border-accent/20' }
    case 'Pending':    return { dot: 'bg-gray-300', text: 'text-steel', bg: 'bg-gray-50', border: 'border-gray-200' }
    case 'Overdue':    return { dot: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' }
  }
}

function lineColor(stage: WorkflowStage, next: WorkflowStage | undefined): string {
  if (stage.status === 'Completed' && next && next.status !== 'Pending') return 'bg-green-400'
  if (stage.status === 'Completed') return 'bg-green-300'
  return 'bg-gray-200'
}

export default function WorkflowProgressPopup({
  row,
  anchors,
  role,
  aiInsight,
  onUpdateNotes,
  onSendEmail,
  onClose,
}: Props) {
  const stages = getWorkflowStages(row)
  const raciParty = getRACIParty(row)
  const isSealed = !!anchors[row.id]
  const [editingNotes, setEditingNotes] = useState(false)
  const [localNotes, setLocalNotes] = useState(row.notes)

  function handleSaveNotes() {
    onUpdateNotes(row.id, localNotes)
    setEditingNotes(false)
  }

  return (
    <DraggableModal className="bg-white border border-border rounded-card shadow-2xl" defaultWidth={960}>
      <div className="max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              row.status === 'green' ? 'bg-green-500/15' :
              row.status === 'yellow' ? 'bg-yellow-500/15' : 'bg-red-500/15'
            }`}>
              <i className={`fas fa-project-diagram ${
                row.status === 'green' ? 'text-green-500' :
                row.status === 'yellow' ? 'text-yellow-500' : 'text-red-500'
              }`}></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">DRL Workflow Progress — {row.diNumber}</h2>
              <p className="text-xs text-steel">{row.id} · {row.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSealed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase rounded-md">
                <i className="fas fa-check-circle text-[9px]"></i> Ledger Sealed
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent text-[10px] font-bold uppercase rounded-md">
              <i className="fas fa-user-tag text-[9px]"></i> {raciParty}
            </span>
            <button onClick={onClose} className="ml-2 w-8 h-8 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] flex items-center justify-center text-steel hover:text-gray-900 transition-all">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ─── Workflow Timeline ─────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-steel uppercase tracking-wide mb-4">Workflow Timeline</h3>
            <div className="flex items-start gap-0">
              {stages.map((stage, i) => {
                const c = stageColor(stage.status)
                const isLast = i === stages.length - 1
                return (
                  <div key={i} className="flex-1 relative">
                    {/* Connector line */}
                    {!isLast && (
                      <div className={`absolute top-4 left-[calc(50%+16px)] right-0 h-0.5 ${lineColor(stage, stages[i + 1])}`} />
                    )}
                    <div className="flex flex-col items-center text-center">
                      {/* Status dot */}
                      <div className={`w-8 h-8 rounded-full ${c.bg} border-2 ${c.border} flex items-center justify-center z-10 relative`}>
                        <i className={`fas ${stageIcon(stage.status)} text-xs ${c.text}`}></i>
                      </div>
                      {/* Label */}
                      <p className="text-[11px] font-semibold text-gray-900 mt-2 leading-tight px-1">{stage.label}</p>
                      {/* Responsible */}
                      <p className="text-[10px] text-steel mt-0.5">{stage.responsible}</p>
                      {/* Status tag */}
                      <span className={`mt-1.5 px-2 py-0.5 text-[9px] font-bold uppercase rounded ${c.bg} ${c.text} border ${c.border}`}>
                        {stage.status === 'Overdue' && <><i className="fas fa-exclamation-triangle mr-0.5 text-[8px]"></i></>}
                        {stage.status}
                      </span>
                      {/* Date */}
                      {stage.date && (
                        <p className="text-[10px] text-steel mt-1">{stage.date}</p>
                      )}
                      {!stage.date && stage.status !== 'Completed' && stage.status !== 'Pending' && (
                        <p className="text-[10px] text-red-400 mt-1 flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>
                          Awaiting Action
                        </p>
                      )}
                    </div>
                    {/* Comment card */}
                    <div className={`mt-3 mx-1 p-2.5 rounded-lg border text-[10px] leading-relaxed ${c.bg} ${c.border} text-gray-700`}>
                      {stage.comments}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ─── Key Dates ────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-steel uppercase tracking-wide">Contract Due</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{row.contractDueFinish}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-steel uppercase tracking-wide">Calculated Due</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{row.calculatedDueDate}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-steel uppercase tracking-wide">Actual Submission</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{row.actualSubmissionDate || '—'}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-steel uppercase tracking-wide">Review Days</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{row.calendarDaysToReview ?? '—'}</p>
            </div>
          </div>

          {/* ─── AI Remarks & Next Actions ─────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-steel uppercase tracking-wide">AI Remarks & Next Actions</h3>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-[10px] text-accent hover:text-accent/80 font-medium transition-colors"
                >
                  <i className="fas fa-edit mr-0.5"></i> Edit
                </button>
              )}
            </div>

            {aiInsight && (
              <div className="space-y-2 mb-3">
                <div className="bg-accent/5 border border-accent/15 rounded-lg px-4 py-2.5">
                  <p className="text-xs text-gray-700 leading-relaxed">{aiInsight.statusExplanation}</p>
                </div>
                {aiInsight.nextActions.length > 0 && (
                  <div className="space-y-1">
                    {aiInsight.nextActions.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <i className="fas fa-arrow-right text-accent text-[9px] mt-1"></i>
                        <div className="flex-1">
                          <p className="text-xs text-gray-800">{a.action}</p>
                          <p className="text-[10px] text-steel mt-0.5">Due: {a.dueDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Editable notes */}
            {editingNotes ? (
              <div>
                <textarea
                  value={localNotes}
                  onChange={e => setLocalNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 border border-border rounded-lg px-3 py-2 text-xs text-gray-700 leading-relaxed focus:outline-none focus:border-accent resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => { setLocalNotes(row.notes); setEditingNotes(false) }} className="px-3 py-1.5 text-xs text-steel hover:text-gray-900 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveNotes} className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/90 transition-all">
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

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border flex items-center justify-between flex-shrink-0 bg-gray-50/50">
          <p className="text-[10px] text-steel">
            <i className="fas fa-shield-alt mr-1"></i>
            All data sealed to Ledger — immutable trust layer active
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-black/[0.03] hover:bg-black/[0.06] border border-border rounded-lg text-sm text-steel transition-all"
            >
              Close
            </button>
            <button
              onClick={() => onSendEmail(row)}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg transition-all"
            >
              <i className="fas fa-envelope"></i>
              Send Workflow Update
            </button>
          </div>
        </div>
      </div>
    </DraggableModal>
  )
}
