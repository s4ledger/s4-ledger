import { useMemo, useState, memo } from 'react'
import DraggableModal from './DraggableModal'
import DiffViewer from './DiffViewer'
import { AuditEvent, AuditSummary, getAuditLog, getAuditLogForRow, getAuditSummary } from '../utils/auditTrail'
import { AnchorRecord } from '../types'
import { chatWithAI } from '../utils/aiService'

interface Props {
  visible: boolean
  rowId?: string | null // null = global view
  rowTitle?: string
  anchors?: Record<string, AnchorRecord>
  onClose: () => void
}

const EVENT_ICONS: Record<string, { icon: string; bg: string; text: string }> = {
  Sealed:              { icon: 'fa-shield-alt',       bg: 'bg-green-500/15',  text: 'text-green-600' },
  Verified:            { icon: 'fa-check-circle',     bg: 'bg-green-500/15',  text: 'text-green-600' },
  'Mismatch Detected': { icon: 'fa-exclamation-triangle', bg: 'bg-red-500/15', text: 'text-red-500' },
  'Re-Sealed':         { icon: 'fa-redo',             bg: 'bg-accent/15',     text: 'text-accent' },
  Edited:              { icon: 'fa-pen',              bg: 'bg-yellow-500/15', text: 'text-yellow-600' },
  'AI Remark Updated': { icon: 'fa-brain',            bg: 'bg-purple-500/15', text: 'text-purple-600' },
  'External Data Feed':{ icon: 'fa-satellite-dish',   bg: 'bg-blue-500/15',   text: 'text-blue-600' },
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDateFull(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default memo(function AuditTrailSidebar({ visible, rowId, rowTitle, anchors, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'audit' | 'changes'>('audit')
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)
  const [aiDetailAnalysis, setAiDetailAnalysis] = useState<string | null>(null)
  const [aiDetailLoading, setAiDetailLoading] = useState(false)
  const [auditSearch, setAuditSearch] = useState('')
  const [auditDateFilter, setAuditDateFilter] = useState('')
  const events = useMemo<AuditEvent[]>(() => {
    if (!visible) return []
    const raw = rowId ? getAuditLogForRow(rowId) : getAuditLog()
    return [...raw].reverse() // newest first
  }, [visible, rowId])

  const summary = useMemo<AuditSummary>(() => {
    return getAuditSummary(rowId ? [rowId] : undefined)
  }, [rowId, events])

  const filteredEvents = useMemo(() => {
    let result = events
    if (auditSearch) {
      const q = auditSearch.toLowerCase()
      result = result.filter(e =>
        e.type.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.aiSummary && e.aiSummary.toLowerCase().includes(q)) ||
        e.rowId.toLowerCase().includes(q) ||
        (e.rowTitle && e.rowTitle.toLowerCase().includes(q)) ||
        (e.txHash && e.txHash.toLowerCase().includes(q))
      )
    }
    if (auditDateFilter) {
      result = result.filter(e => e.timestamp.startsWith(auditDateFilter))
    }
    return result
  }, [events, auditSearch, auditDateFilter])

  if (!visible) return null

  /* ─── Open event detail and trigger AI analysis ──────────── */
  function openEventDetail(evt: AuditEvent) {
    setSelectedEvent(evt)
    setAiDetailAnalysis(null)
    setAiDetailLoading(true)

    const anchor = anchors?.[evt.rowId]
    const sealContext = anchor
      ? `This record is sealed on XRPL (tx: ${anchor.txHash}, ledger: ${anchor.ledgerIndex}).`
      : 'This record has not been sealed to the ledger yet.'

    const editContext = evt.details && evt.type === 'Edited'
      ? `Field "${evt.details.field}" changed from "${evt.details.oldValue}" to "${evt.details.newValue}".`
      : ''

    const prompt = `Analyze this audit event in detail for a government program manager.\n` +
      `Event type: ${evt.type}\n` +
      `Record: ${evt.rowId} — "${evt.rowTitle}"\n` +
      `Timestamp: ${evt.timestamp}\n` +
      `Description: ${evt.description}\n` +
      `${editContext}\n` +
      `${sealContext}\n\n` +
      `Provide: (1) a concise risk/compliance assessment, (2) what this event means for data integrity, ` +
      `(3) any recommended actions. Keep it to 3-4 sentences, professional Navy/DoD tone.`

    chatWithAI({ message: prompt, tool_context: 'audit_analysis' })
      .then(res => {
        setAiDetailAnalysis(res.response || evt.aiSummary)
      })
      .catch(() => {
        setAiDetailAnalysis(evt.aiSummary)
      })
      .finally(() => setAiDetailLoading(false))
  }

  const trustStyles = {
    green:  { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'fa-check-circle text-green-500' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'fa-clock text-yellow-500' },
    red:    { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'fa-exclamation-triangle text-red-500' },
  }
  const ts = trustStyles[summary.trustColor]

  return (
    <DraggableModal className="bg-white border-l border-border shadow-xl" defaultWidth={420} zIndex={40} position="right" backdrop={false}>
      <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <i className="fas fa-history text-accent text-sm"></i>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Audit Trail</h3>
            <p className="text-[10px] text-steel">
              {rowId ? `${rowId} — ${rowTitle?.slice(0, 30)}${(rowTitle?.length ?? 0) > 30 ? '…' : ''}` : 'All Records'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors p-1">
          <i className="fas fa-times text-sm"></i>
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-border bg-white">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'audit'
              ? 'text-accent border-b-2 border-accent bg-accent/5'
              : 'text-steel hover:text-gray-700'
          }`}
        >
          <i className="fas fa-history mr-1.5 text-[10px]"></i>Audit Trail
        </button>
        <button
          onClick={() => setActiveTab('changes')}
          className={`flex-1 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'changes'
              ? 'text-accent border-b-2 border-accent bg-accent/5'
              : 'text-steel hover:text-gray-700'
          }`}
        >
          <i className="fas fa-code-branch mr-1.5 text-[10px]"></i>Change History
        </button>
      </div>

      {/* Change History Tab */}
      {activeTab === 'changes' ? (
        <DiffViewer rowId={rowId ?? null} rowTitle={rowTitle} anchors={anchors} />
      ) : (
      <>

      {/* Trust Status Banner */}
      <div className={`mx-5 mt-4 rounded-lg border px-4 py-3 ${ts.bg} ${ts.border}`}>
        <div className="flex items-center gap-2 mb-1.5">
          <i className={`fas ${ts.icon} text-sm`}></i>
          <span className={`text-xs font-bold ${ts.text}`}>{summary.trustStatus}</span>
        </div>
        <div className="grid grid-cols-2 gap-y-1 text-[11px]">
          <span className="text-gray-500">Total Seals</span>
          <span className="font-medium text-gray-700">{summary.totalSeals}</span>
          <span className="text-gray-500">Verifications</span>
          <span className="font-medium text-gray-700">{summary.totalVerifications}</span>
          {summary.totalMismatches > 0 && (
            <>
              <span className="text-gray-500">Mismatches</span>
              <span className="font-medium text-red-600">{summary.totalMismatches}</span>
            </>
          )}
          <span className="text-gray-500">Edits Tracked</span>
          <span className="font-medium text-gray-700">{summary.totalEdits}</span>
          <span className="text-gray-500">Last Seal</span>
          <span className="font-medium text-gray-700">{summary.lastSealDate ? formatDateFull(summary.lastSealDate) : '—'}</span>
          <span className="text-gray-500">Last Verification</span>
          <span className="font-medium text-gray-700">{summary.lastVerifyDate ? formatDateFull(summary.lastVerifyDate) : '—'}</span>
        </div>
      </div>

      {/* Event search & date filter */}
      <div className="px-5 pt-3">
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-steel/40 text-[10px]"></i>
            <input
              type="text"
              value={auditSearch}
              onChange={e => setAuditSearch(e.target.value)}
              placeholder="Search events…"
              className="w-full pl-7 pr-7 py-1.5 text-[11px] bg-white border border-border rounded-md text-gray-700 focus:outline-none focus:border-accent placeholder:text-steel/40"
            />
            {auditSearch && (
              <button onClick={() => setAuditSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-steel/40 hover:text-steel">
                <i className="fas fa-times text-[9px]"></i>
              </button>
            )}
          </div>
          <div className="relative">
            <i className="fas fa-calendar-alt absolute left-2 top-1/2 -translate-y-1/2 text-steel/40 text-[10px] pointer-events-none"></i>
            <input
              type="date"
              value={auditDateFilter}
              onChange={e => setAuditDateFilter(e.target.value)}
              className="pl-6 pr-1 py-1.5 text-[11px] bg-white border border-border rounded-md text-gray-700 focus:outline-none focus:border-accent w-[130px]"
            />
          </div>
        </div>
        {(auditSearch || auditDateFilter) && (
          <button
            onClick={() => { setAuditSearch(''); setAuditDateFilter('') }}
            className="text-[10px] text-accent hover:text-accent/70 font-medium mb-1"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Event count */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-[10px] uppercase tracking-wider font-bold text-steel">
          Timeline · {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-history text-steel/30 text-2xl mb-2"></i>
            <p className="text-xs text-steel">No audit events recorded yet.</p>
            <p className="text-[10px] text-steel/60 mt-1">Seal or verify a record to start the trail.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border"></div>

            <div className="space-y-0.5">
              {filteredEvents.map((evt, i) => {
                const style = EVENT_ICONS[evt.type] || EVENT_ICONS.Edited
                const prevEvt = filteredEvents[i - 1]
                const showDateHeader = !prevEvt || formatDate(evt.timestamp) !== formatDate(prevEvt.timestamp)

                return (
                  <div key={evt.id}>
                    {showDateHeader && (
                      <div className="flex items-center gap-2 py-2 ml-10">
                        <span className="text-[10px] font-bold text-steel uppercase tracking-wider">
                          {formatDate(evt.timestamp)}
                        </span>
                        <div className="flex-1 h-px bg-border"></div>
                      </div>
                    )}
                    <div className="flex gap-3 group cursor-pointer hover:bg-accent/5 rounded-lg px-1 py-0.5 -mx-1 transition-colors"
                      onClick={() => openEventDetail(evt)}
                      title="Click for detailed view"
                    >
                      {/* Icon dot */}
                      <div className={`relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full ${style.bg} flex items-center justify-center`}>
                        <i className={`fas ${style.icon} ${style.text} text-[11px]`}></i>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                            {evt.type}
                          </span>
                          <span className="text-[10px] text-steel/50 ml-auto flex-shrink-0">
                            {formatTime(evt.timestamp)}
                          </span>
                        </div>

                        {/* Row ID badge (global view only) */}
                        {!rowId && (
                          <span className="inline-block mb-1 px-1.5 py-0.5 bg-gray-100 text-[9px] font-mono text-steel rounded">
                            {evt.rowId}
                          </span>
                        )}

                        <p className="text-xs text-gray-700 leading-relaxed mb-1">
                          {evt.description}
                        </p>

                        {/* AI summary */}
                        <div className="bg-accent/5 border border-accent/10 rounded-md px-2.5 py-1.5 mb-1">
                          <p className="text-[10px] text-gray-600 leading-relaxed">
                            <i className="fas fa-brain text-accent/60 mr-1 text-[8px]"></i>
                            {evt.aiSummary}
                          </p>
                        </div>

                        {/* XRPL link */}
                        {evt.txHash && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono text-steel/60 truncate max-w-[180px]">
                              {evt.txHash.slice(0, 20)}…
                            </span>
                            {evt.explorerUrl && (
                              <a
                                href={evt.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-accent hover:text-accent/80 font-medium transition-colors"
                              >
                                Verify on Ledger <i className="fas fa-external-link-alt text-[8px]"></i>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Edit details */}
                        {evt.details && evt.type === 'Edited' && (
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className="px-1.5 py-0.5 bg-red-50 text-red-500 rounded line-through">
                              {evt.details.oldValue?.slice(0, 30)}
                            </span>
                            <i className="fas fa-arrow-right text-steel/30 text-[8px]"></i>
                            <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded">
                              {evt.details.newValue?.slice(0, 30)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      </>
      )}

      {/* ─── Event Detail Popup Overlay ──────────────────────── */}
      {selectedEvent && (() => {
        const evt = selectedEvent
        const style = EVENT_ICONS[evt.type] || EVENT_ICONS.Edited
        const anchor = anchors?.[evt.rowId]
        const isSealEvent = ['Sealed', 'Verified', 'Re-Sealed', 'Mismatch Detected'].includes(evt.type)
        const isEditEvent = evt.type === 'Edited' || evt.type === 'AI Remark Updated' || evt.type === 'External Data Feed'

        return (
          <div className="absolute inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right">
            {/* Detail Header */}
            <div className="px-5 py-4 border-b border-border bg-gray-50/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${style.bg} flex items-center justify-center`}>
                    <i className={`fas ${style.icon} ${style.text} text-sm`}></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{evt.type}</h4>
                    <p className="text-[10px] text-steel">{evt.rowId} · {formatDateFull(evt.timestamp)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-7 h-7 rounded-md hover:bg-gray-200 text-steel inline-flex items-center justify-center"
                >
                  <i className="fas fa-arrow-left text-xs"></i>
                </button>
              </div>
            </div>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Event description */}
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-steel mb-1.5">
                  Event Description
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">{evt.description}</p>
                {!rowId && (
                  <p className="text-xs text-gray-600 mt-1">
                    <span className="font-medium">Row:</span> {evt.rowTitle}
                  </p>
                )}
              </div>

              {/* ─── XRPL Trust Layer (seal/verify/reseal events) ─── */}
              {isSealEvent && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-shield-alt text-green-600 text-sm"></i>
                    <span className="text-xs font-bold text-green-800 uppercase tracking-wider">S4 Ledger Trust Layer</span>
                    <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      evt.type === 'Mismatch Detected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {evt.type === 'Mismatch Detected' ? 'INTEGRITY ALERT' : 'VERIFIED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 text-xs">
                    {evt.txHash && (
                      <div>
                        <span className="text-green-600/70 text-[10px] font-medium">Transaction Hash</span>
                        <p className="font-mono text-[11px] text-gray-800 mt-0.5 break-all select-all bg-white/60 rounded px-2 py-1">
                          {evt.txHash}
                        </p>
                      </div>
                    )}

                    {anchor && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-green-600/70 text-[10px] font-medium">Ledger Index</span>
                            <p className="font-mono text-[11px] text-gray-800 mt-0.5">{anchor.ledgerIndex.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-green-600/70 text-[10px] font-medium">Network</span>
                            <p className="text-[11px] text-gray-800 mt-0.5">{anchor.network || 'XRPL Mainnet'}</p>
                          </div>
                        </div>

                        <div>
                          <span className="text-green-600/70 text-[10px] font-medium">Data Integrity Hash (SHA-256)</span>
                          <p className="font-mono text-[10px] text-gray-700 mt-0.5 break-all select-all bg-white/60 rounded px-2 py-1">
                            {anchor.hash}
                          </p>
                        </div>

                        <div>
                          <span className="text-green-600/70 text-[10px] font-medium">Sealed At</span>
                          <p className="text-[11px] text-gray-800 mt-0.5">
                            {new Date(anchor.timestamp).toLocaleString('en-US', {
                              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                          </p>
                        </div>
                      </>
                    )}

                    {/* Mismatch hashes */}
                    {evt.type === 'Mismatch Detected' && evt.details && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                        <span className="text-[10px] font-bold text-red-700 uppercase">Hash Mismatch Detail</span>
                        <div className="grid grid-cols-1 gap-1.5">
                          <div>
                            <span className="text-[10px] text-red-500">Current Hash</span>
                            <p className="font-mono text-[10px] text-red-700 bg-red-100/50 rounded px-2 py-0.5 select-all">
                              {evt.details.currentHash}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-red-500">Sealed Hash</span>
                            <p className="font-mono text-[10px] text-red-700 bg-red-100/50 rounded px-2 py-0.5 select-all">
                              {evt.details.anchoredHash}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Verify on XRPL button */}
                  {(evt.explorerUrl || anchor?.explorerUrl) && (
                    <a
                      href={evt.explorerUrl || anchor?.explorerUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      <i className="fas fa-external-link-alt text-[10px]"></i>
                      Verify on Ledger <i className="fas fa-arrow-right text-[8px] ml-0.5"></i>
                    </a>
                  )}
                </div>
              )}

              {/* ─── Before vs After Comparison (edit events) ───── */}
              {isEditEvent && evt.details && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-border flex items-center gap-2">
                    <i className="fas fa-code-compare text-accent text-xs"></i>
                    <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Data Change Comparison</span>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Field label */}
                    {evt.details.field && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-steel font-medium">Field Changed:</span>
                        <span className="text-xs font-semibold text-gray-900 px-2 py-0.5 bg-accent/10 rounded">
                          {evt.details.field}
                        </span>
                      </div>
                    )}

                    {/* Side-by-side comparison */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Old value */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-400"></div>
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Before</span>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 min-h-[60px]">
                          <p className="text-xs text-red-700 leading-relaxed break-words select-all">
                            {evt.details.oldValue || <span className="italic text-red-400">(empty)</span>}
                          </p>
                        </div>
                      </div>

                      {/* New value */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">After</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 min-h-[60px]">
                          <p className="text-xs text-green-700 leading-relaxed break-words select-all">
                            {evt.details.newValue || <span className="italic text-green-400">(empty)</span>}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Seal status for this row */}
                    {anchor ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <i className="fas fa-exclamation-triangle text-yellow-500 text-xs"></i>
                        <span className="text-[10px] text-yellow-700">
                          This record has an existing seal. If this edit occurred after sealing, a re-seal may be needed to restore integrity.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-border rounded-lg">
                        <i className="fas fa-info-circle text-steel text-xs"></i>
                        <span className="text-[10px] text-steel">
                          This record has not been sealed yet. Changes are tracked but not cryptographically anchored.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── AI Analysis ────────────────────────────────── */}
              <div className="bg-accent/5 border border-accent/15 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <i className="fas fa-brain text-accent text-xs"></i>
                  <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">AI Analysis</span>
                  {aiDetailLoading && (
                    <i className="fas fa-spinner fa-spin text-accent text-[10px] ml-auto"></i>
                  )}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {aiDetailLoading
                    ? 'Analyzing this event…'
                    : aiDetailAnalysis || evt.aiSummary
                  }
                </p>
              </div>

              {/* ─── Full Anchor Details (if row is sealed) ─────── */}
              {!isSealEvent && anchor && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-border flex items-center gap-2">
                    <i className="fas fa-link text-green-500 text-xs"></i>
                    <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">S4 Ledger Seal for This Record</span>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-steel">Ledger Index</span>
                        <p className="font-mono text-gray-800">{anchor.ledgerIndex.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-steel">Sealed At</span>
                        <p className="text-gray-800">{formatDateFull(anchor.timestamp)}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-steel">Transaction Hash</span>
                      <p className="font-mono text-[10px] text-gray-700 break-all select-all mt-0.5">{anchor.txHash}</p>
                    </div>
                    {anchor.explorerUrl && (
                      <a
                        href={anchor.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-white text-[10px] font-semibold rounded-md transition-colors"
                      >
                        <i className="fas fa-external-link-alt text-[8px]"></i>
                        Verify on Ledger
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Event metadata */}
              <div className="text-[10px] text-steel space-y-0.5 px-1 pt-2 border-t border-border/50">
                <p><span className="font-medium">Event ID:</span> {evt.id}</p>
                <p><span className="font-medium">Timestamp:</span> {new Date(evt.timestamp).toISOString()}</p>
                <p><span className="font-medium">Row ID:</span> {evt.rowId}</p>
              </div>
            </div>

            {/* Detail Footer */}
            <div className="px-5 py-3 border-t border-border bg-gray-50/50 flex-shrink-0">
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-full px-4 py-2 text-xs font-medium text-steel hover:text-gray-900 bg-white hover:bg-gray-100 border border-border rounded-lg transition-colors"
              >
                <i className="fas fa-arrow-left mr-1.5 text-[9px]"></i>
                Back to Timeline
              </button>
            </div>
          </div>
        )
      })()}

      <div className="px-5 py-3 border-t border-border bg-gray-50/50">
        <p className="text-[10px] text-steel text-center">
          <i className="fas fa-lock text-accent/60 mr-1"></i>
          S4 Ledger Trust Layer · Immutable Audit Trail
        </p>
      </div>
      </div>
    </DraggableModal>
  )
})
