/**
 * Deliverables Tracker v2 — Feature: Weekly Archive
 *
 * Timeline of weekly snapshots captured from the Tracker view.
 * Apple aesthetic, light mode only.
 */

import { useEffect, useMemo } from 'react'
import { logActivity } from '../../services/activityLog'
import type { WeeklySnapshot } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'

interface Props {
  snapshots: WeeklySnapshot[]
  actorName: string
}

export default function ArchiveView({ snapshots, actorName }: Props) {
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
        <SnapshotCard key={snap.weekEnding} snap={snap} latest={i === 0} />
      ))}
    </div>
  )
}

function SnapshotCard({ snap, latest }: { snap: WeeklySnapshot; latest: boolean }) {
  const total =
    snap.totals.overdue + snap.totals.needClarification + snap.totals.received + snap.totals.notYetDue
  return (
    <div
      className="rounded-2xl bg-white px-6 py-5 flex items-center gap-6"
      style={{ border: `1px solid ${HAIRLINE}` }}
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
      </div>
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
