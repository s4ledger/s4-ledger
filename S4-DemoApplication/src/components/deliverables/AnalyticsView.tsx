/**
 * Deliverables Tracker v2 — Feature: Analytics
 *
 * Full analytics dashboard modelled on the workbook's "Analysis Dashboard"
 * tab.  Pure SVG charts, Apple aesthetic, light mode only.
 */

import { useEffect, useMemo } from 'react'
import { logActivity } from '../../services/activityLog'
import type { AnalyticsSnapshot, AnalyticsMetric } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'
const GRID = '#ececef'

const SERIES_COLORS = {
  overdue: '#dc2626',
  needClarification: '#d97706',
  received: '#16a34a',
  notYetDue: '#0071e3',
}

const RISK_TONE = {
  low:      { bg: '#dcfce7', text: '#166534', bar: '#16a34a' },
  medium:   { bg: '#fef3c7', text: '#92400e', bar: '#d97706' },
  high:     { bg: '#ffedd5', text: '#9a3412', bar: '#ea580c' },
  critical: { bg: '#fee2e2', text: '#991b1b', bar: '#dc2626' },
} as const

const KPI_TONE = {
  good: { bg: '#dcfce7', text: '#166534', dot: '#16a34a' },
  warn: { bg: '#fef3c7', text: '#92400e', dot: '#d97706' },
  crit: { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626' },
} as const

interface Props {
  snapshot: AnalyticsSnapshot
  actorName: string
}

export default function AnalyticsView({ snapshot, actorName }: Props) {
  useEffect(() => {
    logActivity({
      actor: actorName,
      kind: 'view',
      feature: 'analytics',
      summary: `Opened Analytics (${snapshot.series.length} weekly snapshots)`,
    })
  }, [actorName, snapshot.series.length])

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div
        className="rounded-2xl bg-white px-5 py-3.5 flex items-center justify-between"
        style={{ border: `1px solid ${HAIRLINE}` }}
      >
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-gray-400 font-semibold">Last refreshed</div>
            <div className="text-[13px] text-gray-900 tabular-nums">
              {new Date(snapshot.lastRefreshed).toLocaleString()}
            </div>
          </div>
          <div className="h-9 w-px" style={{ background: HAIRLINE }} />
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-gray-400 font-semibold">Data source</div>
            <div className="text-[13px] text-gray-900">
              Weekly tracker snapshots · {snapshot.series.length} weeks
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f5f5f7] text-[11px] text-gray-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
          Live
        </span>
      </div>

      {/* Metric cards */}
      <section>
        <SectionTitle>Current vs. historical baseline</SectionTitle>
        <div className="grid grid-cols-4 gap-3">
          {snapshot.metrics.map(m => (
            <MetricCard key={m.label} metric={m} />
          ))}
        </div>
      </section>

      {/* KPIs */}
      {snapshot.kpis && snapshot.kpis.length > 0 && (
        <section>
          <SectionTitle>Key performance indicators</SectionTitle>
          <div className="grid grid-cols-4 gap-3">
            {snapshot.kpis.map(k => (
              <KpiTile key={k.label} kpi={k} />
            ))}
          </div>
        </section>
      )}

      {/* Status distribution + Type breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {snapshot.statusDistribution && (
          <section>
            <SectionTitle>Status distribution · current vs historical</SectionTitle>
            <Card>
              <GroupedBarChart data={snapshot.statusDistribution} />
            </Card>
          </section>
        )}
        {snapshot.typeBreakdown && (
          <section>
            <SectionTitle>Series vs Per Hull</SectionTitle>
            <Card>
              <TypeBreakdownChart data={snapshot.typeBreakdown} />
            </Card>
          </section>
        )}
      </div>

      {/* Aging + Hull */}
      <div className="grid grid-cols-2 gap-4">
        {snapshot.aging && (
          <section>
            <SectionTitle>Aging analysis · overdue duration</SectionTitle>
            <Card>
              <AgingChart data={snapshot.aging} />
            </Card>
          </section>
        )}
        {snapshot.hulls && (
          <section>
            <SectionTitle>Hull-by-hull breakdown</SectionTitle>
            <Card>
              <HullChart data={snapshot.hulls} />
            </Card>
          </section>
        )}
      </div>

      {/* Weekly trend */}
      <section>
        <SectionTitle>Weekly trend</SectionTitle>
        <Card>
          <StackedBarChart series={snapshot.series} />
          <Legend />
        </Card>
      </section>

      {/* Priority items */}
      {snapshot.priorityItems && snapshot.priorityItems.length > 0 && (
        <section>
          <SectionTitle>High-priority items · sorted by risk score</SectionTitle>
          <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1px solid ${HAIRLINE}` }}>
            <table className="w-full text-[13px] border-separate border-spacing-0">
              <thead>
                <tr style={{ background: '#f7f7f8' }}>
                  <Th>#</Th>
                  <Th>Item</Th>
                  <Th>Scope</Th>
                  <Th>Status</Th>
                  <Th align="right">Days</Th>
                  <Th align="center">Risk</Th>
                  <Th>Recommended action</Th>
                </tr>
              </thead>
              <tbody>
                {snapshot.priorityItems.map(p => (
                  <tr key={p.rank} className="hover:bg-[#fafafb]">
                    <Td muted center>{p.rank}</Td>
                    <Td><span className="font-semibold text-gray-900">{p.title}</span></Td>
                    <Td muted>{p.scope}</Td>
                    <Td><StatusChip status={p.status} /></Td>
                    <Td mono align="right">{p.daysOverdue}</Td>
                    <Td center><RiskBadge risk={p.risk} /></Td>
                    <Td muted>{p.action}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Top offenders */}
      <section>
        <SectionTitle>Repeat offenders · longest standing</SectionTitle>
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1px solid ${HAIRLINE}` }}>
          <table className="w-full text-[13px] border-separate border-spacing-0">
            <thead>
              <tr style={{ background: '#f7f7f8' }}>
                <Th>DI Number</Th>
                <Th align="right">Weeks overdue</Th>
                <Th>Last seen</Th>
              </tr>
            </thead>
            <tbody>
              {snapshot.topOffenders.map((o, i) => (
                <tr key={o.diNumber} className="hover:bg-[#fafafb]">
                  <Td><span className="font-semibold text-gray-900">{o.diNumber}</span></Td>
                  <Td mono align="right">
                    <span
                      className="inline-flex items-center justify-center min-w-[36px] px-2 py-1 rounded-full text-[11px] font-semibold"
                      style={{
                        background: i === 0 ? '#fee2e2' : '#ffedd5',
                        color: i === 0 ? '#991b1b' : '#9a3412',
                      }}
                    >
                      {o.weeksOverdue}
                    </span>
                  </Td>
                  <Td mono muted>{o.lastSeen}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/* ─── Layout helpers ──────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold">
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-5" style={{ border: `1px solid ${HAIRLINE}` }}>
      {children}
    </div>
  )
}

function Th({ children, align = 'left' }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className="px-3 py-2 text-[10px] uppercase tracking-[0.08em] text-gray-500 font-semibold"
      style={{ textAlign: align, borderBottom: `1px solid ${GRID}` }}
    >
      {children}
    </th>
  )
}

function Td({
  children, mono, muted, center, align = 'left',
}: {
  children?: React.ReactNode
  mono?: boolean
  muted?: boolean
  center?: boolean
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <td
      className={`px-3 py-2.5 text-[12px] ${mono ? 'tabular-nums' : ''} ${muted ? 'text-gray-500' : 'text-gray-900'}`}
      style={{ textAlign: center ? 'center' : align, borderTop: `1px solid ${GRID}` }}
    >
      {children}
    </td>
  )
}

/* ─── Metric card ─────────────────────────────────── */

function MetricCard({ metric }: { metric: AnalyticsMetric }) {
  const trendIcon =
    metric.trend === 'up' ? 'fa-arrow-trend-up' :
    metric.trend === 'down' ? 'fa-arrow-trend-down' : 'fa-minus'
  const positive =
    (metric.label.includes('Received') && metric.trend === 'up') ||
    (!metric.label.includes('Received') && metric.trend === 'down')
  const tone = metric.change === 0 ? 'neutral' : positive ? 'positive' : 'negative'
  const colors = {
    positive: { bg: '#dcfce7', text: '#166534' },
    negative: { bg: '#fee2e2', text: '#991b1b' },
    neutral:  { bg: '#f3f4f6', text: '#374151' },
  }[tone]
  return (
    <div className="rounded-2xl bg-white px-5 py-4" style={{ border: `1px solid ${HAIRLINE}` }}>
      <div className="text-[11px] text-gray-500 font-medium truncate">{metric.label}</div>
      <div className="mt-1.5 text-[30px] leading-none font-semibold tracking-[-0.02em] text-gray-900 tabular-nums">
        {metric.current}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: colors.bg, color: colors.text }}
        >
          <i className={`fas ${trendIcon} text-[8px]`} />
          {metric.change > 0 ? '+' : ''}{metric.change} ({metric.pctChange > 0 ? '+' : ''}{metric.pctChange}%)
        </span>
        <span className="text-[10px] text-gray-500">vs {metric.historical}</span>
      </div>
    </div>
  )
}

/* ─── KPI tile ────────────────────────────────────── */

function KpiTile({ kpi }: { kpi: NonNullable<AnalyticsSnapshot['kpis']>[number] }) {
  const t = KPI_TONE[kpi.status]
  return (
    <div className="rounded-2xl bg-white px-4 py-3.5" style={{ border: `1px solid ${HAIRLINE}` }}>
      <div className="flex items-start justify-between">
        <div className="text-[11px] text-gray-500 font-medium truncate pr-2">{kpi.label}</div>
        <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: t.dot }} />
      </div>
      <div className="mt-1 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-900 tabular-nums">
        {kpi.value}
      </div>
      {kpi.note && (
        <div
          className="mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ background: t.bg, color: t.text }}
        >
          {kpi.note}
        </div>
      )}
    </div>
  )
}

/* ─── Grouped bar chart ───────────────────────────── */

function GroupedBarChart({ data }: { data: NonNullable<AnalyticsSnapshot['statusDistribution']> }) {
  const max = Math.max(...data.flatMap(d => [d.current, d.historical]), 1)
  const W = 480, H = 220
  const PAD = { top: 14, right: 14, bottom: 32, left: 32 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const groupW = innerW / data.length
  const barW = groupW * 0.32

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]">
        {[0, 0.5, 1].map(t => {
          const y = PAD.top + innerH * (1 - t)
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={HAIRLINE} strokeDasharray="2 4" />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
                {Math.round(max * t)}
              </text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const cx = PAD.left + i * groupW + groupW / 2
          const hCurrent = (d.current / max) * innerH
          const hHist = (d.historical / max) * innerH
          return (
            <g key={d.label}>
              <rect x={cx - barW - 2} y={PAD.top + innerH - hCurrent} width={barW} height={hCurrent} rx={2} fill={d.color} />
              <rect x={cx + 2} y={PAD.top + innerH - hHist} width={barW} height={hHist} rx={2} fill={d.color} opacity={0.3} />
              <text x={cx - barW / 2 - 2} y={PAD.top + innerH - hCurrent - 3} textAnchor="middle" fontSize="9" fontWeight={600} fill="#111827">{d.current}</text>
              <text x={cx + barW / 2 + 2} y={PAD.top + innerH - hHist - 3} textAnchor="middle" fontSize="9" fill="#6b7280">{d.historical}</text>
              <text x={cx} y={H - 14} textAnchor="middle" fontSize="10" fill="#374151" fontWeight={500}>{d.label}</text>
            </g>
          )
        })}
      </svg>
      <div className="flex items-center justify-center gap-5 mt-2 text-[11px] text-gray-600">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-700" /> Current</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300" /> Historical</span>
      </div>
    </div>
  )
}

/* ─── Type breakdown ──────────────────────────────── */

function TypeBreakdownChart({ data }: { data: NonNullable<AnalyticsSnapshot['typeBreakdown']> }) {
  const max = Math.max(...data.map(d => d.overdue + d.received + d.clarification), 1)
  const W = 480, H = 220
  const PAD = { top: 14, right: 14, bottom: 32, left: 32 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const barW = (innerW / data.length) * 0.55

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]">
        {[0, 0.5, 1].map(t => {
          const y = PAD.top + innerH * (1 - t)
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={HAIRLINE} strokeDasharray="2 4" />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
                {Math.round(max * t)}
              </text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const cx = PAD.left + (i + 0.5) * (innerW / data.length)
          const segments = [
            { v: d.overdue, c: SERIES_COLORS.overdue },
            { v: d.clarification, c: SERIES_COLORS.needClarification },
            { v: d.received, c: SERIES_COLORS.received },
          ]
          let y = PAD.top + innerH
          return (
            <g key={d.type}>
              {segments.map((seg, j) => {
                const h = (seg.v / max) * innerH
                y -= h
                return <rect key={j} x={cx - barW / 2} y={y} width={barW} height={h} fill={seg.c} rx={j === segments.length - 1 ? 2 : 0} />
              })}
              <text x={cx} y={PAD.top + innerH - (d.total / max) * innerH - 4} textAnchor="middle" fontSize="10" fontWeight={600} fill="#111827">{d.total}</text>
              <text x={cx} y={H - 14} textAnchor="middle" fontSize="10" fill="#374151" fontWeight={500}>{d.type}</text>
            </g>
          )
        })}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-gray-600 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES_COLORS.overdue }} /> Overdue</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES_COLORS.needClarification }} /> Clarification</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES_COLORS.received }} /> Received</span>
      </div>
    </div>
  )
}

/* ─── Aging chart ─────────────────────────────────── */

function AgingChart({ data }: { data: NonNullable<AnalyticsSnapshot['aging']> }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="space-y-2.5">
      {data.map(d => {
        const t = RISK_TONE[d.risk]
        const w = (d.count / max) * 100
        return (
          <div key={d.bucket}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-gray-700 font-medium">{d.bucket}</span>
              <span className="flex items-center gap-2 tabular-nums">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide" style={{ background: t.bg, color: t.text }}>
                  {d.risk}
                </span>
                <span className="text-gray-900 font-semibold">{d.count}</span>
                <span className="text-gray-400">· {Math.round(d.pct * 100)}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ background: '#f5f5f7' }}>
              <div className="h-2 rounded-full transition-all" style={{ width: `${w}%`, background: t.bar }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Hull chart ──────────────────────────────────── */

function HullChart({ data }: { data: NonNullable<AnalyticsSnapshot['hulls']> }) {
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div className="space-y-2.5">
      {data.map(d => {
        const segments = [
          { v: d.overdue, c: SERIES_COLORS.overdue },
          { v: d.clarification, c: SERIES_COLORS.needClarification },
          { v: d.received, c: SERIES_COLORS.received },
          { v: d.notYetDue, c: SERIES_COLORS.notYetDue },
        ]
        return (
          <div key={d.hull} className="flex items-center gap-3">
            <span className="w-16 text-[11px] font-semibold text-gray-700 shrink-0">{d.hull}</span>
            <div className="flex-1 h-6 rounded-md overflow-hidden flex" style={{ background: '#f5f5f7' }}>
              {segments.map((s, j) => {
                if (s.v === 0) return null
                const w = (s.v / max) * 100
                return (
                  <div
                    key={j}
                    className="h-full flex items-center justify-center text-[10px] font-semibold text-white"
                    style={{ width: `${w}%`, background: s.c }}
                    title={`${s.v}`}
                  >
                    {w > 8 ? s.v : ''}
                  </div>
                )
              })}
            </div>
            <span className="w-8 text-[11px] tabular-nums text-gray-900 font-semibold text-right">{d.total}</span>
          </div>
        )
      })}
      <div className="flex items-center justify-center gap-4 mt-3 pt-2 text-[10px] text-gray-600 flex-wrap" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: SERIES_COLORS.overdue }} /> Overdue</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: SERIES_COLORS.needClarification }} /> Clarification</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: SERIES_COLORS.received }} /> Received</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: SERIES_COLORS.notYetDue }} /> Not yet due</span>
      </div>
    </div>
  )
}

/* ─── Weekly trend ────────────────────────────────── */

function StackedBarChart({ series }: { series: AnalyticsSnapshot['series'] }) {
  const max = useMemo(
    () => Math.max(...series.map(s => s.overdue + s.needClarification + s.received + s.notYetDue), 1),
    [series],
  )
  const W = 720, H = 220
  const PAD = { top: 10, right: 10, bottom: 28, left: 32 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const barW = innerW / series.length * 0.7
  const gap = innerW / series.length * 0.3

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]">
      {[0, 0.5, 1].map(t => {
        const y = PAD.top + innerH * (1 - t)
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={HAIRLINE} strokeDasharray="2 4" />
            <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#9ca3af">{Math.round(max * t)}</text>
          </g>
        )
      })}
      {series.map((s, i) => {
        const x = PAD.left + i * (barW + gap) + gap / 2
        const total = s.overdue + s.needClarification + s.received + s.notYetDue
        const scale = (v: number) => (v / max) * innerH
        let y = PAD.top + innerH
        const segments = [
          { v: s.overdue, c: SERIES_COLORS.overdue },
          { v: s.needClarification, c: SERIES_COLORS.needClarification },
          { v: s.received, c: SERIES_COLORS.received },
          { v: s.notYetDue, c: SERIES_COLORS.notYetDue },
        ]
        return (
          <g key={s.weekEnding}>
            {segments.map((seg, j) => {
              const h = scale(seg.v)
              y -= h
              return <rect key={j} x={x} y={y} width={barW} height={h} fill={seg.c} rx={j === segments.length - 1 ? 2 : 0} />
            })}
            <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="#6b7280">{s.weekEnding.slice(5)}</text>
            <text x={x + barW / 2} y={PAD.top + innerH - scale(total) - 4} textAnchor="middle" fontSize="10" fill="#374151" fontWeight={600}>{total}</text>
          </g>
        )
      })}
    </svg>
  )
}

function Legend() {
  const items = [
    { label: 'Overdue', color: SERIES_COLORS.overdue },
    { label: 'Need Clarification', color: SERIES_COLORS.needClarification },
    { label: 'Received', color: SERIES_COLORS.received },
    { label: 'Not Yet Due', color: SERIES_COLORS.notYetDue },
  ]
  return (
    <div className="mt-4 flex items-center justify-center gap-5 flex-wrap">
      {items.map(it => (
        <div key={it.label} className="flex items-center gap-2 text-[12px] text-gray-600">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  )
}

/* ─── Status chip + risk badge ────────────────────── */

function StatusChip({ status }: { status: string }) {
  const s = status.toLowerCase()
  const tone =
    s.includes('overdue') ? { bg: '#fee2e2', text: '#991b1b' } :
    s.includes('clarif')  ? { bg: '#fef3c7', text: '#92400e' } :
    s.includes('receiv')  ? { bg: '#dcfce7', text: '#166534' } :
                            { bg: '#dbeafe', text: '#0a4fa0' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: tone.bg, color: tone.text }}
    >
      {status}
    </span>
  )
}

function RiskBadge({ risk }: { risk: number }) {
  const tone = risk >= 5 ? RISK_TONE.critical
            : risk === 4 ? RISK_TONE.high
            : risk === 3 ? RISK_TONE.medium
                         : RISK_TONE.low
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
      style={{ background: tone.bg, color: tone.text }}
    >
      {risk}
    </span>
  )
}
