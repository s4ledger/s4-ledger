/**
 * Deliverables Tracker v2 — Feature: Submittals Library
 *
 * Searchable catalog of every submittal by hull / SWBS / DI.
 * Apple aesthetic, light mode only.
 */

import { useEffect, useMemo, useState } from 'react'
import { logActivity } from '../../services/activityLog'
import type { RawSubmittal } from '../../types/deliverablesV2'

const HAIRLINE = '#e5e5e7'

interface Props {
  items: RawSubmittal[]
  actorName: string
}

export default function LibraryView({ items, actorName }: Props) {
  const [search, setSearch] = useState('')
  const [hull, setHull] = useState<string>('all')

  useEffect(() => {
    logActivity({
      actor: actorName,
      kind: 'view',
      feature: 'library',
      summary: `Opened Submittals Library (${items.length} indexed)`,
    })
  }, [actorName, items.length])

  const hulls = useMemo(
    () => Array.from(new Set(items.map(i => i.hullNo))).sort(),
    [items],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(i => {
      if (hull !== 'all' && i.hullNo !== hull) return false
      if (!q) return true
      return (
        i.dataItemNo.toLowerCase().includes(q) ||
        i.dataItemTitle.toLowerCase().includes(q) ||
        i.swbs.toLowerCase().includes(q) ||
        i.hullNo.toLowerCase().includes(q)
      )
    })
  }, [items, search, hull])

  // Group by data item number (DI family)
  const grouped = useMemo(() => {
    const map = new Map<string, RawSubmittal[]>()
    for (const it of visible) {
      const key = it.dataItemNo
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(it)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [visible])

  return (
    <div className="space-y-6">
      {/* ── Filter bar ──────────────────────────────── */}
      <div
        className="rounded-2xl bg-white px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{ border: `1px solid ${HAIRLINE}` }}
      >
        <div
          className="flex-1 min-w-[240px] flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fafafa]"
          style={{ border: `1px solid ${HAIRLINE}` }}
        >
          <i className="fas fa-magnifying-glass text-[11px] text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by DI, title, SWBS, or hull…"
            className="flex-1 bg-transparent text-[13px] focus:outline-none"
          />
        </div>
        <select
          value={hull}
          onChange={e => setHull(e.target.value)}
          className="px-3 py-1.5 rounded-full text-[12px] bg-[#fafafa] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
          style={{ border: `1px solid ${HAIRLINE}` }}
        >
          <option value="all">All hulls</option>
          {hulls.map(h => (
            <option key={h} value={h}>Hull {h}</option>
          ))}
        </select>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {visible.length} of {items.length}
        </span>
      </div>

      {/* ── Grouped list ────────────────────────────── */}
      <div className="space-y-4">
        {grouped.map(([di, rows]) => (
          <div
            key={di}
            className="rounded-2xl bg-white overflow-hidden"
            style={{ border: `1px solid ${HAIRLINE}` }}
          >
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ background: '#fafafa', borderBottom: `1px solid ${HAIRLINE}` }}
            >
              <div className="text-[13px] font-semibold text-gray-900">{di}</div>
              <span className="text-[11px] text-gray-500 tabular-nums">
                {rows.length} submittal{rows.length === 1 ? '' : 's'}
              </span>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-gray-500">
                  <th className="px-5 py-2.5 font-medium">Hull</th>
                  <th className="px-5 py-2.5 font-medium">SWBS</th>
                  <th className="px-5 py-2.5 font-medium">Item #</th>
                  <th className="px-5 py-2.5 font-medium">Title</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${HAIRLINE}` }} className="hover:bg-[#fafafa]">
                    <td className="px-5 py-2.5 text-gray-900 tabular-nums">{r.hullNo}</td>
                    <td className="px-5 py-2.5 text-gray-700 tabular-nums">{r.swbs}</td>
                    <td className="px-5 py-2.5 text-gray-700">{r.itemNumber || '—'}</td>
                    <td className="px-5 py-2.5 text-gray-900">{r.dataItemTitle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {grouped.length === 0 && (
          <div
            className="rounded-2xl bg-white px-6 py-12 text-center text-[13px] text-gray-500"
            style={{ border: `1px solid ${HAIRLINE}` }}
          >
            No submittals match this filter.
          </div>
        )}
      </div>
    </div>
  )
}
