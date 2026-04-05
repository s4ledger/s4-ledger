import { useMemo } from 'react'
import { DRLRow, Contract, Program } from '../types'
import { programs, contracts, computeHealthStats, getContractById } from '../data/portfolioData'

interface Props {
  allData: DRLRow[]
  onSelectContract: (contractId: string) => void
  onViewAll: () => void
  onBack: () => void
  selectedContractId: string | null
}

/* ─── Status dot ───────────────────────────────────────────── */
function StatusDot({ status }: { status: 'green' | 'yellow' | 'red' | 'pending' }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-400',
    red: 'bg-red-500',
    pending: 'bg-slate-400',
  }
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] || colors.pending}`} />
}

/* ─── KPI Card ─────────────────────────────────────────────── */
function KPICard({ label, value, subtext, color }: { label: string; value: string | number; subtext?: string; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold mt-1 ${color}`}>{value}</span>
      {subtext && <span className="text-xs text-gray-400 mt-0.5">{subtext}</span>}
    </div>
  )
}

/* ─── Health bar (stacked green/yellow/red/pending) ──────── */
function HealthBar({ stats }: { stats: ReturnType<typeof computeHealthStats> }) {
  if (stats.total === 0) return <div className="h-2 bg-gray-100 rounded-full" />
  const pct = (n: number) => `${Math.round((n / stats.total) * 100)}%`
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
      {stats.green > 0 && <div className="bg-emerald-500" style={{ width: pct(stats.green) }} />}
      {stats.yellow > 0 && <div className="bg-amber-400" style={{ width: pct(stats.yellow) }} />}
      {stats.red > 0 && <div className="bg-red-500" style={{ width: pct(stats.red) }} />}
      {stats.pending > 0 && <div className="bg-slate-300" style={{ width: pct(stats.pending) }} />}
    </div>
  )
}

/* ─── SVG Donut Chart ──────────────────────────────────────── */
function DonutChart({ stats, size = 160 }: { stats: ReturnType<typeof computeHealthStats>; size?: number }) {
  const cx = size / 2
  const cy = size / 2
  const radius = (size - 24) / 2
  const circumference = 2 * Math.PI * radius

  if (stats.total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={18} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="text-sm font-semibold fill-gray-400">0</text>
      </svg>
    )
  }

  const segments = [
    { count: stats.green, color: '#10b981' },
    { count: stats.yellow, color: '#fbbf24' },
    { count: stats.red, color: '#ef4444' },
    { count: stats.pending, color: '#94a3b8' },
  ].filter(s => s.count > 0)

  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const pct = seg.count / stats.total
        const dash = pct * circumference
        const gap = circumference - dash
        const currentOffset = offset
        offset += dash
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={18}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-currentOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" className="text-2xl font-bold fill-gray-900">
        {stats.total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="central" className="text-[10px] fill-gray-400 uppercase tracking-wider">
        items
      </text>
    </svg>
  )
}

/* ─── Horizontal Bar Chart (per-contract comparison) ───────── */
function ContractBarChart({ dataByContract }: { dataByContract: Record<string, DRLRow[]> }) {
  const rows = contracts.map(c => ({
    contractNumber: c.contractNumber,
    shortTitle: c.title.length > 40 ? c.title.slice(0, 37) + '…' : c.title,
    stats: computeHealthStats(dataByContract[c.id] || []),
  }))

  const maxItems = Math.max(...rows.map(r => r.stats.total), 1)

  const categories = [
    { key: 'green' as const, label: 'Completed', color: '#10b981', bg: 'bg-emerald-500' },
    { key: 'yellow' as const, label: 'Issues', color: '#fbbf24', bg: 'bg-amber-400' },
    { key: 'red' as const, label: 'Overdue', color: '#ef4444', bg: 'bg-red-500' },
    { key: 'pending' as const, label: 'Pending', color: '#94a3b8', bg: 'bg-slate-400' },
  ]

  return (
    <div className="space-y-5">
      {rows.map((row, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-semibold text-gray-800">{row.contractNumber}</span>
            <span className="text-[10px] text-gray-400">{row.shortTitle}</span>
          </div>
          <div className="space-y-1.5">
            {categories.map(cat => {
              const count = row.stats[cat.key]
              const pct = maxItems > 0 ? (count / maxItems) * 100 : 0
              return (
                <div key={cat.key} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-[62px] text-right">{cat.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%`, backgroundColor: cat.color }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-5 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Contract Card ────────────────────────────────────────── */
function ContractCard({
  contract,
  rows,
  selected,
  onClick,
}: {
  contract: Contract
  rows: DRLRow[]
  selected: boolean
  onClick: () => void
}) {
  const stats = computeHealthStats(rows)
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-4 transition-all hover:shadow-md ${
        selected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{contract.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{contract.contractNumber}</p>
        </div>
        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${
          contract.status === 'active' ? 'bg-emerald-100 text-emerald-700'
            : contract.status === 'closeout' ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {contract.status}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span>{contract.contractor}</span>
        <span className="text-gray-300">|</span>
        <span>{contract.totalValue}</span>
      </div>

      <HealthBar stats={stats} />

      <div className="flex gap-3 mt-2 text-xs">
        <span className="flex items-center gap-1"><StatusDot status="green" /> {stats.green}</span>
        <span className="flex items-center gap-1"><StatusDot status="yellow" /> {stats.yellow}</span>
        <span className="flex items-center gap-1"><StatusDot status="red" /> {stats.red}</span>
        <span className="flex items-center gap-1"><StatusDot status="pending" /> {stats.pending}</span>
        <span className="ml-auto text-gray-400">{stats.total} items</span>
      </div>
    </button>
  )
}

/* ─── Main PortfolioDashboard (full-page) ──────────────────── */
export default function PortfolioDashboard({ allData, onSelectContract, onViewAll, onBack, selectedContractId }: Props) {
  // Group data by contract
  const dataByContract = useMemo(() => {
    const map: Record<string, DRLRow[]> = {}
    contracts.forEach(c => { map[c.id] = [] })
    allData.forEach(row => {
      const cid = row.contractId || 'CTR-001'
      if (!map[cid]) map[cid] = []
      map[cid].push(row)
    })
    return map
  }, [allData])

  // Overall portfolio stats
  const portfolioStats = useMemo(() => computeHealthStats(allData), [allData])

  // Group contracts by program
  const programGroups = useMemo(() => {
    return programs.map(p => ({
      program: p,
      contracts: contracts.filter(c => c.programId === p.id),
    }))
  }, [])

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900">
      {/* ── Top Bar with back button ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left text-xs"></i>
            Back to DRL Tracker
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <img src="/s4-assets/S4Ledger_logo.png" alt="S4 Ledger" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Portfolio Dashboard</h1>
              <p className="text-xs text-gray-500">
                {programs.length} program · {contracts.length} contracts · {allData.length} deliverables
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* ── KPI Strip + Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KPI Cards */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              <KPICard label="Total Items" value={portfolioStats.total} color="text-gray-900" />
              <KPICard label="Completed" value={portfolioStats.green} subtext={`${portfolioStats.completionRate}%`} color="text-emerald-600" />
              <KPICard label="Issues" value={portfolioStats.yellow} color="text-amber-600" />
              <KPICard label="Overdue" value={portfolioStats.red} subtext={`${portfolioStats.overdueRate}%`} color="text-red-600" />
              <KPICard label="Pending" value={portfolioStats.pending} color="text-slate-500" />
            </div>
            <HealthBar stats={portfolioStats} />

            {/* Contract status bar chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Deliverable Status by Contract</h3>
              <ContractBarChart dataByContract={dataByContract} />
            </div>
          </div>

          {/* Donut Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col items-center justify-center">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Overall Status Distribution</h3>
            <DonutChart stats={portfolioStats} size={180} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-5 text-xs">
              <span className="flex items-center gap-2"><StatusDot status="green" /> Completed ({portfolioStats.green})</span>
              <span className="flex items-center gap-2"><StatusDot status="yellow" /> Issues ({portfolioStats.yellow})</span>
              <span className="flex items-center gap-2"><StatusDot status="red" /> Overdue ({portfolioStats.red})</span>
              <span className="flex items-center gap-2"><StatusDot status="pending" /> Pending ({portfolioStats.pending})</span>
            </div>
          </div>
        </div>

        {/* ── Contract Cards by Program ── */}
        {programGroups.map(({ program, contracts: pgmContracts }) => (
          <div key={program.id}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">{program.shortName}</span>
              <span className="text-sm text-gray-500">— {program.name}</span>
              <span className="text-xs text-gray-400 ml-auto">{pgmContracts.length} contract{pgmContracts.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pgmContracts.map(contract => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  rows={dataByContract[contract.id] || []}
                  selected={selectedContractId === contract.id}
                  onClick={() => onSelectContract(contract.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
