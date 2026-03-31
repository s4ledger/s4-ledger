import { useState, useMemo, useCallback } from 'react'
import { CDRLRow, UserRole, AnchorRecord } from '../types'
import AIAssistModal from './AIAssistModal'
import AnchorVerifyMenu from './AnchorVerifyMenu'
import VerifyModal from './VerifyModal'
import { generatePDF } from '../utils/pdf'
import { runContractComparison, ComparisonResult, ComparisonSummary } from '../utils/contractCompare'
import { contractRequirements } from '../data/contractData'

interface Props {
  data: CDRLRow[]
  role: UserRole
  anchors: Record<string, AnchorRecord>
  onAnchor: (row: CDRLRow) => void
  onAnchorAll: () => void
  onVerify: (row: CDRLRow) => void
  onDataUpdate: (data: CDRLRow[]) => void
}

const columns = [
  { key: 'title', label: 'S4 DRL(S) TITLE / REVISIONS', width: 'w-[22%]' },
  { key: 'diNumber', label: 'DI NUMBER', width: 'w-[11%]' },
  { key: 'contractDueFinish', label: 'CONTRACT DUE: FINISH', width: 'w-[10%]' },
  { key: 'calculatedDueDate', label: 'CALCULATED DUE DATE', width: 'w-[10%]' },
  { key: 'submittalGuidance', label: 'SUBMITTAL GUIDANCE', width: 'w-[13%]' },
  { key: 'actualSubmissionDate', label: 'ACTUAL SUBMISSION DATE', width: 'w-[10%]' },
  { key: 'received', label: 'RCVD', width: 'w-[5%]' },
  { key: 'calendarDaysToReview', label: 'CAL DAYS TO REVIEW', width: 'w-[7%]' },
  { key: 'notes', label: 'NOTES', width: 'w-[12%]' },
]

export default function DeliverablesTracker({ data, role, anchors, onAnchor, onAnchorAll, onVerify, onDataUpdate }: Props) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'green' | 'yellow' | 'red'>('all')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [showAI, setShowAI] = useState(false)
  const [aiRow, setAiRow] = useState<CDRLRow | null>(null)
  const [verifyRow, setVerifyRow] = useState<CDRLRow | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)
  const [compareProgress, setCompareProgress] = useState(0)
  const [compareSummary, setCompareSummary] = useState<ComparisonSummary | null>(null)
  const [contractRefs, setContractRefs] = useState<Record<string, string>>({})
  const [hoveredDI, setHoveredDI] = useState<string | null>(null)
  const [rowFindings, setRowFindings] = useState<Record<string, string[]>>({})
  const [notesRow, setNotesRow] = useState<CDRLRow | null>(null)
  const [originalNotes, setOriginalNotes] = useState<Record<string, { notes: string; status: 'green' | 'yellow' | 'red' }> | null>(null)

  const filtered = useMemo(() => {
    let rows = [...data]
    if (filterStatus !== 'all') rows = rows.filter(r => r.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.diNumber.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      )
    }
    if (sortCol) {
      rows.sort((a, b) => {
        const av = String((a as unknown as Record<string, unknown>)[sortCol] ?? '')
        const bv = String((b as unknown as Record<string, unknown>)[sortCol] ?? '')
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    return rows
  }, [data, filterStatus, search, sortCol, sortAsc])

  const stats = useMemo(() => ({
    total: data.length,
    green: data.filter(r => r.status === 'green').length,
    yellow: data.filter(r => r.status === 'yellow').length,
    red: data.filter(r => r.status === 'red').length,
    anchored: Object.keys(anchors).length,
  }), [data, anchors])

  const handleCompare = useCallback(async () => {
    if (comparing) return
    setComparing(true)
    setCompareProgress(0)
    setCompareSummary(null)

    // Save original notes/status before overwriting
    const origMap: Record<string, { notes: string; status: 'green' | 'yellow' | 'red' }> = {}
    data.forEach(r => { origMap[r.id] = { notes: r.notes, status: r.status } })
    setOriginalNotes(origMap)

    const refs: Record<string, string> = {}
    const findingsMap: Record<string, string[]> = {}
    const updatedData = [...data]

    const summary = await runContractComparison(data, (result: ComparisonResult, index: number) => {
      setCompareProgress(index + 1)
      refs[result.rowId] = result.contractRef
      findingsMap[result.rowId] = result.findings
      // Update the row's notes and status
      updatedData[index] = {
        ...updatedData[index],
        notes: result.remarks,
        status: result.status,
      }
    })

    setContractRefs(refs)
    setRowFindings(findingsMap)
    onDataUpdate(updatedData)
    setCompareSummary(summary)
    setComparing(false)
  }, [comparing, data, onDataUpdate])

  function handleSort(key: string) {
    if (sortCol === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortCol(key)
      setSortAsc(true)
    }
  }

  function handleRestoreNotes() {
    if (!originalNotes) return
    const restored = data.map(r => ({
      ...r,
      notes: originalNotes[r.id]?.notes ?? r.notes,
      status: originalNotes[r.id]?.status ?? r.status,
    }))
    onDataUpdate(restored)
    setOriginalNotes(null)
    setCompareSummary(null)
    setRowFindings({})
    setContractRefs({})
  }

  function handleCellEdit(rowId: string, field: keyof CDRLRow, value: string) {
    const updated = data.map(r => {
      if (r.id !== rowId) return r
      if (field === 'calendarDaysToReview') {
        const num = value.trim() === '' || value.trim() === '—' ? null : parseInt(value, 10)
        return { ...r, [field]: isNaN(num as number) ? null : num }
      }
      return { ...r, [field]: value }
    })
    onDataUpdate(updated)
  }

  function rowClass(status: string) {
    if (status === 'red') return 'row-red'
    if (status === 'yellow') return 'row-yellow'
    return 'row-green'
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900">
      {/* Top Bar */}
      <header className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/s4-assets/S4Ledger_logo.png" alt="S4 Ledger" className="h-9 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">S4 Ledger · Deliverables Tracker</h1>
              <p className="text-steel text-xs">{role} View · FOUO Simulation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCompare}
              disabled={comparing}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 rounded-lg text-green-600 text-sm font-medium transition-all disabled:opacity-60"
            >
              {comparing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Comparing ({compareProgress}/{data.length})…
                </>
              ) : (
                <>
                  <i className="fas fa-file-contract"></i>
                  Compare to Contract
                </>
              )}
            </button>
            <button
              onClick={() => { setAiRow(null); setShowAI(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-accent/15 hover:bg-accent/25 border border-accent/30 rounded-lg text-accent text-sm font-medium transition-all"
            >
              <i className="fas fa-brain"></i>
              AI Assist
            </button>
            <button
              onClick={() => generatePDF(data, anchors, role)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all"
            >
              <i className="fas fa-file-pdf"></i>
              PDF Report
            </button>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white border border-border rounded-card p-4">
            <p className="text-steel text-xs uppercase tracking-wide">Total CDRLs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white border border-green-500/30 rounded-card p-4">
            <p className="text-green-400 text-xs uppercase tracking-wide">Approved</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.green}</p>
          </div>
          <div className="bg-white border border-yellow-500/30 rounded-card p-4">
            <p className="text-yellow-400 text-xs uppercase tracking-wide">In Review</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.yellow}</p>
          </div>
          <div className="bg-white border border-red-500/30 rounded-card p-4">
            <p className="text-red-400 text-xs uppercase tracking-wide">Overdue</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.red}</p>
          </div>
          <div className="bg-white border border-accent/30 rounded-card p-4">
            <p className="text-accent text-xs uppercase tracking-wide">Sealed</p>
            <p className="text-2xl font-bold text-accent mt-1">{stats.anchored}</p>
          </div>
        </div>
      </div>

      {/* Contract Comparison Summary Banner */}
      {compareSummary && (
        <div className="max-w-[1600px] mx-auto px-6 pb-3">
          <div className="bg-white border border-accent/20 rounded-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <i className="fas fa-file-contract text-accent text-sm"></i>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Contractual Guidance Comparison Complete
                </p>
                <p className="text-xs text-steel">
                  <span className="text-green-500 font-medium">{compareSummary.compliant} fully compliant</span>
                  {compareSummary.needsAttention > 0 && (
                    <>, <span className="text-yellow-500 font-medium">{compareSummary.needsAttention} need attention</span></>
                  )}
                  {compareSummary.critical > 0 && (
                    <>, <span className="text-red-500 font-medium">{compareSummary.critical} critical</span></>
                  )}
                  {' '}— AI remarks generated from full Attachment J-2 contract requirements.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {originalNotes && (
                <button
                  onClick={handleRestoreNotes}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-steel/10 hover:bg-steel/20 border border-steel/20 rounded-lg text-steel text-xs font-medium transition-all"
                >
                  <i className="fas fa-undo text-[10px]"></i>
                  Restore Original Notes
                </button>
              )}
              <button
                onClick={() => setCompareSummary(null)}
                className="text-steel hover:text-gray-900 transition-colors text-xs px-2"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="max-w-[1600px] mx-auto px-6 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-steel/50 text-sm"></i>
            <input
              type="text"
              placeholder="Search deliverables…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-border rounded-lg pl-9 pr-4 py-2 text-gray-900 text-sm placeholder:text-steel/50 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1">
            {(['all', 'green', 'yellow', 'red'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filterStatus === s
                    ? s === 'all'
                      ? 'bg-accent text-white'
                      : s === 'green'
                      ? 'bg-green-500/20 text-green-400'
                      : s === 'yellow'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                    : 'text-steel hover:text-gray-900'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={onAnchorAll}
            className="flex items-center gap-2 px-3 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-lg text-accent text-xs font-medium transition-all"
          >
            <i className="fas fa-link"></i>
            Seal All
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-[1600px] mx-auto px-6 pb-8">
        <div className="bg-white border border-border rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-[50px] px-3 py-3 text-left text-xs font-semibold text-steel uppercase tracking-wider">
                    #
                  </th>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`${col.width} px-3 py-3 text-left text-xs font-semibold text-steel uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors`}
                    >
                      {col.label}
                      {sortCol === col.key && (
                        <i className={`fas fa-sort-${sortAsc ? 'up' : 'down'} ml-1 text-accent`}></i>
                      )}
                    </th>
                  ))}
                  <th className="w-[80px] px-3 py-3 text-center text-xs font-semibold text-steel uppercase tracking-wider">
                    Trust
                  </th>
                  <th className="w-[50px] px-3 py-3 text-center text-xs font-semibold text-steel uppercase tracking-wider">
                    <i className="fas fa-bolt text-accent"></i>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`${rowClass(row.status)} border-b border-border/50 hover:bg-black/[0.03] transition-colors`}
                  >
                    <td className="px-3 py-3 text-steel font-mono text-xs">{idx + 1}</td>
                    <td
                      className="px-3 py-3 font-medium text-gray-900"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'title', e.currentTarget.textContent || '')}
                    >{row.title}</td>
                    <td
                      className="px-3 py-3 font-mono text-xs text-steel relative"
                      onMouseEnter={() => setHoveredDI(row.id)}
                      onMouseLeave={() => setHoveredDI(null)}
                    >
                      <span
                        className="cursor-help border-b border-dashed border-steel/40"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={e => handleCellEdit(row.id, 'diNumber', e.currentTarget.textContent || '')}
                      >
                        {row.diNumber}
                      </span>
                      {hoveredDI === row.id && (contractRefs[row.id] || contractRequirements[row.id]) && (
                        <div className={`absolute left-0 z-50 w-72 bg-white border border-border text-gray-900 text-xs rounded-lg p-3 shadow-xl pointer-events-none ${
                          idx < 2 ? 'top-full mt-2' : 'bottom-full mb-2'
                        }`}>
                          <p className="font-semibold text-accent mb-1">
                            <i className="fas fa-file-contract mr-1"></i>
                            Contract Reference
                          </p>
                          <p className="leading-relaxed text-gray-700">
                            {contractRefs[row.id] || contractRequirements[row.id]?.summaryRule || 'No reference available'}
                          </p>
                          {contractRequirements[row.id] && (
                            <p className="mt-1.5 text-steel text-[10px]">
                              {contractRequirements[row.id].block} · {contractRequirements[row.id].frequency} · {contractRequirements[row.id].submittalMethod}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td
                      className="px-3 py-3 text-xs"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'contractDueFinish', e.currentTarget.textContent || '')}
                    >{row.contractDueFinish}</td>
                    <td
                      className="px-3 py-3 text-xs"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'calculatedDueDate', e.currentTarget.textContent || '')}
                    >{row.calculatedDueDate}</td>
                    <td
                      className="px-3 py-3 text-xs text-steel"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'submittalGuidance', e.currentTarget.textContent || '')}
                    >{row.submittalGuidance}</td>
                    <td
                      className="px-3 py-3 text-xs"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'actualSubmissionDate', e.currentTarget.textContent || '')}
                    >{row.actualSubmissionDate || '—'}</td>
                    <td
                      className={`px-3 py-3 text-xs text-center font-semibold ${row.received === 'Yes' ? 'text-green-400' : 'text-red-400'}`}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'received', e.currentTarget.textContent || '')}
                    >{row.received}</td>
                    <td
                      className="px-3 py-3 text-xs text-center"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'calendarDaysToReview', e.currentTarget.textContent || '')}
                    >{row.calendarDaysToReview !== null ? row.calendarDaysToReview : '—'}</td>
                    <td
                      className="px-3 py-3 text-xs text-steel max-w-[180px] cursor-pointer group"
                      onClick={() => setNotesRow(row)}
                    >
                      <div className="truncate group-hover:text-accent transition-colors" title="Click to view full remarks">
                        {row.notes || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {anchors[row.id] ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/15 text-green-400 rounded text-xs">
                          <i className="fas fa-check-circle text-[10px]"></i>
                          Verified
                        </span>
                      ) : (
                        <span className="text-steel/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === row.id ? null : row.id)}
                        className="w-7 h-7 rounded-md bg-accent/10 hover:bg-accent/25 text-accent transition-all inline-flex items-center justify-center"
                      >
                        <i className="fas fa-bolt text-xs"></i>
                      </button>
                      {activeMenu === row.id && (
                        <AnchorVerifyMenu
                          row={row}
                          isAnchored={!!anchors[row.id]}
                          onAnchor={() => { onAnchor(row); setActiveMenu(null) }}
                          onVerify={() => { setVerifyRow(row); setActiveMenu(null) }}
                          onAIAssist={() => { setAiRow(row); setShowAI(true); setActiveMenu(null) }}
                          onClose={() => setActiveMenu(null)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center text-steel">
                      No deliverables match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAI && (
        <AIAssistModal
          row={aiRow}
          allData={data}
          onClose={() => { setShowAI(false); setAiRow(null) }}
        />
      )}
      {verifyRow && (
        <VerifyModal
          row={verifyRow}
          anchor={anchors[verifyRow.id]}
          onClose={() => setVerifyRow(null)}
        />
      )}

      {/* Notes Detail Popup */}
      {notesRow && (
        <div className="modal-backdrop" onClick={() => setNotesRow(null)}>
          <div
            className="bg-white border border-border rounded-card p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  notesRow.status === 'green' ? 'bg-green-500/15' :
                  notesRow.status === 'yellow' ? 'bg-yellow-500/15' : 'bg-red-500/15'
                }`}>
                  <i className={`fas ${
                    notesRow.status === 'green' ? 'fa-check-circle text-green-500' :
                    notesRow.status === 'yellow' ? 'fa-exclamation-circle text-yellow-500' :
                    'fa-exclamation-triangle text-red-500'
                  }`}></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Contractual Guidance & Recommended Actions</h3>
                  <p className="text-steel text-xs">{notesRow.id} — {notesRow.title}</p>
                </div>
              </div>
              <button onClick={() => setNotesRow(null)} className="text-steel hover:text-gray-900 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Contract reference banner */}
            {contractRefs[notesRow.id] && (
              <div className="bg-accent/5 border border-accent/15 rounded-lg px-4 py-2.5 mb-4">
                <p className="text-xs font-semibold text-accent mb-0.5">
                  <i className="fas fa-file-contract mr-1.5"></i>Contract Reference
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">{contractRefs[notesRow.id]}</p>
              </div>
            )}

            {/* Findings list */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {rowFindings[notesRow.id] && rowFindings[notesRow.id].length > 0 ? (
                rowFindings[notesRow.id].map((finding, i) => {
                  const isCompliant = finding.startsWith('COMPLIANT:')
                  const isCritical = finding.startsWith('DELINQUENT:') || finding.startsWith('LATE SUBMITTAL:') || finding.startsWith('CORRECTIVE ACTION')
                  const isWarning = finding.startsWith('MINOR VARIANCE:') || finding.startsWith('DUE DATE') || finding.startsWith('REVISION') || finding.startsWith('RECEIPT') || finding.startsWith('GOV\'T REVIEW') || finding.startsWith('RECOMMENDED')
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border px-4 py-3 text-xs leading-relaxed ${
                        isCompliant ? 'bg-green-50 border-green-200 text-green-800' :
                        isCritical ? 'bg-red-50 border-red-200 text-red-800' :
                        isWarning ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                        'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      {finding}
                    </div>
                  )
                })
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-600 leading-relaxed">
                  {notesRow.notes || 'No remarks available. Run "Compare to Contract" to generate AI-powered contractual guidance.'}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4 pt-3 border-t border-border">
              <button
                onClick={() => setNotesRow(null)}
                className="px-4 py-2 bg-black/[0.03] hover:bg-black/[0.06] border border-border rounded-lg text-sm text-steel transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
