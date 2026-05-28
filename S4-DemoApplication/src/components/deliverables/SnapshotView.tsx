/**
 * Deliverables Tracker v2 — Feature: Prior Week Snapshot
 *
 * Side-by-side compare of current Tracker rows vs. the most recent archived
 * snapshot.  Apple aesthetic, light mode only.
 */

import { useEffect, useMemo } from 'react'
import { logActivity } from '../../services/activityLog'
import type { DRLRow } from '../../types'
import type { RowDiff, WeeklySnapshot } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'

interface Props {
  currentRows: DRLRow[]
  snapshots: WeeklySnapshot[]
  actorName: string
}

export default function SnapshotView({ currentRows, snapshots, actorName }: Props) {
  const prior = useMemo<WeeklySnapshot | null>(() => {
    const withRows = snapshots.filter(s => s.rows && s.rows.length > 0)
    if (withRows.length === 0) return null
    const sorted = [...withRows].sort((a, b) => b.weekEnding.localeCompare(a.weekEnding))
    // Skip the most recent if it's the same as current (today's)
    return sorted[sorted.length > 1 ? 1 : 0]
  }, [snapshots])

  const diffs = useMemo<RowDiff[]>(() => {
    if (!prior) return []
    return computeDiff(prior.rows, currentRows)
  }, [prior, currentRows])

  useEffect(() => {
    logActivity({
      actor: actorName,
      kind: 'view',
      feature: 'snapshot',
      summary: prior
        ? `Compared current vs. week ending ${prior.weekEnding} (${diffs.length} diffs)`
        : 'Opened Prior Week Snapshot (no prior snapshot available)',
    })
  }, [actorName, prior, diffs.length])

  if (!prior) {
    return (
      <div
        className="rounded-2xl bg-white px-6 py-12 text-center text-[13px] text-gray-500"
        style={{ border: `1px solid ${HAIRLINE}` }}
      >
        No prior snapshot with row-level data is available yet. Capture a snapshot from the Tracker
        view first.
      </div>
    )
  }

  const counts = {
    added: diffs.filter(d => d.kind === 'added').length,
    removed: diffs.filter(d => d.kind === 'removed').length,
    changed: diffs.filter(d => d.kind === 'changed').length,
    unchanged: diffs.filter(d => d.kind === 'unchanged').length,
  }

  return (
    <div className="space-y-8">
      {/* ── Compare header ──────────────────────────── */}
      <div
        className="rounded-2xl bg-white px-6 py-4 flex items-center justify-between"
        style={{ border: `1px solid ${HAIRLINE}` }}
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold">
            Comparing
          </div>
          <div className="text-[14px] text-gray-900">
            <span className="font-semibold">Current</span>{' '}
            <span className="text-gray-400">vs.</span>{' '}
            <span className="font-semibold">Week ending {prior.weekEnding}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DiffPill label="Added" count={counts.added} tone="green" />
          <DiffPill label="Removed" count={counts.removed} tone="red" />
          <DiffPill label="Changed" count={counts.changed} tone="yellow" />
          <DiffPill label="Unchanged" count={counts.unchanged} tone="gray" />
        </div>
      </div>

      {/* ── Diff list ───────────────────────────────── */}
      <div className="space-y-3">
        {diffs
          .filter(d => d.kind !== 'unchanged')
          .map(d => (
            <DiffRow key={`${d.kind}-${d.rowId}`} diff={d} />
          ))}
        {diffs.filter(d => d.kind !== 'unchanged').length === 0 && (
          <div
            className="rounded-2xl bg-white px-6 py-10 text-center text-[13px] text-gray-500"
            style={{ border: `1px solid ${HAIRLINE}` }}
          >
            No differences between current Tracker state and the prior snapshot.
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Diff helpers ──────────────────────────────── */

const COMPARE_FIELDS: (keyof DRLRow)[] = [
  'status',
  'actualSubmissionDate',
  'received',
  'notes',
  'contractDueFinish',
]

function computeDiff(prior: DRLRow[], current: DRLRow[]): RowDiff[] {
  const priorById = new Map(prior.map(r => [r.id, r]))
  const currentById = new Map(current.map(r => [r.id, r]))
  const out: RowDiff[] = []

  for (const c of current) {
    const p = priorById.get(c.id)
    if (!p) {
      out.push({ rowId: c.id, title: c.title, kind: 'added' })
      continue
    }
    const changes: NonNullable<RowDiff['changes']> = []
    for (const f of COMPARE_FIELDS) {
      if (p[f] !== c[f]) changes.push({ field: f, from: p[f], to: c[f] })
    }
    out.push({
      rowId: c.id,
      title: c.title,
      kind: changes.length > 0 ? 'changed' : 'unchanged',
      changes: changes.length > 0 ? changes : undefined,
    })
  }
  for (const p of prior) {
    if (!currentById.has(p.id)) {
      out.push({ rowId: p.id, title: p.title, kind: 'removed' })
    }
  }
  return out
}

/* ─── Sub-components ───────────────────────────── */

type Tone = 'red' | 'yellow' | 'green' | 'gray'
const TONE: Record<Tone, { bg: string; text: string; rail: string }> = {
  red:    { bg: '#fff5f5', text: '#b00020', rail: '#dc2626' },
  yellow: { bg: '#fffbeb', text: '#92400e', rail: '#d97706' },
  green:  { bg: '#f0fdf4', text: '#0a7f3f', rail: '#16a34a' },
  gray:   { bg: '#f3f4f6', text: '#374151', rail: '#9ca3af' },
}

const KIND_TONE: Record<RowDiff['kind'], Tone> = {
  added: 'green',
  removed: 'red',
  changed: 'yellow',
  unchanged: 'gray',
}

function DiffPill({ label, count, tone }: { label: string; count: number; tone: Tone }) {
  const t = TONE[tone]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
      style={{ background: t.bg, color: t.text }}
    >
      {label}
      <span className="tabular-nums">{count}</span>
    </span>
  )
}

function DiffRow({ diff }: { diff: RowDiff }) {
  const t = TONE[KIND_TONE[diff.kind]]
  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{ border: `1px solid ${HAIRLINE}` }}
    >
      <div className="flex items-stretch">
        <div className="w-1.5" style={{ background: t.rail }} />
        <div className="flex-1 px-5 py-4">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: t.bg, color: t.text }}
            >
              {diff.kind}
            </span>
            <span className="text-[14px] font-semibold text-gray-900 truncate">{diff.title}</span>
          </div>
          {diff.changes && diff.changes.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {diff.changes.map((c, i) => (
                <div key={i} className="text-[12px] flex items-baseline gap-2">
                  <span className="text-gray-400 uppercase tracking-wide font-semibold min-w-[120px]">
                    {String(c.field)}
                  </span>
                  <span className="text-gray-500 line-through">{display(c.from)}</span>
                  <i className="fas fa-arrow-right text-[9px] text-gray-300" />
                  <span className="text-gray-900 font-medium">{display(c.to)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function display(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}
