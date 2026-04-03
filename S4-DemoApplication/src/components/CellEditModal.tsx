import { useState, useEffect, useRef } from 'react'
import DraggableModal from './DraggableModal'
import { DRLRow, ColumnKey, AnchorRecord } from '../types'
import { AIRowInsight } from '../utils/aiAnalysis'
import { chatWithAI } from '../utils/aiService'

interface CellEditTarget {
  row: DRLRow
  colKey: ColumnKey
  field: keyof DRLRow
  label: string
  editable: boolean
  value: string
}

interface Props {
  target: CellEditTarget
  aiInsight: AIRowInsight | null
  anchor: AnchorRecord | undefined
  onSave: (rowId: string, field: keyof DRLRow, value: string) => void
  onClose: () => void
}

/* ── Local AI suggestion (instant fallback) ──────────────────── */
function generateLocalAISuggestion(target: CellEditTarget, insight: AIRowInsight | null): string | null {
  const { colKey, row } = target

  if (colKey === 'notes' || colKey === 'govNotes' || colKey === 'shipbuilderNotes') {
    if (insight) {
      return insight.conciseNote
    }
    if (row.status === 'red') return `Action required — ${row.title} is overdue. Recommend escalation.`
    if (row.status === 'yellow') return `Compliance follow-up needed for ${row.diNumber}.`
    return null
  }

  if (colKey === 'actualSubmissionDate') {
    if (!row.actualSubmissionDate) {
      const today = new Date().toISOString().split('T')[0]
      return `Suggest setting submission date to today: ${today}`
    }
    return null
  }

  if (colKey === 'received') {
    if (row.received === 'No' && row.actualSubmissionDate) {
      return 'Submission date recorded but not marked received. Consider updating to "Yes".'
    }
    return null
  }

  if (colKey === 'calendarDaysToReview') {
    if (row.calendarDaysToReview === null && row.received === 'Yes') {
      return 'Document received — calculate and enter calendar days to review.'
    }
    return null
  }

  if (colKey === 'submittalGuidance') {
    if (!row.submittalGuidance) {
      return 'Reference DFARS 252.234-7001 for standard submittal guidance.'
    }
    return null
  }

  if (colKey === 'responsibleParty') {
    if (!row.responsibleParty) {
      return row.received === 'Yes' ? 'Document received — assign Government as responsible party.' : 'Assign Contractor or Shipbuilder as responsible party for tracking.'
    }
    return null
  }

  if (insight && insight.priority === 'Critical') {
    return `Critical priority — ${insight.statusExplanation}`
  }

  return null
}

export type { CellEditTarget }

export default function CellEditModal({ target, aiInsight, anchor, onSave, onClose }: Props) {
  const [value, setValue] = useState(target.value === '—' ? '' : target.value)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    // Show local suggestion immediately as fallback
    const localSuggestion = generateLocalAISuggestion(target, aiInsight)
    setAiSuggestion(localSuggestion)
    if (localSuggestion) setShowSuggestion(true)

    // Then try real AI for a better suggestion
    let cancelled = false
    const prompt = `I'm editing the "${target.label}" field for DRL item ${target.row.id} "${target.row.title}" ` +
      `(status: ${target.row.status}, current value: "${target.value}"). ` +
      `Provide a concise, specific suggestion for what this field should contain. ` +
      `Keep your response to 1-2 sentences max. Just give the suggestion text, no explanation.`

    setAiLoading(true)
    chatWithAI({
      message: prompt,
      tool_context: 'cell_edit',
      analysis_data: {
        rowId: target.row.id,
        colKey: target.colKey,
        status: target.row.status,
        currentValue: target.value,
      },
    }).then(result => {
      if (!cancelled && !result.fallback && result.response) {
        setAiSuggestion(result.response)
        setShowSuggestion(true)
      }
    }).finally(() => {
      if (!cancelled) setAiLoading(false)
    })

    return () => { cancelled = true }
  }, [target, aiInsight])

  useEffect(() => {
    if (target.editable && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length)
    }
  }, [target.editable])

  function handleSave() {
    onSave(target.row.id, target.field, value)
    onClose()
  }

  function handleApplySuggestion() {
    if (aiSuggestion) {
      // For notes-type fields, append suggestion
      if (target.colKey === 'notes' || target.colKey === 'govNotes' || target.colKey === 'shipbuilderNotes') {
        setValue(prev => prev ? `${prev}\n${aiSuggestion}` : aiSuggestion)
      } else if (target.colKey === 'actualSubmissionDate') {
        // Extract date from suggestion
        const dateMatch = aiSuggestion.match(/\d{4}-\d{2}-\d{2}/)
        if (dateMatch) setValue(dateMatch[0])
        else setValue(aiSuggestion)
      } else if (target.colKey === 'received') {
        setValue('Yes')
      } else {
        setValue(aiSuggestion)
      }
      setApplied(true)
    }
  }

  const isSealed = !!anchor
  const priorityColor = aiInsight
    ? aiInsight.priority === 'Critical' ? 'text-red-500'
      : aiInsight.priority === 'High' ? 'text-orange-500'
      : aiInsight.priority === 'Medium' ? 'text-yellow-600'
      : 'text-green-500'
    : 'text-steel'

  return (
    <DraggableModal className="bg-white rounded-xl shadow-2xl" defaultWidth={520}>
      <div className="overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <i className={`fas ${target.editable ? 'fa-edit text-accent' : 'fa-eye text-steel'}`}></i>
                {target.label}
              </h3>
              <p className="text-[11px] text-steel mt-0.5">
                {target.row.title.length > 50 ? target.row.title.slice(0, 50) + '…' : target.row.title}
                <span className="mx-1.5">·</span>
                <span className="font-mono">{target.row.diNumber}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isSealed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-[10px] font-medium">
                  <i className="fas fa-check-circle text-[8px]"></i>Sealed
                </span>
              )}
              {target.editable ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded text-[10px] font-medium">
                  <i className="fas fa-pen text-[8px]"></i>Editable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-steel rounded text-[10px] font-medium">
                  <i className="fas fa-lock text-[8px]"></i>Read Only
                </span>
              )}
              <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-gray-200 text-steel inline-flex items-center justify-center">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Current / editable value */}
          <div>
            <label className="text-[11px] font-semibold text-steel uppercase tracking-wide mb-1.5 block">
              {target.editable ? 'Edit Value' : 'Current Value'}
            </label>
            {target.editable ? (
              <textarea
                ref={inputRef}
                value={value}
                onChange={e => setValue(e.target.value)}
                rows={target.colKey === 'notes' || target.colKey === 'govNotes' || target.colKey === 'shipbuilderNotes' ? 4 : 2}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none transition-all"
                placeholder={`Enter ${target.label.toLowerCase()}…`}
              />
            ) : (
              <div className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-border rounded-lg min-h-[40px]">
                {target.value || '—'}
              </div>
            )}
          </div>

          {/* AI Insight Section */}
          {aiInsight && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-robot text-accent text-xs"></i>
                <span className="text-[11px] font-semibold text-accent uppercase tracking-wide">AI Analysis</span>
                <span className={`text-[10px] font-bold uppercase ${priorityColor}`}>{aiInsight.priority}</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{aiInsight.statusExplanation}</p>
              {aiInsight.nextActions.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold text-steel uppercase mb-1">Recommended Actions</p>
                  <ul className="space-y-0.5">
                    {aiInsight.nextActions.slice(0, 3).map((act, i) => (
                      <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1.5">
                        <span className="text-accent mt-0.5">›</span>
                        <span>{act.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* AI Suggestion for this field */}
          {showSuggestion && aiSuggestion && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <i className={`fas ${aiLoading ? 'fa-spinner fa-spin' : 'fa-lightbulb'} text-blue-500 text-xs`}></i>
                  <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                    {aiLoading ? 'AI Thinking…' : 'AI Suggestion'}
                  </span>
                </div>
                {target.editable && !applied && (
                  <button
                    onClick={handleApplySuggestion}
                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded transition-all"
                  >
                    <i className="fas fa-magic mr-1"></i>Apply
                  </button>
                )}
                {applied && (
                  <span className="text-[10px] font-semibold text-green-600">
                    <i className="fas fa-check mr-1"></i>Applied
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-700">{aiSuggestion}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-gray-50/30 flex items-center justify-between">
          <div className="text-[10px] text-steel">
            {isSealed && target.editable && (
              <span className="text-orange-500">
                <i className="fas fa-exclamation-triangle mr-1"></i>Editing will require re-seal
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-steel hover:text-gray-900 rounded-md hover:bg-gray-100 transition-all"
            >
              {target.editable ? 'Cancel' : 'Close'}
            </button>
            {target.editable && (
              <button
                onClick={handleSave}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-md transition-all shadow-sm"
              >
                <i className="fas fa-save mr-1.5"></i>Save
              </button>
            )}
          </div>
        </div>
      </div>
    </DraggableModal>
  )
}
