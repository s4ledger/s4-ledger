/**
 * Deliverables Tracker v2 — Feature: Executive Brief
 *
 * Weekly program-office status snapshot.  Mirrors the spreadsheet's
 * "Executive Brief" tab.  Apple aesthetic, light mode only.
 */

import { useEffect } from 'react'
import { logActivity } from '../../services/activityLog'
import type { ExecutiveBrief, KPI } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'
const ACCENT = '#0071e3'

interface Props {
  brief: ExecutiveBrief
  actorName: string
}

export default function ExecutiveBriefView({ brief, actorName }: Props) {
  useEffect(() => {
    logActivity({
      actor: actorName,
      kind: 'view',
      feature: 'executive',
      summary: `Opened Executive Brief (week ending ${brief.weekEnding})`,
    })
  }, [actorName, brief.weekEnding])

  return (
    <div className="space-y-10">
      {/* ── Header strip ─────────────────────────────── */}
      <div
        className="flex items-center justify-between rounded-2xl bg-white px-6 py-5"
        style={{ border: `1px solid ${HAIRLINE}` }}
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold">
            Report period
          </div>
          <div className="mt-1 text-[15px] font-semibold text-gray-900">
            Week ending {formatDate(brief.weekEnding)}
          </div>
          <div className="text-[12px] text-gray-500">
            Generated {formatDate(brief.reportDate)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            window.print()
            logActivity({
              actor: actorName,
              kind: 'export',
              feature: 'executive',
              summary: 'Triggered print/export of Executive Brief',
            })
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-[13px] font-semibold transition active:scale-[0.98]"
          style={{ background: ACCENT }}
        >
          <i className="fas fa-print text-[11px]" />
          Print / Export
        </button>
      </div>

      {/* ── Health tiles ────────────────────────────── */}
      <section className="grid grid-cols-3 gap-4">
        <HealthTile
          label="Overdue"
          value={brief.totals.overdue}
          tone="red"
          icon="fa-circle-exclamation"
        />
        <HealthTile
          label="Need Clarification"
          value={brief.totals.needClarification}
          tone="yellow"
          icon="fa-circle-question"
        />
        <HealthTile
          label="Submitted / Received"
          value={brief.totals.received}
          tone="green"
          icon="fa-circle-check"
        />
      </section>

      {/* ── KPI table ───────────────────────────────── */}
      <section>
        <SectionTitle>Key performance indicators</SectionTitle>
        <div
          className="overflow-hidden rounded-2xl bg-white"
          style={{ border: `1px solid ${HAIRLINE}` }}
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-gray-500">
                <th className="px-5 py-3 font-medium">Metric</th>
                <th className="px-5 py-3 font-medium">Current</th>
                <th className="px-5 py-3 font-medium">Prior week</th>
                <th className="px-5 py-3 font-medium">Change</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {brief.kpis.map((k, i) => (
                <KpiRow key={k.metric} kpi={k} last={i === brief.kpis.length - 1} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Escalations ─────────────────────────────── */}
      <section>
        <SectionTitle>Critical items requiring escalation</SectionTitle>
        <div className="space-y-3">
          {brief.escalations.map((e, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl bg-white px-5 py-4"
              style={{ border: `1px solid ${HAIRLINE}` }}
            >
              <span
                className="mt-1 w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#fff1f1', color: '#b00020' }}
              >
                <i className="fas fa-triangle-exclamation text-[12px]" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-gray-900 truncate">
                  {e.deliverable}
                </div>
                <div className="mt-1 text-[13px] text-gray-600">{e.requiredAction}</div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: '#fff1f1', color: '#b00020' }}
                >
                  {e.daysOverdue} days overdue
                </span>
                <span className="text-[11px] text-gray-500">{e.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Weekly narrative ────────────────────────── */}
      <section>
        <SectionTitle>Weekly status narrative</SectionTitle>
        <div className="grid grid-cols-3 gap-4">
          <NarrativePanel
            label="Progress"
            tone="green"
            icon="fa-circle-check"
            items={brief.progressThisWeek}
          />
          <NarrativePanel
            label="Concerns"
            tone="yellow"
            icon="fa-triangle-exclamation"
            items={brief.concerns}
          />
          <NarrativePanel
            label="Recommended actions"
            tone="blue"
            icon="fa-bullseye"
            items={brief.recommendedActions}
          />
        </div>
      </section>
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold">
      {children}
    </div>
  )
}

type Tone = 'red' | 'yellow' | 'green' | 'blue' | 'neutral'

const TONE: Record<Tone, { bg: string; text: string; chip: string; chipText: string }> = {
  red:     { bg: '#fff5f5', text: '#b00020', chip: '#fff1f1', chipText: '#b00020' },
  yellow:  { bg: '#fffbeb', text: '#92400e', chip: '#fef3c7', chipText: '#92400e' },
  green:   { bg: '#f0fdf4', text: '#0a7f3f', chip: '#dcfce7', chipText: '#166534' },
  blue:    { bg: '#eef6ff', text: '#0a4fa0', chip: '#dbeafe', chipText: '#1d4ed8' },
  neutral: { bg: '#f5f5f7', text: '#374151', chip: '#f3f4f6', chipText: '#374151' },
}

function HealthTile({
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
  const t = TONE[tone]
  return (
    <div
      className="rounded-2xl bg-white px-6 py-6 flex items-start justify-between"
      style={{ border: `1px solid ${HAIRLINE}` }}
    >
      <div>
        <div className="text-[12px] text-gray-500 font-medium">{label}</div>
        <div className="mt-2 text-[44px] leading-none font-semibold tracking-[-0.02em] text-gray-900 tabular-nums">
          {value}
        </div>
      </div>
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: t.chip, color: t.chipText }}
      >
        <i className={`fas ${icon} text-[14px]`} />
      </span>
    </div>
  )
}

function KpiRow({ kpi, last }: { kpi: KPI; last: boolean }) {
  const toneMap: Record<KPI['statusTone'], Tone> = {
    positive: 'green',
    negative: 'red',
    neutral: 'neutral',
  }
  const t = TONE[toneMap[kpi.statusTone]]
  const arrow =
    kpi.trend === 'up' ? 'fa-arrow-trend-up' :
    kpi.trend === 'down' ? 'fa-arrow-trend-down' : 'fa-minus'
  return (
    <tr
      style={{ borderTop: `1px solid ${HAIRLINE}` }}
      className={last ? '' : ''}
    >
      <td className="px-5 py-3.5 text-gray-900 font-medium">{kpi.metric}</td>
      <td className="px-5 py-3.5 text-gray-900 tabular-nums">{kpi.current}</td>
      <td className="px-5 py-3.5 text-gray-500 tabular-nums">{kpi.prior}</td>
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-gray-700 tabular-nums">
          <i className={`fas ${arrow} text-[10px] text-gray-400`} />
          {kpi.changeLabel}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: t.chip, color: t.chipText }}
        >
          {kpi.statusLabel}
        </span>
      </td>
    </tr>
  )
}

function NarrativePanel({
  label,
  tone,
  icon,
  items,
}: {
  label: string
  tone: Tone
  icon: string
  items: string[]
}) {
  const t = TONE[tone]
  return (
    <div
      className="rounded-2xl px-5 py-5"
      style={{ background: t.bg, border: `1px solid ${HAIRLINE}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <i className={`fas ${icon} text-[12px]`} style={{ color: t.text }} />
        <span className="text-[12px] uppercase tracking-[0.1em] font-semibold" style={{ color: t.text }}>
          {label}
        </span>
      </div>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="text-[13px] text-gray-800 leading-relaxed flex gap-2">
            <span className="text-gray-400 mt-1.5">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
