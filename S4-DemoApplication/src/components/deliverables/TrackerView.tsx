/**
 * Deliverables Tracker v2 — Feature: Tracker (main grid)
 *
 * True spreadsheet view modeled on the "CSY Overdue" tab of the source
 * workbook.  Apple-aesthetic chrome but the data area itself is a dense
 * spreadsheet: visible gridlines, sticky header, narrow row height,
 * status cells filled with traffic-light colors, click-to-expand inline.
 */

import { useEffect, useMemo, useState } from 'react'
import type { DRLRow } from '../../types'
import { getActivityLog, logActivity, subscribe } from '../../services/activityLog'
import type { ActivityLogEntry, WeeklySnapshot } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'
const GRID = '#ececef'
const ACCENT = '#0071e3'

type StatusFilter = 'all' | DRLRow['status']

interface Props {
  rows: DRLRow[]
  actorName: string
  onSnapshot: (snap: WeeklySnapshot) => void
}

export default function TrackerView({
  rows,
  actorName,
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
                            actorName={actorName}
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
  actorName,
}: {
  row: DRLRow
  actorName: string
}) {
  // Subscribe to live activity log entries for this row + merge with demo audit history.
  const [, setTick] = useState(0)
  useEffect(() => subscribe(() => setTick(t => t + 1)), [])

  const timeline = useMemo<AuditEntry[]>(() => {
    const live: AuditEntry[] = getActivityLog()
      .filter(e => e.rowId === row.id)
      .map(toAuditEntry)
    const seeded = seedAuditFor(row)
    return [...live, ...seeded].sort((a, b) => b.ts.localeCompare(a.ts))
  }, [row])

  return (
    <div className="px-6 py-5">
      <div className="grid grid-cols-5 gap-6">
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
          <div className="flex gap-2 pt-1">
            <ActionPill
              icon="fa-pen"
              label="Log update"
              primary
              onClick={() => logActivity({
                actor: actorName,
                kind: 'edit',
                feature: 'tracker',
                summary: `Edited ${row.diNumber}`,
                rowId: row.id,
              })}
            />
            <ActionPill
              icon="fa-comment"
              label="Add comment"
              onClick={() => logActivity({
                actor: actorName,
                kind: 'comment',
                feature: 'tracker',
                summary: `Commented on ${row.diNumber}`,
                rowId: row.id,
              })}
            />
          </div>
        </div>
        <div className="col-span-3">
          <Section label={`Audit history · ${timeline.length} event${timeline.length === 1 ? '' : 's'}`}>
            <div
              className="rounded-xl bg-white max-h-[280px] overflow-y-auto"
              style={{ border: `1px solid ${HAIRLINE}` }}
            >
              {timeline.length === 0 ? (
                <div className="px-4 py-6 text-[12px] text-gray-500 text-center">
                  No audit events for this deliverable yet.
                </div>
              ) : (
                <ul>
                  {timeline.map((e, idx) => (
                    <li
                      key={e.id}
                      className="px-4 py-2.5 flex items-start gap-3"
                      style={{ borderTop: idx === 0 ? 'none' : `1px solid ${GRID}` }}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: AUDIT_TONE[e.kind].bg, color: AUDIT_TONE[e.kind].text }}
                      >
                        <i className={`fas ${AUDIT_TONE[e.kind].icon} text-[10px]`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-semibold text-gray-900">{e.summary}</span>
                          <span className="text-[10px] text-gray-400 tabular-nums shrink-0">
                            {formatAuditTs(e.ts)}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          <span className="font-medium text-gray-700">{e.actor}</span>
                          {e.detail && <span className="ml-1.5">· {e.detail}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

/* ─── Audit timeline helpers ─────────────── */

type AuditKind = 'created' | 'edit' | 'status-change' | 'comment' | 'snapshot' | 'view'

interface AuditEntry {
  id: string
  ts: string
  actor: string
  kind: AuditKind
  summary: string
  detail?: string
}

const AUDIT_TONE: Record<AuditKind, { bg: string; text: string; icon: string }> = {
  created:        { bg: '#e0f2fe', text: '#0369a1', icon: 'fa-plus' },
  edit:           { bg: '#ede9fe', text: '#6d28d9', icon: 'fa-pen' },
  'status-change':{ bg: '#fef3c7', text: '#92400e', icon: 'fa-flag' },
  comment:        { bg: '#f1f5f9', text: '#475569', icon: 'fa-comment' },
  snapshot:       { bg: '#dcfce7', text: '#166534', icon: 'fa-camera' },
  view:           { bg: '#f5f5f7', text: '#6b7280', icon: 'fa-eye' },
}

function toAuditEntry(e: ActivityLogEntry): AuditEntry {
  const mapKind: Record<string, AuditKind> = {
    edit: 'edit',
    'status-change': 'status-change',
    comment: 'comment',
    snapshot: 'snapshot',
    view: 'view',
    'action-response': 'edit',
  }
  return {
    id: e.id,
    ts: e.ts,
    actor: e.actor,
    kind: mapKind[e.kind] ?? 'edit',
    summary: e.summary,
  }
}

function seedAuditFor(row: DRLRow): AuditEntry[] {
  // Deterministic demo timeline for each row — builds a believable history.
  const seed: AuditEntry[] = [
    {
      id: `seed-${row.id}-1`,
      ts: '2026-04-03T09:12:00Z',
      actor: 'Program Office',
      kind: 'created',
      summary: `Deliverable opened`,
      detail: `Imported from contract DRL (${row.scope === 'series' ? 'Series' : 'Per Hull'})`,
    },
    {
      id: `seed-${row.id}-2`,
      ts: '2026-04-17T14:30:00Z',
      actor: 'Shipbuilder Lead',
      kind: 'status-change',
      summary: `Status set to ${labelForStatus(row.status)}`,
      detail: `Initial review window assigned`,
    },
  ]
  if (row.status === 'red' || row.status === 'yellow') {
    seed.push({
      id: `seed-${row.id}-3`,
      ts: '2026-05-08T10:45:00Z',
      actor: 'Program Office',
      kind: 'comment',
      summary: 'Follow-up requested',
      detail: 'Awaiting response from shipbuilder on outstanding items',
    })
  }
  if (row.actualSubmissionDate) {
    seed.push({
      id: `seed-${row.id}-4`,
      ts: `${row.actualSubmissionDate}T16:20:00Z`,
      actor: 'Shipbuilder Lead',
      kind: 'edit',
      summary: 'Submitted to program office',
      detail: row.calendarDaysToReview ? `Review window: ${row.calendarDaysToReview} days` : undefined,
    })
  }
  if (row.status === 'red') {
    seed.push({
      id: `seed-${row.id}-5`,
      ts: '2026-05-21T08:00:00Z',
      actor: 'Program Office',
      kind: 'status-change',
      summary: 'Flagged as overdue',
      detail: 'Auto-escalated by weekly cadence sweep',
    })
  }
  return seed
}

function labelForStatus(s: DRLRow['status']): string {
  return s === 'red' ? 'Overdue'
    : s === 'yellow' ? 'Needs Clarification'
    : s === 'green' ? 'Received'
    : 'Not Yet Due'
}

function formatAuditTs(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  } catch { return iso }
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
