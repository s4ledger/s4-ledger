/**
 * Deliverables Tracker v2 — Feature: Tracker (main grid)
 *
 * Apple-style data view modeled on the spreadsheet's "CSY Overdue" tab.
 * Light mode only.  Status chips use the spreadsheet key:
 *   Red    = Confirmed overdue
 *   Green  = Received / series deliverable / not per-hull
 *   Yellow = Needs clarification
 *   Blue   = Milestone shift — not yet due (pending in our model)
 */

import { useMemo, useState } from 'react'
import type { AnchorRecord, DRLRow } from '../../types'
import { logActivity } from '../../services/activityLog'
import type { WeeklySnapshot } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'
const ACCENT = '#0071e3'

type StatusFilter = 'all' | DRLRow['status']

interface Props {
  rows: DRLRow[]
  anchors: Record<string, AnchorRecord>
  actorName: string
  onAnchor: (row: DRLRow) => void
  onVerify: (row: DRLRow) => void
  onReseal: (row: DRLRow) => Promise<void>
  onSnapshot: (snap: WeeklySnapshot) => void
}

export default function TrackerView({
  rows,
  anchors,
  actorName,
  onAnchor,
  onVerify,
  onReseal,
  onSnapshot,
}: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  /* ─── Totals (drive the tile cards) ───────────────────── */
  const totals = useMemo(() => {
    const t = { overdue: 0, needClarification: 0, received: 0, notYetDue: 0 }
    for (const r of rows) {
      if (r.status === 'red') t.overdue++
      else if (r.status === 'yellow') t.needClarification++
      else if (r.status === 'green') t.received++
      else t.notYetDue++
    }
    return t
  }, [rows])

  /* ─── Filtered rows ───────────────────────────────────── */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.diNumber.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      )
    })
  }, [rows, search, statusFilter])

  /* ─── Snapshot ────────────────────────────────────────── */
  const captureSnapshot = () => {
    const now = new Date()
    // Week ending = next Friday (or today if Friday)
    const day = now.getDay()
    const daysUntilFri = (5 - day + 7) % 7
    const weekEnding = new Date(now)
    weekEnding.setDate(now.getDate() + daysUntilFri)
    const iso = weekEnding.toISOString().slice(0, 10)
    const snap: WeeklySnapshot = {
      weekEnding: iso,
      capturedAt: now.toISOString(),
      rows: rows.map(r => ({ ...r })),
      totals: { ...totals },
    }
    onSnapshot(snap)
    logActivity({
      actor: actorName,
      kind: 'snapshot',
      feature: 'tracker',
      summary: `Captured weekly snapshot for week ending ${iso} (${rows.length} rows)`,
      metadata: { totals },
    })
  }

  return (
    <div className="space-y-8">
      {/* ── Tile cards ─────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Overdue"            value={totals.overdue}           tone="red" />
        <StatTile label="Need Clarification" value={totals.needClarification} tone="yellow" />
        <StatTile label="Submitted / Received" value={totals.received}        tone="green" />
        <StatTile label="Not Yet Due"        value={totals.notYetDue}         tone="blue" />
      </div>

      {/* ── Filter bar ─────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div
          className="flex-1 flex items-center gap-2 rounded-full px-4 h-10 bg-white"
          style={{ border: `1px solid ${HAIRLINE}` }}
        >
          <i className="fas fa-magnifying-glass text-[12px] text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by DI number, title, or notes…"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="w-5 h-5 rounded-full text-gray-400 hover:bg-gray-100"
              aria-label="Clear search"
            >
              <i className="fas fa-xmark text-[10px]" />
            </button>
          )}
        </div>

        <FilterChip label="All"             active={statusFilter === 'all'}     onClick={() => setStatusFilter('all')} />
        <FilterChip label="Overdue"         active={statusFilter === 'red'}     onClick={() => setStatusFilter('red')}     tone="red" />
        <FilterChip label="Clarification"   active={statusFilter === 'yellow'}  onClick={() => setStatusFilter('yellow')}  tone="yellow" />
        <FilterChip label="Received"        active={statusFilter === 'green'}   onClick={() => setStatusFilter('green')}   tone="green" />
        <FilterChip label="Pending"         active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} tone="blue" />

        <button
          onClick={captureSnapshot}
          className="ml-2 flex items-center gap-2 h-10 px-4 rounded-full text-[13px] font-medium text-white transition hover:opacity-90"
          style={{ background: ACCENT }}
        >
          <i className="fas fa-camera text-[12px]" />
          Snapshot This Week
        </button>
      </div>

      {/* ── Data table ─────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{ border: `1px solid ${HAIRLINE}` }}
      >
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-gray-500">
              <Th>Deliverable</Th>
              <Th className="w-[88px]">Scope</Th>
              <Th className="w-[110px]">Contract Due</Th>
              <Th className="w-[180px]">Submittal Guidance</Th>
              <Th className="w-[120px]">Actual Submission</Th>
              <Th className="w-[80px]">Received</Th>
              <Th className="w-[80px]">Review (d)</Th>
              <Th className="w-[150px]">Status</Th>
              <Th className="w-[44px]"></Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-14 text-gray-400 text-[13px]">
                  No deliverables match your filters.
                </td>
              </tr>
            )}
            {visible.map(r => {
              const isOpen = expanded === r.id
              const anchored = !!anchors[r.id]
              return (
                <RowGroup
                  key={r.id}
                  row={r}
                  isOpen={isOpen}
                  anchored={anchored}
                  onToggle={() => setExpanded(isOpen ? null : r.id)}
                  onAnchor={() => {
                    onAnchor(r)
                    logActivity({
                      actor: actorName,
                      kind: 'anchor',
                      feature: 'tracker',
                      rowId: r.id,
                      summary: `Anchored "${r.title}"`,
                    })
                  }}
                  onVerify={() => {
                    onVerify(r)
                    logActivity({
                      actor: actorName,
                      kind: 'verify',
                      feature: 'tracker',
                      rowId: r.id,
                      summary: `Verified "${r.title}"`,
                    })
                  }}
                  onReseal={async () => {
                    await onReseal(r)
                    logActivity({
                      actor: actorName,
                      kind: 'edit',
                      feature: 'tracker',
                      rowId: r.id,
                      summary: `Re-sealed "${r.title}"`,
                    })
                  }}
                />
              )
            })}
          </tbody>
        </table>

        <div
          className="px-5 py-3 flex items-center justify-between text-[12px] text-gray-500"
          style={{ borderTop: `1px solid ${HAIRLINE}` }}
        >
          <span>
            Showing <span className="text-gray-900 font-medium">{visible.length}</span> of{' '}
            <span className="text-gray-900 font-medium">{rows.length}</span> deliverables
          </span>
          <span>
            Color key follows the source workbook: Red overdue · Yellow needs clarification ·
            Green received · Blue milestone shift
          </span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Pieces
   ═══════════════════════════════════════════════════════════ */

type Tone = 'red' | 'yellow' | 'green' | 'blue'

const TONE: Record<Tone, { text: string; bg: string; dot: string; chip: string }> = {
  red:    { text: '#b91c1c', bg: '#fff5f5', dot: '#ff3b30', chip: '#ffe5e5' },
  yellow: { text: '#92400e', bg: '#fffaf0', dot: '#ff9500', chip: '#fff0d6' },
  green:  { text: '#166534', bg: '#f0fdf4', dot: '#34c759', chip: '#dcfce7' },
  blue:   { text: '#1d4ed8', bg: '#eff6ff', dot: '#0a84ff', chip: '#dbeafe' },
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const t = TONE[tone]
  return (
    <div
      className="rounded-2xl bg-white px-6 py-5"
      style={{ border: `1px solid ${HAIRLINE}` }}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-gray-500 font-semibold">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />
        {label}
      </div>
      <div className="mt-2 text-[36px] font-semibold tracking-[-0.02em] text-gray-900 tabular-nums">
        {value}
      </div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
  tone,
}: {
  label: string
  active: boolean
  onClick: () => void
  tone?: Tone
}) {
  const t = tone ? TONE[tone] : null
  return (
    <button
      onClick={onClick}
      className="h-10 px-4 rounded-full text-[12px] font-medium transition"
      style={{
        background: active ? (t?.chip ?? '#f5f5f7') : 'white',
        color: active ? (t?.text ?? '#1f2937') : '#4b5563',
        border: `1px solid ${active && t ? t.chip : HAIRLINE}`,
      }}
    >
      {label}
    </button>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-5 py-3 font-semibold ${className ?? ''}`}
      style={{ borderBottom: `1px solid ${HAIRLINE}` }}
    >
      {children}
    </th>
  )
}

function statusTone(s: DRLRow['status']): Tone {
  switch (s) {
    case 'red':     return 'red'
    case 'yellow':  return 'yellow'
    case 'green':   return 'green'
    case 'pending':
    default:        return 'blue'
  }
}

function statusLabel(s: DRLRow['status']): string {
  switch (s) {
    case 'red':     return 'Overdue'
    case 'yellow':  return 'Need Clarification'
    case 'green':   return 'Received'
    case 'pending':
    default:        return 'Not Yet Due'
  }
}

function formatDate(value: string): string {
  if (!value) return '—'
  // accept ISO or already-pretty
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function RowGroup({
  row,
  isOpen,
  anchored,
  onToggle,
  onAnchor,
  onVerify,
  onReseal,
}: {
  row: DRLRow
  isOpen: boolean
  anchored: boolean
  onToggle: () => void
  onAnchor: () => void
  onVerify: () => void
  onReseal: () => Promise<void>
}) {
  const tone = statusTone(row.status)
  const t = TONE[tone]

  return (
    <>
      <tr
        className="cursor-pointer transition hover:bg-gray-50"
        onClick={onToggle}
      >
        <td className="px-5 py-3.5" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
          <div className="flex items-center gap-3">
            <span
              className="inline-block w-1 h-8 rounded-full shrink-0"
              style={{ background: t.dot }}
            />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-gray-900 truncate">{row.title}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {row.diNumber}
                {anchored && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-gray-400">
                    <i className="fas fa-anchor text-[9px]" /> anchored
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-5 py-3.5 text-[12px] text-gray-600" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
          {row.scope === 'series' ? 'Series' : row.scope === 'per-hull' ? 'Per Hull' : '—'}
        </td>
        <td className="px-5 py-3.5 text-[12px] text-gray-700 tabular-nums" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
          {formatDate(row.contractDueFinish)}
        </td>
        <td className="px-5 py-3.5 text-[12px] text-gray-600" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
          <span className="block truncate" title={row.submittalGuidance}>
            {row.submittalGuidance || '—'}
          </span>
        </td>
        <td className="px-5 py-3.5 text-[12px] text-gray-700 tabular-nums" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
          {formatDate(row.actualSubmissionDate)}
        </td>
        <td className="px-5 py-3.5 text-[12px] text-gray-700" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
          {row.received || '—'}
        </td>
        <td className="px-5 py-3.5 text-[12px] text-gray-700 tabular-nums" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
          {row.calendarDaysToReview ?? '—'}
        </td>
        <td className="px-5 py-3.5" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{ background: t.chip, color: t.text }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />
            {statusLabel(row.status)}
          </span>
        </td>
        <td className="px-5 py-3.5 text-gray-400" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-[10px]`} />
        </td>
      </tr>

      {isOpen && (
        <tr>
          <td colSpan={9} className="px-5 py-5 bg-[#fafafa]" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <div className="text-[11px] uppercase tracking-[0.08em] text-gray-500 font-semibold mb-2">
                  Notes
                </div>
                <div className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {row.notes || 'No notes recorded.'}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-gray-500 font-semibold mb-2">
                  Actions
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionPill icon="fa-anchor"        label={anchored ? 'Re-anchor' : 'Anchor'} onClick={onAnchor} />
                  <ActionPill icon="fa-shield-check"  label="Verify" onClick={onVerify} />
                  <ActionPill icon="fa-rotate"        label="Re-seal" onClick={() => { void onReseal() }} />
                </div>
                <div className="mt-3 text-[11px] text-gray-400">
                  Calculated due: <span className="text-gray-600 tabular-nums">{row.calculatedDueDate || '—'}</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function ActionPill({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className="flex items-center gap-2 h-8 px-3 rounded-full text-[12px] font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
      style={{ border: `1px solid ${HAIRLINE}` }}
    >
      <i className={`fas ${icon} text-[11px] text-gray-500`} />
      {label}
    </button>
  )
}
