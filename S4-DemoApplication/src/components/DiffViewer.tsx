import { useState, useEffect } from 'react'
import { ChangeEntry, getChangesForRow, getAllChanges } from '../utils/changeLog'

interface Props {
  rowId: string | null  // null = global view
  rowTitle?: string
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

export default function DiffViewer({ rowId, rowTitle }: Props) {
  const [entries, setEntries] = useState<ChangeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterField, setFilterField] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

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
    return true
  })

  // Group by date
  const groups: Record<string, ChangeEntry[]> = {}
  for (const e of filtered) {
    const date = formatDate(e.created_at)
    if (!groups[date]) groups[date] = []
    groups[date].push(e)
  }

  return (
    <div className="flex flex-col h-full">
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
        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={filterField}
            onChange={e => setFilterField(e.target.value)}
            className="text-[11px] bg-white border border-border rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:border-accent"
          >
            <option value="all">All Fields</option>
            {uniqueFields.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-[11px] bg-white border border-border rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:border-accent"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{TYPE_STYLES[t]?.label || t}</option>
            ))}
          </select>
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

                      <div className="bg-white border border-border rounded-lg px-3 py-2">
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
    </div>
  )
}
