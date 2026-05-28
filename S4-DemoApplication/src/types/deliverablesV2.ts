/**
 * Deliverables Tracker v2 — feature-specific types
 *
 * The main grid still uses the existing `DRLRow` from `../types.ts`.
 * Everything below describes the supplementary data shapes used by the
 * seven companion feature views (Executive Brief, Action Items, Analytics,
 * Weekly Archive, Prior Week Snapshot, Submittal Schedule, Submittals Library)
 * and the in-tool Activity Log.
 *
 * Modeled on the eight tabs in `Analysis of CSY DRLs (5.7.2026).xlsx`,
 * with all yard-specific terminology removed (Shipbuilder, Vessel Class A).
 */

import type { DRLRow } from '../types'

/* ─── Feature nav ─────────────────────────────────────────── */

export type FeatureKey =
  | 'tracker'
  | 'executive'
  | 'actions'
  | 'analytics'
  | 'archive'
  | 'snapshot'
  | 'schedule'
  | 'library'

export interface FeatureDef {
  key: FeatureKey
  label: string
  icon: string            // Font Awesome class (already used app-wide)
  description: string
}

/* ─── Executive Brief ─────────────────────────────────────── */

export interface KPI {
  metric: string
  current: number | string
  prior: number | string
  changeLabel: string     // e.g. "-5" or "+10%"
  trend: 'up' | 'down' | 'flat'
  statusLabel: string     // e.g. "Improving", "Declining"
  statusTone: 'positive' | 'negative' | 'neutral'
}

export interface EscalationItem {
  deliverable: string
  daysOverdue: number
  status: string
  requiredAction: string
}

export interface ExecutiveBrief {
  reportDate: string                // ISO
  weekEnding: string                // ISO
  totals: {
    overdue: number
    needClarification: number
    received: number
  }
  kpis: KPI[]
  escalations: EscalationItem[]
  progressThisWeek: string[]
  concerns: string[]
  recommendedActions: string[]
}

/* ─── Action Items ────────────────────────────────────────── */

export type ActionPriority = 'critical' | 'high' | 'medium' | 'low'

export interface ActionItem {
  id: string
  priority: ActionPriority
  diTitle: string                   // e.g. "DI-021-03 Stability Report Rev B (Hull 60)"
  issue: string
  dueDate: string                   // ISO
  daysOverdue: number
  requiredAction: string
  programOfficeNotes: string
  /** Shipbuilder's response (editable in the tool) */
  response: {
    text: string
    plannedResolutionDate: string | null
    poc: string
    notes: string
    dateSubmitted: string | null
    receiptConfirmed: boolean
  }
}

/* ─── Analytics (Analysis Dashboard) ──────────────────────── */

export interface AnalyticsMetric {
  label: string
  current: number
  historical: number
  change: number
  pctChange: number
  trend: 'up' | 'down' | 'flat'
}

export interface AnalyticsSeriesPoint {
  weekEnding: string                // ISO
  overdue: number
  needClarification: number
  received: number
  notYetDue: number
}

export interface AnalyticsSnapshot {
  lastRefreshed: string             // ISO
  metrics: AnalyticsMetric[]
  series: AnalyticsSeriesPoint[]
  /** DI numbers most frequently overdue across history */
  topOffenders: { diNumber: string; weeksOverdue: number; lastSeen: string }[]
}

/* ─── Weekly Archive ──────────────────────────────────────── */

export interface WeeklySnapshot {
  weekEnding: string                // ISO
  capturedAt: string                // ISO
  rows: DRLRow[]                    // full state of the Tracker at capture time
  totals: {
    overdue: number
    needClarification: number
    received: number
    notYetDue: number
  }
}

/* ─── Prior Week Snapshot (side-by-side diff) ─────────────── */

export type RowDiffKind = 'added' | 'removed' | 'changed' | 'unchanged'

export interface RowDiff {
  rowId: string
  title: string
  kind: RowDiffKind
  /** Per-field change set (only set when kind === 'changed') */
  changes?: { field: keyof DRLRow; from: unknown; to: unknown }[]
}

/* ─── Submittal Schedule ──────────────────────────────────── */

export type SubmittalCadence =
  | 'Quarterly'
  | 'Monthly'
  | 'Annually'
  | 'Per IPR'
  | 'Per DR'
  | 'Per Hull'
  | 'One-Time'
  | 'As Required'

export interface SubmittalScheduleEntry {
  id: string
  diListing: string                 // "DI-003 | LGC and ILS Agenda and Minutes"
  deliverable: string               // "Agenda" / "Minutes" / etc.
  active: boolean
  scope: 'series' | 'per-hull' | 'n/a'
  cadence: SubmittalCadence
  notes: string
}

/* ─── Submittals Library (raw catalog) ────────────────────── */

export interface RawSubmittal {
  id: string
  hullNo: string
  swbs: string                      // ship work breakdown structure
  dataItemNo: string                // "DI-005 | Production Readiness Review..."
  itemNumber: string | null
  dataItemTitle: string
}

/* ─── In-tool Activity Log ────────────────────────────────── */

export type ActivityKind =
  | 'view'
  | 'edit'
  | 'status-change'
  | 'snapshot'
  | 'export'
  | 'anchor'
  | 'verify'
  | 'ide-sync'
  | 'action-response'
  | 'comment'

export interface ActivityLogEntry {
  id: string
  ts: string                        // ISO
  actor: string                     // user display name / role
  kind: ActivityKind
  feature: FeatureKey | 'global'
  summary: string                   // one-line human-readable
  rowId?: string
  metadata?: Record<string, unknown>
}
