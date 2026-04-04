import { useMemo } from 'react'
import { DRLRow, Contract, Program } from '../types'
import { programs, contracts, computeHealthStats, getContractById } from '../data/portfolioData'

interface Props {
  allData: DRLRow[]
  onSelectContract: (contractId: string) => void
  onViewAll: () => void
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

/* ─── Main PortfolioDashboard ──────────────────────────────── */
export default function PortfolioDashboard({ allData, onSelectContract, onViewAll, selectedContractId }: Props) {
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
    <div className="bg-gray-50 border-b border-gray-200">
      {/* ── Portfolio KPI Strip ── */}
      <div className="px-6 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Portfolio Dashboard</h2>
            <p className="text-xs text-gray-500">
              {programs.length} programs · {contracts.length} contracts · {allData.length} deliverables
            </p>
          </div>
          <button
            onClick={onViewAll}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              !selectedContractId
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Contracts
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
          <KPICard label="Total Items" value={portfolioStats.total} color="text-gray-900" />
          <KPICard label="Completed" value={portfolioStats.green} subtext={`${portfolioStats.completionRate}%`} color="text-emerald-600" />
          <KPICard label="Issues" value={portfolioStats.yellow} color="text-amber-600" />
          <KPICard label="Overdue" value={portfolioStats.red} subtext={`${portfolioStats.overdueRate}%`} color="text-red-600" />
          <KPICard label="Pending" value={portfolioStats.pending} color="text-slate-500" />
          <KPICard label="Contracts" value={contracts.filter(c => c.status === 'active').length} subtext="active" color="text-blue-600" />
        </div>

        <HealthBar stats={portfolioStats} />
      </div>

      {/* ── Contract Cards by Program ── */}
      <div className="px-6 pb-4">
        {programGroups.map(({ program, contracts: pgmContracts }) => (
          <div key={program.id} className="mb-3 last:mb-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{program.shortName}</span>
              <span className="text-xs text-gray-400">— {program.name}</span>
              <span className="text-xs text-gray-400 ml-auto">{pgmContracts.length} contract{pgmContracts.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
