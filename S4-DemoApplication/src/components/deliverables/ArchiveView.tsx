/**
 * Deliverables Tracker v2 — Feature: Weekly Archive
 *
 * Timeline of weekly snapshots captured from the Tracker view.
 * Each card is clickable and reveals the full spreadsheet exactly as it
 * looked that week — so reviewers can see deliverable status over time.
 * Apple aesthetic, light mode only.
 */

import { useEffect, useMemo, useState } from 'react'
import { logActivity } from '../../services/activityLog'
import type { DRLRow } from '../../types'
import type { WeeklySnapshot } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'
const GRID     = '#ececef'

interface Props {
  snapshots: WeeklySnapshot[]
  actorName: string
}

export default function ArchiveView({ snapshots, actorName }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    logActivity({
      actor: actorName,
      kind: 'view',
      feature: 'archive',
      summary: `Opened Weekly Archive (${snapshots.length} snapshots)`,
    })
  }, [actorName, snapshots.length])

  // Sort newest first
  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => b.weekEnding.localeCompare(a.weekEnding)),
    [snapshots],
  )

  const toggle = (weekEnding: string) => {
    const next = expanded === weekEnding ? null : weekEnding
    setExpanded(next)
    if (next) {
      logActivity({
        actor: actorName,
        kind: 'view',
        feature: 'archive',
        summary: `Inspected snapshot for week ending ${weekEnding}`,
      })
    }
  }

  if (sorted.length === 0) {
    return (
      <div
        className="rounded-2xl bg-white px-6 py-12 text-center text-[13px] text-gray-500"
        style={{ border: `1px solid ${HAIRLINE}` }}
      >
        No snapshots captured yet. Use “Snapshot This Week” in the Tracker view.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sorted.map((snap, i) => (
        <SnapshotCard
          key={snap.weekEnding}
          snap={snap}
          latest={i === 0}
          expanded={expanded === snap.weekEnding}
          onToggle={() => toggle(snap.weekEnding)}
        />
      ))}
    </div>
  )
}

function SnapshotCard({
  snap,
  latest,
  expanded,
  onToggle,
}: {
  snap: WeeklySnapshot
  latest: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const total =
    snap.totals.overdue + snap.totals.needClarification + snap.totals.received + snap.totals.notYetDue
  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{ border: `1px solid ${HAIRLINE}` }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center gap-6 text-left transition hover:bg-gray-50"
        aria-expanded={expanded}
      >
        <div className="shrink-0">
          <div className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold">
            Week ending
          </div>
          <div className="text-[20px] font-semibold tracking-tight text-gray-900 tabular-nums">
            {snap.weekEnding}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            Captured {new Date(snap.capturedAt).toLocaleDateString()}
          </div>
          {latest && (
            <span
              className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: '#dbeafe', color: '#1d4ed8' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
              Latest
            </span>
          )}
        </div>

        <div className="flex-1 grid grid-cols-4 gap-3">
          <Cell label="Overdue" value={snap.totals.overdue} tone="red" />
          <Cell label="Need Clarification" value={snap.totals.needClarification} tone="yellow" />
          <Cell label="Received" value={snap.totals.received} tone="green" />
          <Cell label="Not Yet Due" value={snap.totals.notYetDue} tone="blue" />
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold">
            Rows
          </div>
          <div className="text-[18px] font-semibold text-gray-900 tabular-nums">
            {snap.rows.length || total}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 flex items-center justify-end gap-1">
            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-[9px]`} />
            {expanded ? 'Hide' : 'Open'} spreadsheet
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${HAIRLINE}` }}>
          <HistoricalSpreadsheet rows={snap.rows} weekEnding={snap.weekEnding} />
        </div>
      )}
    </div>
  )
}

type Tone = 'red' | 'yellow' | 'green' | 'blue'
const TONE: Record<Tone, { bg: string; text: string; dot: string }> = {
  red:    { bg: '#fff5f5', text: '#b00020', dot: '#dc2626' },
  yellow: { bg: '#fffbeb', text: '#92400e', dot: '#d97706' },
  green:  { bg: '#f0fdf4', text: '#0a7f3f', dot: '#16a34a' },
  blue:   { bg: '#eef6ff', text: '#0a4fa0', dot: '#0071e3' },
}

function Cell({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const t = TONE[tone]
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: t.bg, border: `1px solid ${HAIRLINE}` }}
    >
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />
        <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: t.text }}>
          {label}
        </span>
      </div>
      <div className="mt-1 text-[20px] font-semibold tabular-nums text-gray-900">{value}</div>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────
   Read-only spreadsheet — exact-look snapshot of that week
   ─────────────────────────────────────────────────────────── */

const STATUS_TONE: Record<DRLRow['status'], { bg: string; text: string; dot: string; label: string }> = {
  red:     { bg: '#fff5f5', text: '#b00020', dot: '#dc2626', label: 'Overdue' },
  yellow:  { bg: '#fffbeb', text: '#92400e', dot: '#d97706', label: 'Needs Clarification' },
  green:   { bg: '#f0fdf4', text: '#0a7f3f', dot: '#16a34a', label: 'Received' },
  pending: { bg: '#eef6ff', text: '#0a4fa0', dot: '#0071e3', label: 'Not Yet Due' },
}

function HistoricalSpreadsheet({
  rows,
  weekEnding,
}: {
  rows: DRLRow[]
  weekEnding: string
}) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-[12px] text-gray-500 bg-gray-50">
        No row-level detail captured for this week.
      </div>
    )
  }
  return (
    <div className="bg-white">
      <div
        className="px-6 py-3 text-[11px] uppercase tracking-[0.12em] text-gray-500 font-semibold"
        style={{ background: '#fafafa', borderBottom: `1px solid ${HAIRLINE}` }}
      >
        Spreadsheet as of {weekEnding} · {rows.length} deliverables (read-only)
      </div>
      <div className="overflow-x-auto">
        <table
          className="w-full text-[12px] tabular-nums"
          style={{ borderCollapse: 'separate', borderSpacing: 0 }}
        >
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
            <col style={{ width: 150 }} />
          </colgroup>
          <thead>
            <tr className="text-left text-gray-600" style={{ background: '#f7f7f8' }}>
              <Th>#</Th>
              <Th>DI Number</Th>
              <Th>Scope</Th>
              <Th>Title</Th>
              <Th>Contract Due</Th>
              <Th>Submittal Guidance</Th>
              <Th>Actual Submission</Th>
              <Th>Received</Th>
              <Th>Days</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const tone = STATUS_TONE[r.status]
              return (
                <tr
                  key={r.id}
                  style={{
                    background: tone.bg,
                    borderBottom: `1px solid ${GRID}`,
                  }}
                >
                  <Td>{idx + 1}</Td>
                  <Td className="font-semibold text-gray-900">{r.diNumber}</Td>
                  <Td>{r.scope ?? 'per-hull'}</Td>
                  <Td className="text-gray-900">{r.title}</Td>
                  <Td>{r.contractDueFinish || '—'}</Td>
                  <Td>{r.submittalGuidance || '—'}</Td>
                  <Td>{r.actualSubmissionDate || '—'}</Td>
                  <Td>{r.received || '—'}</Td>
                  <Td>{r.calendarDaysToReview ?? '—'}</Td>
                  <Td>
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: '#ffffff', color: tone.text, border: `1px solid ${HAIRLINE}` }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
                      {tone.label}
                    </span>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-3 py-2 text-[10px] uppercase tracking-wide font-semibold"
      style={{ borderRight: `1px solid ${GRID}`, borderBottom: `1px solid ${HAIRLINE}` }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td
      className={`px-3 py-1.5 align-middle text-gray-700 ${className}`}
      style={{ borderRight: `1px solid ${GRID}` }}
    >
      {children}
    </td>
  )
}
