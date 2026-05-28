/**
 * Deliverables Tracker v2 — Feature: Tracker (main grid)
 *
 * True spreadsheet view modeled on the "CSY Overdue" tab of the source
 * workbook.  Apple-aesthetic chrome but the data area itself is a dense
 * spreadsheet: visible gridlines, sticky header, narrow row height,
 * status cells filled with traffic-light colors, click-to-expand inline.
 */

import { useMemo, useState } from 'react'
import type { AnchorRecord, DRLRow } from '../../types'
import { logActivity } from '../../services/activityLog'
import type { WeeklySnapshot } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'
const GRID = '#ececef'
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

  const captureSnapshot = () => {
    const now = new Date()
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
    <div className="space-y-6">
      {/* ── Stat strip ──────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <StatTile label="Overdue"              value={totals.overdue}           tone="red"    icon="fa-circle-exclamation" />
        <StatTile label="Need Clarification"   value={totals.needClarification} tone="yellow" icon="fa-circle-question" />
        <StatTile label="Submitted / Received" value={totals.received}          tone="green"  icon="fa-circle-check" />
        <StatTile label="Not Yet Due"          value={totals.notYetDue}         tone="blue"   icon="fa-clock" />
      </div>

      {/* ── Toolbar ─────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{ border: `1px solid ${HAIRLINE}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
      >
        <div
          className="flex-1 min-w-[260px] flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: '#f5f5f7', border: `1px solid ${HAIRLINE}` }}
        >
          <i className="fas fa-magnifying-glass text-[11px] text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by DI number, title, or notes…"
            className="flex-1 bg-transparent text-[13px] focus:outline-none placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <i className="fas fa-circle-xmark text-[12px]" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: '#f5f5f7' }}>
          <FilterChip label="All"           count={rows.length}              active={statusFilter === 'all'}     onClick={() => setStatusFilter('all')} />
          <FilterChip label="Overdue"       count={totals.overdue}           active={statusFilter === 'red'}     onClick={() => setStatusFilter('red')}     tone="red" />
          <FilterChip label="Clarification" count={totals.needClarification} active={statusFilter === 'yellow'}  onClick={() => setStatusFilter('yellow')}  tone="yellow" />
          <FilterChip label="Received"      count={totals.received}          active={statusFilter === 'green'}   onClick={() => setStatusFilter('green')}   tone="green" />
          <FilterChip label="Pending"       count={totals.notYetDue}         active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} tone="blue" />
        </div>
        <button
          type="button"
          onClick={captureSnapshot}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-[13px] font-semibold transition active:scale-[0.98] shadow-sm"
          style={{ background: ACCENT }}
        >
          <i className="fas fa-camera text-[11px]" />
          Snapshot This Week
        </button>
      </div>

      {/* ── Spreadsheet ─────────────────────────────── */}
      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{ border: `1px solid ${HAIRLINE}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-separate border-spacing-0" style={{ minWidth: 1180 }}>
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 90 }} />
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 36 }} />
            </colgroup>
            <thead className="sticky top-0 z-10" style={{ background: '#f7f7f8' }}>
              <tr>
                <Th first>#</Th>
                <Th>DI Number</Th>
                <Th>Scope</Th>
                <Th>Title</Th>
                <Th>Contract Due</Th>
                <Th>Submittal Due</Th>
                <Th>Actual Submission</Th>
                <Th>Received</Th>
                <Th align="right">Days</Th>
                <Th>Status</Th>
                <Th last />
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => {
                const anchor = anchors[row.id]
                const isOpen = expanded === row.id
                const tone = STATUS_TONE[row.status]
                return (
                  <RowGroup key={row.id} open={isOpen}>
                    <tr
                      className="cursor-pointer hover:bg-[#fafafb] transition-colors"
                      onClick={() => setExpanded(isOpen ? null : row.id)}
                    >
                      <Td muted center>{i + 1}</Td>
                      <Td mono>
                        <span className="font-semibold text-gray-900">{row.diNumber}</span>
                        {anchor && (
                          <i className="fas fa-anchor ml-1.5 text-[9px] text-[#0071e3]" title="Anchored" />
                        )}
                      </Td>
                      <Td muted>
                        <span className="text-[11px] uppercase tracking-wide">
                          {row.scope === 'series' ? 'Series' : 'Per Hull'}
                        </span>
                      </Td>
                      <Td truncate title={row.title}>{stripLeading(row.title)}</Td>
                      <Td mono>{formatDate(row.contractDueFinish)}</Td>
                      <Td mono>{formatDate(row.submittalGuidance)}</Td>
                      <Td mono>{formatDate(row.actualSubmissionDate)}</Td>
                      <Td mono center>
                        <span className={row.received === 'Yes' ? 'text-[#0a7f3f] font-semibold' : 'text-gray-400'}>
                          {row.received}
                        </span>
                      </Td>
                      <Td mono align="right">{row.calendarDaysToReview || '—'}</Td>
                      <Td noPad>
                        <div
                          className="h-full px-3 py-2 flex items-center gap-2"
                          style={{ background: tone.bg }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tone.dot }} />
                          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: tone.text }}>
                            {STATUS_LABEL[row.status]}
                          </span>
                        </div>
                      </Td>
                      <Td center muted>
                        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-[9px]`} />
                      </Td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={11} style={{ background: '#fafafb', borderTop: `1px solid ${GRID}` }}>
                          <ExpandedDetail
                            row={row}
                            anchor={anchor}
                            actorName={actorName}
                            onAnchor={onAnchor}
                            onVerify={onVerify}
                            onReseal={onReseal}
                          />
                        </td>
                      </tr>
                    )}
                  </RowGroup>
                )
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-[13px] text-gray-500">
                    No deliverables match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div
          className="px-4 py-2.5 text-[11px] text-gray-500 flex items-center justify-between"
          style={{ background: '#f7f7f8', borderTop: `1px solid ${HAIRLINE}` }}
        >
          <span className="tabular-nums">
            Showing {visible.length} of {rows.length} deliverable{rows.length === 1 ? '' : 's'}
          </span>
          <span className="flex items-center gap-3 text-[11px]">
            <LegendDot tone="red"    label="Overdue" />
            <LegendDot tone="yellow" label="Clarification" />
            <LegendDot tone="green"  label="Received" />
            <LegendDot tone="blue"   label="Not Yet Due" />
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Tone tables ─────────────────────────────── */

type Tone = 'red' | 'yellow' | 'green' | 'blue'

const STATUS_TONE: Record<DRLRow['status'], { bg: string; text: string; dot: string; chip: string }> = {
  red:     { bg: '#fff1f1', text: '#b00020', dot: '#dc2626', chip: '#fee2e2' },
  yellow:  { bg: '#fff8e6', text: '#92400e', dot: '#d97706', chip: '#fef3c7' },
  green:   { bg: '#ecfdf3', text: '#0a7f3f', dot: '#16a34a', chip: '#dcfce7' },
  pending: { bg: '#eef6ff', text: '#0a4fa0', dot: '#0071e3', chip: '#dbeafe' },
}

const TONE_MAP: Record<Tone, { bg: string; text: string; dot: string; chip: string }> = {
  red:    STATUS_TONE.red,
  yellow: STATUS_TONE.yellow,
  green:  STATUS_TONE.green,
  blue:   STATUS_TONE.pending,
}

const STATUS_LABEL: Record<DRLRow['status'], string> = {
  red: 'Overdue',
  yellow: 'Clarification',
  green: 'Received',
  pending: 'Not Yet Due',
}

/* ─── Stat tile ───────────────────────────────── */

function StatTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: Tone
  icon: string
}) {
  const t = TONE_MAP[tone]
  return (
    <div
      className="rounded-2xl bg-white px-5 py-4 flex items-center gap-4 transition hover:shadow-md"
      style={{ border: `1px solid ${HAIRLINE}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
    >
      <span
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: t.chip, color: t.text }}
      >
        <i className={`fas ${icon} text-[15px]`} />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.08em] text-gray-500 font-semibold truncate">
          {label}
        </div>
        <div className="text-[28px] leading-none font-semibold tracking-[-0.02em] text-gray-900 tabular-nums mt-1">
          {value}
        </div>
      </div>
    </div>
  )
}

/* ─── Filter chip ─────────────────────────────── */

function FilterChip({
  label,
  count,
  active,
  onClick,
  tone,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  tone?: Tone
}) {
  const t = tone ? TONE_MAP[tone] : null
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition active:scale-[0.97]"
      style={{
        background: active ? '#fff' : 'transparent',
        color: active ? (t ? t.text : '#1f2937') : '#6b7280',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      {t && <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />}
      {label}
      <span
        className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] tabular-nums"
        style={{
          background: active ? (t ? t.chip : '#f3f4f6') : 'rgba(255,255,255,0.6)',
          color: active ? (t ? t.text : '#374151') : '#6b7280',
        }}
      >
        {count}
      </span>
    </button>
  )
}

/* ─── Table primitives ───────────────────────── */

function Th({
  children,
  first,
  last,
  align = 'left',
}: {
  children?: React.ReactNode
  first?: boolean
  last?: boolean
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <th
      className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500"
      style={{
        textAlign: align,
        borderBottom: `1px solid ${HAIRLINE}`,
        borderRight: last ? 'none' : `1px solid ${GRID}`,
        borderLeft: first ? 'none' : undefined,
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  mono,
  muted,
  center,
  truncate,
  noPad,
  align = 'left',
  title,
}: {
  children?: React.ReactNode
  mono?: boolean
  muted?: boolean
  center?: boolean
  truncate?: boolean
  noPad?: boolean
  align?: 'left' | 'right' | 'center'
  title?: string
}) {
  return (
    <td
      title={title}
      className={`${noPad ? '' : 'px-3 py-2'} text-[12px] ${mono ? 'tabular-nums' : ''} ${muted ? 'text-gray-500' : 'text-gray-900'} ${truncate ? 'max-w-0 truncate' : ''}`}
      style={{
        textAlign: center ? 'center' : align,
        borderTop: `1px solid ${GRID}`,
        borderRight: `1px solid ${GRID}`,
      }}
    >
      {children}
    </td>
  )
}

function RowGroup({ children }: { children: React.ReactNode; open: boolean }) {
  return <>{children}</>
}

/* ─── Expanded row body ──────────────────────── */

function ExpandedDetail({
  row,
  anchor,
  actorName,
  onAnchor,
  onVerify,
  onReseal,
}: {
  row: DRLRow
  anchor: AnchorRecord | undefined
  actorName: string
  onAnchor: (row: DRLRow) => void
  onVerify: (row: DRLRow) => void
  onReseal: (row: DRLRow) => Promise<void>
}) {
  return (
    <div className="px-6 py-5">
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Section label="Full title">
            <div className="text-[13px] text-gray-900">{row.title}</div>
          </Section>
          <Section label="Notes">
            <div className="text-[13px] text-gray-700 leading-relaxed">{row.notes}</div>
          </Section>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <Section label="Calculated due">
              <div className="text-[13px] text-gray-900">{row.calculatedDueDate}</div>
            </Section>
            <Section label="Review window">
              <div className="text-[13px] text-gray-900 tabular-nums">
                {row.calendarDaysToReview} calendar days
              </div>
            </Section>
          </div>
        </div>
        <div className="space-y-4">
          <Section label="Integrity actions">
            <div className="flex flex-wrap gap-2">
              <ActionPill
                icon="fa-anchor"
                label={anchor ? 'Re-anchor' : 'Anchor'}
                onClick={() => {
                  onAnchor(row)
                  logActivity({
                    actor: actorName,
                    kind: 'anchor',
                    feature: 'tracker',
                    summary: `Anchored ${row.diNumber}`,
                    rowId: row.id,
                  })
                }}
                primary
              />
              {anchor && (
                <ActionPill
                  icon="fa-shield-halved"
                  label="Verify"
                  onClick={() => {
                    onVerify(row)
                    logActivity({
                      actor: actorName,
                      kind: 'verify',
                      feature: 'tracker',
                      summary: `Verified ${row.diNumber}`,
                      rowId: row.id,
                    })
                  }}
                />
              )}
              {anchor && (
                <ActionPill
                  icon="fa-rotate"
                  label="Re-seal"
                  onClick={async () => {
                    await onReseal(row)
                    logActivity({
                      actor: actorName,
                      kind: 'anchor',
                      feature: 'tracker',
                      summary: `Re-sealed ${row.diNumber}`,
                      rowId: row.id,
                    })
                  }}
                />
              )}
            </div>
          </Section>
          {anchor && (
            <Section label="Anchor record">
              <div
                className="rounded-xl px-3 py-2.5 text-[11px] font-mono text-gray-700 break-all"
                style={{ background: '#f5f5f7', border: `1px solid ${HAIRLINE}` }}
              >
                {anchor.txHash || anchor.hash || '—'}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.1em] text-gray-400 font-semibold mb-1">
        {label}
      </div>
      {children}
    </div>
  )
}

function ActionPill({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: string
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition active:scale-[0.97]"
      style={
        primary
          ? { background: ACCENT, color: '#fff' }
          : { background: '#fff', color: '#1f2937', border: `1px solid ${HAIRLINE}` }
      }
    >
      <i className={`fas ${icon} text-[10px]`} />
      {label}
    </button>
  )
}

function LegendDot({ tone, label }: { tone: Tone; label: string }) {
  const t = TONE_MAP[tone]
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />
      {label}
    </span>
  )
}

/* ─── Helpers ─────────────────────────────────── */

function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  })
}

function stripLeading(title: string): string {
  return title.replace(/^DI-[\d-]+\s+/, '')
}
