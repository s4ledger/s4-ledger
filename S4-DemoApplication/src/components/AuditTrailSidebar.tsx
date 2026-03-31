import { useMemo } from 'react'
import { AuditEvent, AuditSummary, getAuditLog, getAuditLogForRow, getAuditSummary } from '../utils/auditTrail'

interface Props {
  visible: boolean
  rowId?: string | null // null = global view
  rowTitle?: string
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

export default function AuditTrailSidebar({ visible, rowId, rowTitle, onClose }: Props) {
  const events = useMemo<AuditEvent[]>(() => {
    if (!visible) return []
    const raw = rowId ? getAuditLogForRow(rowId) : getAuditLog()
    return [...raw].reverse() // newest first
  }, [visible, rowId])

  const summary = useMemo<AuditSummary>(() => {
    return getAuditSummary(rowId ? [rowId] : undefined)
  }, [rowId, events])

  if (!visible) return null

  const trustStyles = {
    green:  { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'fa-check-circle text-green-500' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'fa-clock text-yellow-500' },
    red:    { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'fa-exclamation-triangle text-red-500' },
  }
  const ts = trustStyles[summary.trustColor]

  return (
    <div className="fixed top-0 right-0 h-full w-[420px] bg-white border-l border-border shadow-xl z-40 flex flex-col animate-slideUp">
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

      {/* Event count */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-[10px] uppercase tracking-wider font-bold text-steel">
          Timeline · {events.length} event{events.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {events.length === 0 ? (
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
              {events.map((evt, i) => {
                const style = EVENT_ICONS[evt.type] || EVENT_ICONS.Edited
                const prevEvt = events[i - 1]
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
                    <div className="flex gap-3 group">
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
                                View on XRPL <i className="fas fa-external-link-alt text-[8px]"></i>
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
      <div className="px-5 py-3 border-t border-border bg-gray-50/50">
        <p className="text-[10px] text-steel text-center">
          <i className="fas fa-lock text-accent/60 mr-1"></i>
          Immutable audit trail · Cryptographically linked to XRPL
        </p>
      </div>
    </div>
  )
}
