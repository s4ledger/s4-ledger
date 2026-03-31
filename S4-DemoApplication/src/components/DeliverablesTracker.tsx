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

    const refs: Record<string, string> = {}
    const updatedData = [...data]

    const summary = await runContractComparison(data, (result: ComparisonResult, index: number) => {
      setCompareProgress(index + 1)
      refs[result.rowId] = result.contractRef
      // Update the row's notes and status
      updatedData[index] = {
        ...updatedData[index],
        notes: result.remarks,
        status: result.status,
      }
    })

    setContractRefs(refs)
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
            <button
              onClick={() => setCompareSummary(null)}
              className="text-steel hover:text-gray-900 transition-colors text-xs px-2"
            >
              <i className="fas fa-times"></i>
            </button>
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
                    <td className="px-3 py-3 font-medium text-gray-900">{row.title}</td>
                    <td
                      className="px-3 py-3 font-mono text-xs text-steel relative"
                      onMouseEnter={() => setHoveredDI(row.id)}
                      onMouseLeave={() => setHoveredDI(null)}
                    >
                      <span className="cursor-help border-b border-dashed border-steel/40">
                        {row.diNumber}
                      </span>
                      {hoveredDI === row.id && (contractRefs[row.id] || contractRequirements[row.id]) && (
                        <div className="absolute left-0 bottom-full mb-2 z-50 w-72 bg-[#1d1d1f] text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none">
                          <p className="font-semibold text-accent mb-1">
                            <i className="fas fa-file-contract mr-1"></i>
                            Contract Reference
                          </p>
                          <p className="leading-relaxed">
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
                    <td className="px-3 py-3 text-xs">{row.contractDueFinish}</td>
                    <td className="px-3 py-3 text-xs">{row.calculatedDueDate}</td>
                    <td className="px-3 py-3 text-xs text-steel">{row.submittalGuidance}</td>
                    <td className="px-3 py-3 text-xs">{row.actualSubmissionDate || '—'}</td>
                    <td className={`px-3 py-3 text-xs text-center font-semibold ${row.received === 'Yes' ? 'text-green-400' : 'text-red-400'}`}>
                      {row.received}
                    </td>
                    <td className="px-3 py-3 text-xs text-center">
                      {row.calendarDaysToReview !== null ? row.calendarDaysToReview : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-steel">{row.notes}</td>
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
    </div>
  )
}
