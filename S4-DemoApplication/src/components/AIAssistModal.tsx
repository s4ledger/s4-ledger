import { useState, useEffect, useRef } from 'react'
import { CDRLRow, AnchorRecord } from '../types'
import { AIRowInsight, analyzeRow, analyzePortfolio, generateChatResponse, AIPortfolioSummary } from '../utils/aiAnalysis'

interface Props {
  row: CDRLRow | null
  allData: CDRLRow[]
  anchors: Record<string, AnchorRecord>
  editedSinceSeal: Set<string>
  onUpdateNotes: (rowId: string, notes: string) => void
  onClose: () => void
}

const PRIORITY_STYLES: Record<string, string> = {
  Critical: 'bg-red-500/15 text-red-600 border-red-500/30',
  High: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  Medium: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  Low: 'bg-green-500/15 text-green-600 border-green-500/30',
}

export default function AIAssistModal({ row, allData, anchors, editedSinceSeal, onUpdateNotes, onClose }: Props) {
  const [insight, setInsight] = useState<AIRowInsight | null>(null)
  const [portfolio, setPortfolio] = useState<AIPortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [editableRemarks, setEditableRemarks] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setSaved(false)
    setChatHistory([])

    const timer = setTimeout(() => {
      if (row) {
        const ins = analyzeRow(row, anchors, editedSinceSeal)
        setInsight(ins)
        setEditableRemarks(
          `${ins.statusExplanation}\n\n` +
          (ins.changesSinceSeal ? `Changes: ${ins.changesSinceSeal}\n\n` : '') +
          `Impact: ${ins.programImpact}\n\n` +
          `Next Actions:\n${ins.nextActions.map((a, i) => `${i + 1}. ${a.action} (by ${a.dueDate})`).join('\n')}`
        )
      } else {
        const p = analyzePortfolio(allData, anchors, editedSinceSeal)
        setPortfolio(p)
      }
      setLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [row, allData, anchors, editedSinceSeal])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  async function handleChat() {
    if (!chatInput.trim() || !row || !insight) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }])
    setChatLoading(true)

    await new Promise(r => setTimeout(r, 600 + Math.random() * 500))
    const response = generateChatResponse(userMsg, row, insight)
    setChatHistory(prev => [...prev, { role: 'ai', text: response }])
    setChatLoading(false)
  }

  function handleSave() {
    if (!row) return
    // Extract concise version for notes column
    const concise = editableRemarks.split('\n')[0].slice(0, 120)
    onUpdateNotes(row.id, concise)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-white border border-border rounded-card p-6 max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
              <i className="fas fa-brain text-accent"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {row ? 'AI Insights & Next Actions' : 'AI Portfolio Assessment'}
              </h3>
              <p className="text-steel text-xs">
                {row ? `${row.id} — ${row.title}` : `${allData.length} deliverables analyzed`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {insight && (
              <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${PRIORITY_STYLES[insight.priority]}`}>
                {insight.priority}
              </span>
            )}
            <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12 gap-3 text-steel">
            <i className="fas fa-spinner fa-spin text-accent"></i>
            <span className="text-sm">Analyzing contractual requirements and generating insights…</span>
          </div>
        ) : row && insight ? (
          /* ─── Single-row insight view ─── */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Status explanation */}
            <div className={`rounded-lg border px-4 py-3 text-xs leading-relaxed ${
              row.status === 'green' ? 'bg-green-50 border-green-200 text-green-800' :
              row.status === 'yellow' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
              'bg-red-50 border-red-200 text-red-800'
            }`}>
              <p className="font-semibold mb-1">
                <i className={`fas ${row.status === 'green' ? 'fa-check-circle' : row.status === 'yellow' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'} mr-1`}></i>
                Status Assessment
              </p>
              {insight.statusExplanation}
            </div>

            {/* Changes since seal */}
            {insight.changesSinceSeal && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800 leading-relaxed">
                <p className="font-semibold mb-1"><i className="fas fa-shield-alt mr-1"></i>Seal Status</p>
                {insight.changesSinceSeal}
              </div>
            )}

            {/* Program impact */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-700 leading-relaxed">
              <p className="font-semibold text-gray-900 mb-1"><i className="fas fa-chart-line mr-1"></i>Program Impact</p>
              {insight.programImpact}
            </div>

            {/* Next actions */}
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-2"><i className="fas fa-tasks mr-1 text-accent"></i>Next Actions</p>
              <div className="space-y-1.5">
                {insight.nextActions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 bg-white border border-border rounded-lg px-3 py-2">
                    <span className="text-accent font-bold text-xs mt-0.5">{i + 1}.</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-900">{a.action}</p>
                      <p className="text-[10px] text-steel mt-0.5">Target: {a.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested communication */}
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-2"><i className="fas fa-envelope mr-1 text-accent"></i>Suggested Communication</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">
                {insight.suggestedComms}
              </div>
            </div>

            {/* Editable remarks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-900"><i className="fas fa-edit mr-1 text-accent"></i>Editable Remarks & Notes</p>
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    saved
                      ? 'bg-green-500/15 text-green-600 border border-green-500/30'
                      : 'bg-accent hover:bg-accent/90 text-white'
                  }`}
                >
                  <i className={`fas ${saved ? 'fa-check' : 'fa-save'} text-[10px]`}></i>
                  {saved ? 'Saved' : 'Save to Notes'}
                </button>
              </div>
              <textarea
                value={editableRemarks}
                onChange={e => setEditableRemarks(e.target.value)}
                className="w-full bg-white border border-border rounded-lg p-3 text-xs text-gray-900 leading-relaxed resize-y min-h-[100px] focus:outline-none focus:border-accent"
                rows={6}
              />
            </div>

            {/* Chat with AI */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-gray-900 mb-2"><i className="fas fa-comments mr-1 text-accent"></i>Chat with AI</p>
              <p className="text-[11px] text-steel mb-3">AI didn't catch 100%? Tell me what to adjust or add.</p>
              {chatHistory.length > 0 && (
                <div className="space-y-2 mb-3 max-h-[160px] overflow-y-auto">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-accent text-white'
                          : 'bg-gray-50 border border-gray-200 text-gray-700'
                      }`}>
                        {msg.role === 'ai' && <i className="fas fa-brain text-accent mr-1 text-[10px]"></i>}
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-steel">
                        <i className="fas fa-spinner fa-spin mr-1"></i>Thinking…
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChat()}
                  placeholder="Ask about deadlines, risk, escalation, hull requirements…"
                  className="flex-1 bg-white border border-border rounded-lg px-3 py-2 text-xs text-gray-900 placeholder:text-steel/50 focus:outline-none focus:border-accent"
                />
                <button
                  onClick={handleChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-3 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white text-xs font-medium transition-all disabled:opacity-40"
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        ) : portfolio ? (
          /* ─── Portfolio view ─── */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Trend summary */}
            <div className="bg-accent/5 border border-accent/15 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-accent mb-1"><i className="fas fa-chart-bar mr-1"></i>Trend Summary</p>
              <p className="text-xs text-gray-700 leading-relaxed">{portfolio.trendSummary}</p>
            </div>

            {/* Alerts */}
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-2"><i className="fas fa-bell mr-1 text-accent"></i>Proactive Alerts</p>
              <div className="space-y-1.5">
                {portfolio.incomingAlerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    <i className="fas fa-exclamation-circle text-yellow-500 text-[10px] mt-1"></i>
                    <p className="text-xs text-yellow-800">{alert}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 actions */}
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-2"><i className="fas fa-tasks mr-1 text-accent"></i>Top 5 Prioritized Actions</p>
              <div className="space-y-1.5">
                {portfolio.topActions.map((act, i) => (
                  <div key={i} className="flex items-start gap-2 bg-white border border-border rounded-lg px-3 py-2.5">
                    <span className={`flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${PRIORITY_STYLES[act.priority]}`}>
                      {act.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900">{act.action}</p>
                      <p className="text-[10px] text-steel mt-0.5">{act.rowId} — {act.title} · Target: {act.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly progress */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-gray-900 mb-1"><i className="fas fa-chart-line mr-1 text-accent"></i>Weekly Progress</p>
              <p className="text-xs text-gray-700">
                {portfolio.weeklyProgress.progressed} DRLs progressed · {portfolio.weeklyProgress.stillOverdue} still overdue · {portfolio.weeklyProgress.newSeals} new seals this period
              </p>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex justify-end mt-4 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black/[0.03] hover:bg-black/[0.06] border border-border rounded-lg text-sm text-steel transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
