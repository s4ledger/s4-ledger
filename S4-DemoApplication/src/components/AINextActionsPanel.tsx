import { useState, useEffect } from 'react'
import DraggableModal from './DraggableModal'
import { DRLRow, AnchorRecord } from '../types'
import { analyzePortfolio, AIPortfolioSummary } from '../utils/aiAnalysis'

interface Props {
  data: DRLRow[]
  anchors: Record<string, AnchorRecord>
  editedSinceSeal: Set<string>
  visible: boolean
  onClose: () => void
}

const PRIORITY_DOTS: Record<string, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-green-500',
}

export default function AINextActionsPanel({ data, anchors, editedSinceSeal, visible, onClose }: Props) {
  const [portfolio, setPortfolio] = useState<AIPortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    const timer = setTimeout(() => {
      setPortfolio(analyzePortfolio(data, anchors, editedSinceSeal))
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [data, anchors, editedSinceSeal, visible])

  if (!visible) return null

  return (
    <DraggableModal className="bg-white border-l border-border shadow-xl" defaultWidth={380} zIndex={40} position="right" backdrop={false}>
      <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center">
            <i className="fas fa-bolt text-accent text-xs"></i>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Next Actions</h3>
            <p className="text-[10px] text-steel">AI-prioritized action queue</p>
          </div>
        </div>
        <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors p-1">
          <i className="fas fa-times text-sm"></i>
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-steel text-xs">
            <i className="fas fa-spinner fa-spin text-accent"></i>
            <span>Analyzing portfolio…</span>
          </div>
        </div>
      ) : portfolio ? (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Alerts */}
          {portfolio.incomingAlerts.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-steel mb-2">Proactive Alerts</p>
              <div className="space-y-1.5">
                {portfolio.incomingAlerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    <i className="fas fa-bell text-yellow-500 text-[10px] mt-0.5"></i>
                    <p className="text-[11px] text-yellow-800 leading-relaxed">{alert}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top actions */}
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-steel mb-2">Prioritized Actions</p>
            <div className="space-y-2">
              {portfolio.topActions.map((act, i) => (
                <div key={i} className="bg-white border border-border rounded-lg px-3 py-2.5 hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${PRIORITY_DOTS[act.priority]}`}></div>
                    <span className="text-[10px] font-bold text-steel uppercase">{act.priority}</span>
                    <span className="text-[10px] text-steel ml-auto">{act.rowId}</span>
                  </div>
                  <p className="text-xs text-gray-900 leading-snug">{act.action}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-steel truncate">{act.title}</span>
                    <span className="text-[10px] text-accent ml-auto flex-shrink-0">by {act.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend */}
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-steel mb-2">Trend Summary</p>
            <div className="bg-accent/5 border border-accent/15 rounded-lg px-3 py-2.5">
              <p className="text-[11px] text-gray-700 leading-relaxed">{portfolio.trendSummary}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-steel mb-1.5">This Period</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{portfolio.weeklyProgress.progressed}</p>
                <p className="text-[9px] text-steel">Progressed</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">{portfolio.weeklyProgress.stillOverdue}</p>
                <p className="text-[9px] text-steel">Overdue</p>
              </div>
              <div>
                <p className="text-lg font-bold text-accent">{portfolio.weeklyProgress.newSeals}</p>
                <p className="text-[9px] text-steel">New Seals</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-gray-50/50">
        <p className="text-[10px] text-steel text-center">
          <i className="fas fa-brain text-accent mr-1"></i>Auto-generated from contract data & seal history
        </p>
      </div>
      </div>
    </DraggableModal>
  )
}
