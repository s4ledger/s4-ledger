/**
 * Deliverables Tracker v2 — Feature: Action Items
 *
 * Prioritized list of deliverables requiring Shipbuilder action, with an
 * expandable response sub-tracker (response text, planned resolution date,
 * POC, dates, receipt confirmation).  Apple aesthetic, light mode only.
 */

import { useEffect, useMemo, useState } from 'react'
import { logActivity } from '../../services/activityLog'
import type { ActionItem, ActionPriority } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'
const ACCENT = '#0071e3'

type FilterKey = 'all' | ActionPriority

interface Props {
  items: ActionItem[]
  actorName: string
}

export default function ActionItemsView({ items: initial, actorName }: Props) {
  const [items, setItems] = useState<ActionItem[]>(initial)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    logActivity({
      actor: actorName,
      kind: 'view',
      feature: 'actions',
      summary: `Opened Action Items (${initial.length} items)`,
    })
  }, [actorName, initial.length])

  const visible = useMemo(() => {
    if (filter === 'all') return items
    return items.filter(i => i.priority === filter)
  }, [items, filter])

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const i of items) c[i.priority]++
    return c
  }, [items])

  const updateResponse = (id: string, patch: Partial<ActionItem['response']>) => {
    setItems(curr =>
      curr.map(i =>
        i.id === id ? { ...i, response: { ...i.response, ...patch } } : i,
      ),
    )
    logActivity({
      actor: actorName,
      kind: 'action-response',
      feature: 'actions',
      summary: `Updated response for ${items.find(i => i.id === id)?.diTitle ?? id}`,
      rowId: id,
      metadata: { patch },
    })
  }

  return (
    <div className="space-y-8">
      {/* ── Priority filter bar ──────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          label="All"
          count={items.length}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterChip
          label="Critical"
          count={counts.critical}
          tone="red"
          active={filter === 'critical'}
          onClick={() => setFilter('critical')}
        />
        <FilterChip
          label="High"
          count={counts.high}
          tone="orange"
          active={filter === 'high'}
          onClick={() => setFilter('high')}
        />
        <FilterChip
          label="Medium"
          count={counts.medium}
          tone="yellow"
          active={filter === 'medium'}
          onClick={() => setFilter('medium')}
        />
        <FilterChip
          label="Low"
          count={counts.low}
          tone="gray"
          active={filter === 'low'}
          onClick={() => setFilter('low')}
        />
      </div>

      {/* ── Action items list ────────────────────────── */}
      <div className="space-y-3">
        {visible.map(item => (
          <ActionCard
            key={item.id}
            item={item}
            expanded={expanded === item.id}
            onToggle={() => {
              const next = expanded === item.id ? null : item.id
              setExpanded(next)
              if (next) {
                logActivity({
                  actor: actorName,
                  kind: 'view',
                  feature: 'actions',
                  summary: `Expanded action ${item.diTitle}`,
                  rowId: item.id,
                })
              }
            }}
            onUpdate={patch => updateResponse(item.id, patch)}
          />
        ))}
        {visible.length === 0 && (
          <div
            className="rounded-2xl bg-white px-6 py-10 text-center text-[13px] text-gray-500"
            style={{ border: `1px solid ${HAIRLINE}` }}
          >
            No action items match this filter.
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Filter chip ──────────────────────────────── */

type ChipTone = 'red' | 'orange' | 'yellow' | 'gray' | 'blue'
const CHIP_TONE: Record<ChipTone, { bg: string; text: string; activeBg: string }> = {
  red:    { bg: '#fff1f1', text: '#b00020', activeBg: '#b00020' },
  orange: { bg: '#fff4ea', text: '#9a3412', activeBg: '#c2410c' },
  yellow: { bg: '#fef3c7', text: '#92400e', activeBg: '#92400e' },
  gray:   { bg: '#f3f4f6', text: '#374151', activeBg: '#374151' },
  blue:   { bg: '#dbeafe', text: '#1d4ed8', activeBg: ACCENT },
}

function FilterChip({
  label,
  count,
  active,
  onClick,
  tone = 'blue',
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  tone?: ChipTone
}) {
  const t = CHIP_TONE[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-semibold transition active:scale-[0.98]"
      style={{
        background: active ? t.activeBg : t.bg,
        color: active ? '#fff' : t.text,
      }}
    >
      {label}
      <span
        className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] tabular-nums"
        style={{
          background: active ? 'rgba(255,255,255,0.25)' : '#fff',
          color: active ? '#fff' : t.text,
        }}
      >
        {count}
      </span>
    </button>
  )
}

/* ─── Action card ──────────────────────────────── */

const PRIORITY_TONE: Record<ActionPriority, { label: string; bg: string; text: string; dot: string }> = {
  critical: { label: 'Critical', bg: '#fff1f1', text: '#b00020', dot: '#dc2626' },
  high:     { label: 'High',     bg: '#fff4ea', text: '#9a3412', dot: '#ea580c' },
  medium:   { label: 'Medium',   bg: '#fef3c7', text: '#92400e', dot: '#d97706' },
  low:      { label: 'Low',      bg: '#f3f4f6', text: '#374151', dot: '#6b7280' },
}

function ActionCard({
  item,
  expanded,
  onToggle,
  onUpdate,
}: {
  item: ActionItem
  expanded: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<ActionItem['response']>) => void
}) {
  const p = PRIORITY_TONE[item.priority]
  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{ border: `1px solid ${HAIRLINE}` }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-[#fafafa] transition"
      >
        <span
          className="mt-1 w-2 h-2 rounded-full shrink-0"
          style={{ background: p.dot }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: p.bg, color: p.text }}
            >
              {p.label}
            </span>
            {item.daysOverdue > 0 && (
              <span className="text-[11px] text-red-600 font-semibold tabular-nums">
                {item.daysOverdue} days overdue
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[14px] font-semibold text-gray-900 truncate">
            {item.diTitle}
          </div>
          <div className="mt-1 text-[13px] text-gray-600">{item.issue}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">Due</div>
          <div className="text-[13px] text-gray-900 tabular-nums">{formatDate(item.dueDate)}</div>
          <i
            className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-[10px] text-gray-400 mt-2 inline-block`}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: HAIRLINE }}>
          <div className="grid grid-cols-2 gap-6 pt-4">
            {/* Left: PO context */}
            <div className="space-y-3">
              <Field label="Required action" value={item.requiredAction} />
              <Field label="Program Office notes" value={item.programOfficeNotes} muted />
            </div>
            {/* Right: Shipbuilder response sub-tracker */}
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold">
                Shipbuilder response
              </div>
              <Input
                label="Response"
                value={item.response.text}
                onChange={v => onUpdate({ text: v })}
                multiline
                placeholder="Describe planned response…"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Planned resolution"
                  type="date"
                  value={item.response.plannedResolutionDate ?? ''}
                  onChange={v => onUpdate({ plannedResolutionDate: v || null })}
                />
                <Input
                  label="POC"
                  value={item.response.poc}
                  onChange={v => onUpdate({ poc: v })}
                  placeholder="Name / role"
                />
                <Input
                  label="Date submitted"
                  type="date"
                  value={item.response.dateSubmitted ?? ''}
                  onChange={v => onUpdate({ dateSubmitted: v || null })}
                />
                <label className="flex items-center gap-2 pt-5 text-[13px] text-gray-700">
                  <input
                    type="checkbox"
                    checked={item.response.receiptConfirmed}
                    onChange={e => onUpdate({ receiptConfirmed: e.target.checked })}
                    className="accent-[#0071e3]"
                  />
                  Receipt confirmed
                </label>
              </div>
              <Input
                label="Notes"
                value={item.response.notes}
                onChange={v => onUpdate({ notes: v })}
                multiline
                placeholder="Internal notes…"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold mb-1">
        {label}
      </div>
      <div className={`text-[13px] leading-relaxed ${muted ? 'text-gray-600' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  multiline = false,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  multiline?: boolean
  placeholder?: string
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold mb-1">
        {label}
      </div>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
          style={{ background: '#fafafa', border: `1px solid ${HAIRLINE}` }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
          style={{ background: '#fafafa', border: `1px solid ${HAIRLINE}` }}
        />
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
