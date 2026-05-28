/**
 * Deliverables Tracker v2 — Feature: Submittal Schedule
 *
 * Reference catalog of expected deliverables per DI.  Filterable by cadence
 * and scope.  Apple aesthetic, light mode only.
 */

import { useEffect, useMemo, useState } from 'react'
import { logActivity } from '../../services/activityLog'
import type { SubmittalCadence, SubmittalScheduleEntry } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'
const ACCENT = '#0071e3'

const CADENCES: SubmittalCadence[] = [
  'Quarterly', 'Monthly', 'Annually', 'Per IPR', 'Per DR', 'Per Hull', 'One-Time', 'As Required',
]

interface Props {
  entries: SubmittalScheduleEntry[]
  actorName: string
}

export default function ScheduleView({ entries, actorName }: Props) {
  const [search, setSearch] = useState('')
  const [cadence, setCadence] = useState<SubmittalCadence | 'all'>('all')

  useEffect(() => {
    logActivity({
      actor: actorName,
      kind: 'view',
      feature: 'schedule',
      summary: `Opened Submittal Schedule (${entries.length} catalog entries)`,
    })
  }, [actorName, entries.length])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      if (cadence !== 'all' && e.cadence !== cadence) return false
      if (!q) return true
      return (
        e.diListing.toLowerCase().includes(q) ||
        e.deliverable.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
      )
    })
  }, [entries, search, cadence])

  return (
    <div className="space-y-6">
      {/* ── Filter bar ──────────────────────────────── */}
      <div
        className="rounded-2xl bg-white px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{ border: `1px solid ${HAIRLINE}` }}
      >
        <div className="flex-1 min-w-[240px] flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fafafa]" style={{ border: `1px solid ${HAIRLINE}` }}>
          <i className="fas fa-magnifying-glass text-[11px] text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by DI, deliverable, or notes…"
            className="flex-1 bg-transparent text-[13px] focus:outline-none"
          />
        </div>
        <select
          value={cadence}
          onChange={e => setCadence(e.target.value as SubmittalCadence | 'all')}
          className="px-3 py-1.5 rounded-full text-[12px] bg-[#fafafa] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
          style={{ border: `1px solid ${HAIRLINE}` }}
        >
          <option value="all">All cadences</option>
          {CADENCES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {visible.length} of {entries.length}
        </span>
      </div>

      {/* ── Table ───────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{ border: `1px solid ${HAIRLINE}` }}
      >
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-gray-500">
              <th className="px-5 py-3 font-medium">DI Listing</th>
              <th className="px-5 py-3 font-medium">Deliverable</th>
              <th className="px-5 py-3 font-medium">Scope</th>
              <th className="px-5 py-3 font-medium">Cadence</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(e => (
              <tr key={e.id} style={{ borderTop: `1px solid ${HAIRLINE}` }} className="hover:bg-[#fafafa]">
                <td className="px-5 py-3 text-gray-900 font-medium">{e.diListing}</td>
                <td className="px-5 py-3 text-gray-700">{e.deliverable}</td>
                <td className="px-5 py-3 text-gray-700 capitalize">{e.scope.replace('-', ' ')}</td>
                <td className="px-5 py-3">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: '#eef6ff', color: ACCENT }}
                  >
                    {e.cadence}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px]"
                    style={{ color: e.active ? '#0a7f3f' : '#6b7280' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: e.active ? '#16a34a' : '#9ca3af' }}
                    />
                    {e.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-[12px]">{e.notes || '—'}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-500 text-[13px]">
                  No catalog entries match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
