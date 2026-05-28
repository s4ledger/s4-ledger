/**
 * Deliverables Tracker v2 — Feature: Analytics
 *
 * Trend metrics + per-week stacked bars + top offenders.
 * Apple aesthetic, light mode only, no charting library — pure SVG.
 */

import { useEffect, useMemo } from 'react'
import { logActivity } from '../../services/activityLog'
import type { AnalyticsSnapshot, AnalyticsMetric } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'

const SERIES_COLORS = {
  overdue: '#dc2626',
  needClarification: '#d97706',
  received: '#0a7f3f',
  notYetDue: '#0071e3',
}

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
    <div className="space-y-10">
      {/* ── Header ──────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white px-6 py-4 flex items-center justify-between"
        style={{ border: `1px solid ${HAIRLINE}` }}
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold">
            Last refreshed
          </div>
          <div className="text-[13px] text-gray-900">
            {new Date(snapshot.lastRefreshed).toLocaleString()}
          </div>
        </div>
        <span className="text-[12px] text-gray-500">
          Source: weekly Tracker snapshots
        </span>
      </div>

      {/* ── Metric cards ────────────────────────────── */}
      <section>
        <SectionTitle>Current vs. historical baseline</SectionTitle>
        <div className="grid grid-cols-4 gap-4">
          {snapshot.metrics.map(m => (
            <MetricCard key={m.label} metric={m} />
          ))}
        </div>
      </section>

      {/* ── Series chart ────────────────────────────── */}
      <section>
        <SectionTitle>Weekly trend</SectionTitle>
        <div
          className="rounded-2xl bg-white px-6 py-6"
          style={{ border: `1px solid ${HAIRLINE}` }}
        >
          <StackedBarChart series={snapshot.series} />
          <Legend />
        </div>
      </section>

      {/* ── Top offenders ───────────────────────────── */}
      <section>
        <SectionTitle>Top offenders</SectionTitle>
        <div
          className="rounded-2xl bg-white overflow-hidden"
          style={{ border: `1px solid ${HAIRLINE}` }}
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-gray-500">
                <th className="px-5 py-3 font-medium">DI Number</th>
                <th className="px-5 py-3 font-medium">Weeks overdue</th>
                <th className="px-5 py-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.topOffenders.map((o, i) => (
                <tr key={o.diNumber} style={{ borderTop: `1px solid ${HAIRLINE}` }}>
                  <td className="px-5 py-3.5 text-gray-900 font-semibold">{o.diNumber}</td>
                  <td className="px-5 py-3.5 text-gray-900 tabular-nums">
                    <span
                      className="inline-flex items-center justify-center min-w-[36px] px-2 py-1 rounded-full text-[11px] font-semibold"
                      style={{
                        background: i === 0 ? '#fff1f1' : '#fff4ea',
                        color: i === 0 ? '#b00020' : '#9a3412',
                      }}
                    >
                      {o.weeksOverdue}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 tabular-nums">{o.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/* ─── Sub-components ──────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold">
      {children}
    </div>
  )
}

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
    negative: { bg: '#fff1f1', text: '#b00020' },
    neutral:  { bg: '#f3f4f6', text: '#374151' },
  }[tone]
  return (
    <div
      className="rounded-2xl bg-white px-5 py-5"
      style={{ border: `1px solid ${HAIRLINE}` }}
    >
      <div className="text-[12px] text-gray-500 font-medium">{metric.label}</div>
      <div className="mt-2 text-[36px] leading-none font-semibold tracking-[-0.02em] text-gray-900 tabular-nums">
        {metric.current}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ background: colors.bg, color: colors.text }}
        >
          <i className={`fas ${trendIcon} text-[9px]`} />
          {metric.change > 0 ? '+' : ''}{metric.change} ({metric.pctChange > 0 ? '+' : ''}{metric.pctChange}%)
        </span>
        <span className="text-[11px] text-gray-500">vs {metric.historical} baseline</span>
      </div>
    </div>
  )
}

function StackedBarChart({ series }: { series: AnalyticsSnapshot['series'] }) {
  const max = useMemo(
    () => Math.max(...series.map(s => s.overdue + s.needClarification + s.received + s.notYetDue), 1),
    [series],
  )
  const W = 720
  const H = 220
  const PADDING = { top: 10, right: 10, bottom: 28, left: 32 }
  const innerW = W - PADDING.left - PADDING.right
  const innerH = H - PADDING.top - PADDING.bottom
  const barW = innerW / series.length * 0.7
  const gap = innerW / series.length * 0.3

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]">
      {/* Y axis ticks */}
      {[0, 0.5, 1].map(t => {
        const y = PADDING.top + innerH * (1 - t)
        const val = Math.round(max * t)
        return (
          <g key={t}>
            <line
              x1={PADDING.left}
              x2={W - PADDING.right}
              y1={y}
              y2={y}
              stroke={HAIRLINE}
              strokeDasharray="2 4"
            />
            <text
              x={PADDING.left - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="#9ca3af"
            >
              {val}
            </text>
          </g>
        )
      })}
      {series.map((s, i) => {
        const x = PADDING.left + i * (barW + gap) + gap / 2
        const total = s.overdue + s.needClarification + s.received + s.notYetDue
        const scale = (v: number) => (v / max) * innerH
        let y = PADDING.top + innerH
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
              return (
                <rect
                  key={j}
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  fill={seg.c}
                  rx={j === 0 ? 0 : j === segments.length - 1 ? 2 : 0}
                />
              )
            })}
            <text
              x={x + barW / 2}
              y={H - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#6b7280"
            >
              {s.weekEnding.slice(5)}
            </text>
            <text
              x={x + barW / 2}
              y={PADDING.top + innerH - scale(total) - 4}
              textAnchor="middle"
              fontSize="10"
              fill="#374151"
              fontWeight={600}
            >
              {total}
            </text>
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
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ background: it.color }}
          />
          {it.label}
        </div>
      ))}
    </div>
  )
}
