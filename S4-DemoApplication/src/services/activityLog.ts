/**
 * Deliverables Tracker v2 — Activity Log
 *
 * Tiny localStorage-backed event log. Every user-visible action inside the
 * tool (view change, edit, status change, snapshot, export, anchor, IDE sync,
 * etc.) calls `logActivity()`.  The Activity Log panel reads via
 * `getActivityLog()` and `subscribe()` for live updates.
 *
 * Persistence today: `window.localStorage` under STORAGE_KEY.
 * Persistence later: Supabase (`activity_log` table) — wire here, no caller changes.
 */

import type { ActivityKind, ActivityLogEntry, FeatureKey } from '../types/deliverablesV2'

const STORAGE_KEY = 's4_deliverables_activity_log_v2'
const MAX_ENTRIES = 500

type Listener = (entries: ActivityLogEntry[]) => void
const listeners = new Set<Listener>()

function safeRead(): ActivityLogEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : []
  } catch {
    return []
  }
}

function safeWrite(entries: ActivityLogEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    /* quota / privacy mode — swallow */
  }
}

export function getActivityLog(): ActivityLogEntry[] {
  return safeRead()
}

export interface LogInput {
  actor: string
  kind: ActivityKind
  feature: FeatureKey | 'global'
  summary: string
  rowId?: string
  metadata?: Record<string, unknown>
}

export function logActivity(input: LogInput): ActivityLogEntry {
  const entry: ActivityLogEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    ...input,
  }
  const next = [entry, ...safeRead()].slice(0, MAX_ENTRIES)
  safeWrite(next)
  listeners.forEach(l => {
    try { l(next) } catch { /* ignore listener errors */ }
  })
  return entry
}

export function clearActivityLog(): void {
  safeWrite([])
  listeners.forEach(l => { try { l([]) } catch { /* ignore */ } })
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
