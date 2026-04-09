import { useState, useEffect } from 'react'
import { ChangeEntry, getChangesForRow, getAllChanges } from '../utils/changeLog'
import { AnchorRecord } from '../types'
import { chatWithAI } from '../utils/aiService'

interface Props {
  rowId: string | null  // null = global view
  rowTitle?: string
  anchors?: Record<string, AnchorRecord>
}

const TYPE_STYLES: Record<string, { icon: string; color: string; label: string }> = {
  edit: { icon: 'fa-pen', color: 'text-blue-500 bg-blue-500/15', label: 'Edit' },
  seal: { icon: 'fa-lock', color: 'text-green-500 bg-green-500/15', label: 'Sealed' },
  reseal: { icon: 'fa-sync-alt', color: 'text-orange-500 bg-orange-500/15', label: 'Re-sealed' },
  verify: { icon: 'fa-check-double', color: 'text-emerald-500 bg-emerald-500/15', label: 'Verified' },
  ai_remark: { icon: 'fa-brain', color: 'text-accent bg-accent/15', label: 'AI Remark' },
  status_change: { icon: 'fa-exchange-alt', color: 'text-purple-500 bg-purple-500/15', label: 'Status Change' },
  external_sync: { icon: 'fa-cloud-download-alt', color: 'text-indigo-500 bg-indigo-500/15', label: 'External Sync' },
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function DiffViewer({ rowId, rowTitle, anchors }: Props) {
  const [entries, setEntries] = useState<ChangeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterField, setFilterField] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<ChangeEntry | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const load = async () => {
      const data = rowId
        ? await getChangesForRow(rowId)
        : await getAllChanges(200)
      if (!cancelled) {
        setEntries(data)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [rowId])

  // Get unique fields for filter dropdown
  const uniqueFields = [...new Set(entries.map(e => e.field_label))].sort()
  const uniqueTypes = [...new Set(entries.map(e => e.change_type))].sort()

  const filtered = entries.filter(e => {
    if (filterField !== 'all' && e.field_label !== filterField) return false
    if (filterType !== 'all' && e.change_type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        e.field_label.toLowerCase().includes(q) ||
        e.row_id.toLowerCase().includes(q) ||
        e.row_title.toLowerCase().includes(q) ||
        (e.old_value || '').toLowerCase().includes(q) ||
        (e.new_value || '').toLowerCase().includes(q) ||
        (e.user_email || '').toLowerCase().includes(q) ||
        (e.user_role || '').toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    if (dateFilter) {
      const entryDate = e.created_at.slice(0, dateFilter.length)
      if (!entryDate.startsWith(dateFilter)) return false
    }
    return true
  })

  // Group by date
  const groups: Record<string, ChangeEntry[]> = {}
  for (const e of filtered) {
    const date = formatDate(e.created_at)
    if (!groups[date]) groups[date] = []
    groups[date].push(e)
  }

  function openChangeDetail(entry: ChangeEntry) {
    setSelectedEntry(entry)
    setAiAnalysis(null)
    setAiLoading(true)

    const anchor = anchors?.[entry.row_id]
    const sealContext = anchor
      ? `This record is sealed on the S4 Ledger (tx: ${anchor.txHash}, ledger index: ${anchor.ledgerIndex}).`
      : 'This record has not been sealed to the ledger yet.'

    const changeContext = entry.old_value && entry.new_value
      ? `The field "${entry.field_label}" was changed from "${entry.old_value}" to "${entry.new_value}".`
      : entry.new_value
      ? `The field "${entry.field_label}" was set to "${entry.new_value}".`
      : `The field "${entry.field_label}" was cleared.`

    const prompt = `Analyze this data change for a government program manager and provide recommended next actions.\n` +
      `Change type: ${entry.change_type}\n` +
      `Record: ${entry.row_id} — "${entry.row_title}"\n` +
      `${changeContext}\n` +
      `Changed by: ${entry.user_email || 'Unknown'} (${entry.user_role || 'Unknown role'})\n` +
      `${sealContext}\n\n` +
      `Provide: (1) impact assessment in 1-2 sentences, (2) data integrity implications, ` +
      `(3) 2-3 specific recommended next actions as bullet points. Professional Navy/DoD tone.`

    chatWithAI({ message: prompt, tool_context: 'change_analysis' })
      .then(res => {
        setAiAnalysis(res.response || 'Change recorded in audit trail.')
      })
      .catch(() => {
        setAiAnalysis('Change recorded in audit trail. Review the before/after comparison and verify data integrity if this record is sealed.')
      })
      .finally(() => setAiLoading(false))
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-gray-50/50">
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-history text-accent text-sm"></i>
          <h3 className="text-sm font-bold text-gray-900">
            {rowId ? 'Change History' : 'All Changes'}
          </h3>
          <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">
            {filtered.length} {filtered.length === 1 ? 'change' : 'changes'}
          </span>
        </div>
        {rowTitle && (
          <p className="text-[11px] text-steel mb-2">{rowId} — {rowTitle}</p>
        )}
        {/* Search + Date row */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-steel/40 text-[10px]"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search changes…"
              className="w-full pl-7 pr-7 py-1.5 text-[11px] bg-white border border-border rounded-md text-gray-700 focus:outline-none focus:border-accent placeholder:text-steel/40"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-steel/40 hover:text-steel">
                <i className="fas fa-times text-[9px]"></i>
              </button>
            )}
          </div>
          <div className="relative">
            <i className="fas fa-calendar-alt absolute left-2 top-1/2 -translate-y-1/2 text-steel/40 text-[10px] pointer-events-none"></i>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="pl-6 pr-1 py-1.5 text-[11px] bg-white border border-border rounded-md text-gray-700 focus:outline-none focus:border-accent w-[130px]"
            />
          </div>
        </div>
        {/* Field + Type filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterField}
            onChange={e => setFilterField(e.target.value)}
            className="flex-1 text-[11px] bg-white border border-border rounded-md px-2 py-1.5 text-gray-700 focus:outline-none focus:border-accent"
          >
            <option value="all">All Fields</option>
            {uniqueFields.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="flex-1 text-[11px] bg-white border border-border rounded-md px-2 py-1.5 text-gray-700 focus:outline-none focus:border-accent"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{TYPE_STYLES[t]?.label || t}</option>
            ))}
          </select>
          {(searchQuery || dateFilter || filterField !== 'all' || filterType !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setDateFilter(''); setFilterField('all'); setFilterType('all') }}
              className="text-[10px] text-accent hover:text-accent/70 font-medium whitespace-nowrap"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-steel">
            <i className="fas fa-spinner fa-spin text-accent"></i>
            <span className="text-xs">Loading change history…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-inbox text-steel/30 text-2xl mb-2 block"></i>
            <p className="text-xs text-steel">No changes recorded yet</p>
          </div>
        ) : (
          Object.entries(groups).map(([date, items]) => (
            <div key={date} className="mb-4">
              {/* Date header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-steel uppercase tracking-wider">{date}</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              {/* Entries */}
              <div className="space-y-2">
                {items.map((entry, idx) => {
                  const style = TYPE_STYLES[entry.change_type] || TYPE_STYLES.edit
                  return (
                    <div key={`${entry.id}-${idx}`} className="relative pl-6">
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full flex items-center justify-center ${style.color}`}>
                        <i className={`fas ${style.icon} text-[7px]`}></i>
                      </div>
                      {/* Timeline line */}
                      {idx < items.length - 1 && (
                        <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border"></div>
                      )}

                      <div
                        className="bg-white border border-border rounded-lg px-3 py-2 cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all"
                        onClick={() => openChangeDetail(entry)}
                        title="Click for detailed view"
                      >
                        {/* Meta row */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.color}`}>
                            {style.label}
                          </span>
                          {!rowId && (
                            <span className="text-[9px] font-mono bg-gray-100 text-gray-600 px-1 py-0.5 rounded">
                              {entry.row_id}
                            </span>
                          )}
                          <span className="text-[10px] text-steel ml-auto">{formatTime(entry.created_at)}</span>
                        </div>

                        {/* Field & user */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-xs font-semibold text-gray-900">{entry.field_label}</span>
                          {entry.user_email && (
                            <span className="text-[10px] text-steel">
                              by {entry.user_email.split('@')[0]}
                            </span>
                          )}
                          {entry.user_role && (
                            <span className="text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">
                              {entry.user_role}
                            </span>
                          )}
                        </div>

                        {/* Diff display */}
                        {(entry.old_value !== null || entry.new_value !== null) && (
                          <div className="space-y-1">
                            {entry.old_value && entry.old_value !== '' && (
                              <div className="flex items-start gap-1.5">
                                <span className="text-[9px] font-bold text-red-400 mt-0.5 w-3 flex-shrink-0">−</span>
                                <p className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1 flex-1 line-through break-words">
                                  {entry.old_value.length > 200 ? entry.old_value.slice(0, 200) + '…' : entry.old_value}
                                </p>
                              </div>
                            )}
                            {entry.new_value && entry.new_value !== '' && (
                              <div className="flex items-start gap-1.5">
                                <span className="text-[9px] font-bold text-green-500 mt-0.5 w-3 flex-shrink-0">+</span>
                                <p className="text-[11px] text-green-800 bg-green-50 border border-green-100 rounded px-2 py-1 flex-1 break-words">
                                  {entry.new_value.length > 200 ? entry.new_value.slice(0, 200) + '…' : entry.new_value}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Detail Popup Overlay ── */}
      {selectedEntry && (() => {
        const e = selectedEntry
        const anchor = anchors?.[e.row_id]
        const style = TYPE_STYLES[e.change_type] || TYPE_STYLES.update
        return (
          <div className="absolute inset-0 z-50 bg-white overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-border px-4 py-3 flex items-center gap-3 z-10">
              <button
                onClick={() => { setSelectedEntry(null); setAiAnalysis(null) }}
                className="text-steel hover:text-accent transition-colors"
              >
                <i className="fas fa-arrow-left text-sm"></i>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.color}`}>
                    {style.label}
                  </span>
                  <span className="text-xs font-semibold text-navy truncate">{e.field_label}</span>
                </div>
                <p className="text-[10px] text-steel mt-0.5">
                  Row {e.row_id}{e.row_title ? ` · ${e.row_title}` : ''} · {new Date(e.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Before / After */}
              <div className="bg-gray-50 border border-border rounded-lg p-3">
                <h4 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">
                  <i className="fas fa-exchange-alt mr-1"></i> Before vs. After
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-[9px] font-bold text-red-400 uppercase">Before</span>
                    <div className="mt-0.5 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1.5 break-words whitespace-pre-wrap">
                      {e.old_value || '(empty)'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-green-500 uppercase">After</span>
                    <div className="mt-0.5 text-[11px] text-green-800 bg-green-50 border border-green-100 rounded px-2 py-1.5 break-words whitespace-pre-wrap">
                      {e.new_value || '(empty)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* S4 Ledger Trust Layer */}
              {anchor && (
                <div className="bg-gradient-to-r from-accent/5 to-navy/5 border border-accent/20 rounded-lg p-3">
                  <h4 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">
                    <i className="fas fa-shield-alt mr-1"></i> S4 Ledger Trust Layer
                  </h4>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-steel">Tx Hash:</span>
                      <span className="font-mono text-[10px] text-navy break-all">{anchor.txHash}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-steel">Ledger Index:</span>
                      <span className="font-mono text-[10px] text-navy">{anchor.ledgerIndex}</span>
                    </div>
                    {anchor.explorerUrl && (
                      <a
                        href={anchor.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-accent hover:text-accent/80 mt-1"
                      >
                        <i className="fas fa-external-link-alt"></i> Verify on Ledger
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                <h4 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">
                  <i className="fas fa-robot mr-1"></i> AI Analysis &amp; Recommended Next Actions
                </h4>
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-[11px] text-steel py-2">
                    <i className="fas fa-spinner fa-spin"></i> Analyzing change…
                  </div>
                ) : aiAnalysis ? (
                  <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
                ) : (
                  <p className="text-[11px] text-steel italic">Analysis unavailable</p>
                )}
              </div>

              {/* Metadata */}
              <div className="bg-gray-50 border border-border rounded-lg p-3">
                <h4 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">
                  <i className="fas fa-info-circle mr-1"></i> Entry Metadata
                </h4>
                <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                  <span className="text-steel">Change ID</span>
                  <span className="font-mono text-[10px] text-navy">{e.id}</span>
                  <span className="text-steel">Timestamp</span>
                  <span className="text-navy">{new Date(e.created_at).toLocaleString()}</span>
                  {e.user_email && <>
                    <span className="text-steel">User</span>
                    <span className="text-navy">{e.user_email}</span>
                  </>}
                  {e.user_role && <>
                    <span className="text-steel">Role</span>
                    <span className="text-navy">{e.user_role}</span>
                  </>}
                  {e.user_org && <>
                    <span className="text-steel">Organization</span>
                    <span className="text-navy">{e.user_org}</span>
                  </>}
                </div>
              </div>

              {/* Back button */}
              <button
                onClick={() => { setSelectedEntry(null); setAiAnalysis(null) }}
                className="w-full py-2 text-[11px] font-semibold text-accent hover:bg-accent/5 border border-accent/20 rounded-lg transition-colors"
              >
                <i className="fas fa-arrow-left mr-1.5"></i> Back to Change History
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
