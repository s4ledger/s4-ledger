/**
 * Deliverables Tracker v2 — demo data
 *
 * Derived from the structure of `Analysis of CSY DRLs (5.7.2026).xlsx`
 * with all yard-specific terms removed:
 *   • "Conrad Shipyard / CSY"         → "Acme Shipyard" (shipbuilder)
 *   • "YRBM" hull class               → "Vessel Class A"
 *   • Hull numbers                    → 60–67 (kept, generic)
 *   • "Gov't"                         → "Program Office"
 *
 * Used by the new DeliverablesTracker.tsx shell as seed data so the tool
 * renders fully populated even when no IDE sync feed is connected.
 *
 * All dates are ISO strings (YYYY-MM-DD).
 */

import type { DRLRow } from '../types'
import type {
  ExecutiveBrief,
  ActionItem,
  AnalyticsSnapshot,
  WeeklySnapshot,
  SubmittalScheduleEntry,
  RawSubmittal,
  FeatureDef,
} from '../types/deliverablesV2'

export const DEMO_SHIPBUILDER = 'Acme Shipyard'
export const DEMO_VESSEL_CLASS = 'Vessel Class A'
export const DEMO_REPORT_DATE = '2026-05-27'
export const DEMO_WEEK_ENDING = '2026-05-21'

/* ─── Feature nav ─────────────────────────────────────────── */

export const FEATURES: FeatureDef[] = [
  {
    key: 'tracker',
    label: 'Deliverables Tracker',
    icon: 'fa-table',
    description: 'Master grid of every DRL with status, dates, and notes.',
  },
  {
    key: 'executive',
    label: 'Executive Brief',
    icon: 'fa-file-lines',
    description: 'Weekly program-office status report.',
  },
  {
    key: 'actions',
    label: 'Action Items',
    icon: 'fa-bolt',
    description: 'Deliverables requiring Shipbuilder action, prioritized.',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: 'fa-chart-line',
    description: 'Trends, deltas, and top offenders across snapshots.',
  },
  {
    key: 'archive',
    label: 'Weekly Archive',
    icon: 'fa-box-archive',
    description: 'Historical snapshots of the Tracker, week by week.',
  },
  {
    key: 'snapshot',
    label: 'Prior Week Snapshot',
    icon: 'fa-code-compare',
    description: 'Side-by-side compare of current vs. last week.',
  },
  {
    key: 'schedule',
    label: 'Submittal Schedule',
    icon: 'fa-calendar-days',
    description: 'Reference catalog of expected deliverables per DI.',
  },
  {
    key: 'library',
    label: 'Submittals Library',
    icon: 'fa-books',
    description: 'Searchable catalog of every submittal by hull / SWBS / DI.',
  },
]

/* ─── Main grid (Tracker) — 8 rows mirroring spreadsheet pattern ── */

export const DEMO_ROWS: DRLRow[] = [
  {
    id: 'dlv-001',
    title: 'DI-010 Master Equipment List — (Hull 67)',
    diNumber: 'DI-010',
    contractDueFinish: '2026-04-03',
    calculatedDueDate: '45 DAC',
    submittalGuidance: '2026-04-03',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: 7,
    notes:
      'Awaiting submission. Shipbuilder has taken action for Hulls 63–67 as equipment items have changed per ILS drumbeat discussion. Updates needed.',
    status: 'red',
    scope: 'series',
  },
  {
    id: 'dlv-002',
    title: 'DI-007 Drawing Schedule and Documentation Schedule — Rev — (Hull 67)',
    diNumber: 'DI-007',
    contractDueFinish: '2026-04-03',
    calculatedDueDate: '45 DAC, 14 DPT each DR and IPR',
    submittalGuidance: '2026-04-03',
    actualSubmissionDate: '2024-10-29',
    received: 'Yes',
    calendarDaysToReview: 7,
    notes: 'Received; Series Deliverable (DI-007-241029-K) received on 10/29/2024.',
    status: 'green',
    scope: 'series',
  },
  {
    id: 'dlv-003',
    title: 'DI-021-03 Stability Report Rev B — (Hull 60)',
    diNumber: 'DI-021-03',
    contractDueFinish: '2025-12-29',
    calculatedDueDate: 'Post-trial + 60 DAC',
    submittalGuidance: '2025-12-29',
    actualSubmissionDate: '2025-12-10',
    received: 'No',
    calendarDaysToReview: 30,
    notes:
      "Program Office comments from 12/10/2025 not addressed — deadweight data discrepancies. Awaiting Rev B with corrected lightship and full-load graphs.",
    status: 'yellow',
    scope: 'per-hull',
  },
  {
    id: 'dlv-004',
    title: 'DI-021-03 Stability Final As-Built — (Hull 60)',
    diNumber: 'DI-021-03',
    contractDueFinish: '2026-02-27',
    calculatedDueDate: 'Post-trial + 120 DAC',
    submittalGuidance: '2026-02-27',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: 30,
    notes: 'Linked to Rev B. Cannot be accepted until Rev B corrections made.',
    status: 'yellow',
    scope: 'per-hull',
  },
  {
    id: 'dlv-005',
    title: 'DI-046-02 Fire Extinguishing System Rev C',
    diNumber: 'DI-046-02',
    contractDueFinish: '2026-04-13',
    calculatedDueDate: '60 DAC',
    submittalGuidance: '2026-04-13',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: 14,
    notes:
      "Solo filters don't meet 95% grease extraction per J-1 Appendix A. Replace Solo with Combo filters OR provide technical justification.",
    status: 'red',
    scope: 'series',
  },
  {
    id: 'dlv-006',
    title: 'DI-021-32 HVAC Diagrams Rev D — (Hull 63)',
    diNumber: 'DI-021-32',
    contractDueFinish: '2026-05-06',
    calculatedDueDate: '45 DAC',
    submittalGuidance: '2026-05-06',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: 14,
    notes: 'Rev C had Level A & C comments requiring resubmission. Submit Rev D addressing all comments.',
    status: 'yellow',
    scope: 'per-hull',
  },
  {
    id: 'dlv-007',
    title: 'DI-008 Material Ordering Plan',
    diNumber: 'DI-008',
    contractDueFinish: '2026-04-15',
    calculatedDueDate: '30 DAC',
    submittalGuidance: '2026-04-15',
    actualSubmissionDate: '2026-05-12',
    received: 'Yes',
    calendarDaysToReview: 7,
    notes: 'Received 5/12/2026. Status update pending Program Office acceptance.',
    status: 'green',
    scope: 'series',
  },
  {
    id: 'dlv-008',
    title: 'DI-029 Trial Agendas — (Hull 60)',
    diNumber: 'DI-029',
    contractDueFinish: '2026-06-15',
    calculatedDueDate: 'Pre-trial + 30 DPT',
    submittalGuidance: '2026-06-15',
    actualSubmissionDate: '2026-04-02',
    received: 'Yes',
    calendarDaysToReview: 14,
    notes: 'Submission received 4/2/2026 — confirm whether this is final or a draft.',
    status: 'pending',
    scope: 'per-hull',
  },
]

/* ─── Executive Brief ─────────────────────────────────────── */

export const DEMO_EXECUTIVE_BRIEF: ExecutiveBrief = {
  reportDate: DEMO_REPORT_DATE,
  weekEnding: DEMO_WEEK_ENDING,
  totals: { overdue: 3, needClarification: 2, received: 2 },
  kpis: [
    {
      metric: 'Total Items Tracked',
      current: 8,
      prior: 10,
      changeLabel: '-2',
      trend: 'down',
      statusLabel: 'Fewer Items',
      statusTone: 'neutral',
    },
    {
      metric: 'Overdue Rate',
      current: '38%',
      prior: '50%',
      changeLabel: '-12pp',
      trend: 'down',
      statusLabel: 'Improving',
      statusTone: 'positive',
    },
    {
      metric: 'Resolution Rate (Received)',
      current: '25%',
      prior: '10%',
      changeLabel: '+15pp',
      trend: 'up',
      statusLabel: 'Improving',
      statusTone: 'positive',
    },
    {
      metric: 'Clarification Backlog',
      current: 2,
      prior: 4,
      changeLabel: '-2',
      trend: 'down',
      statusLabel: 'Shrinking',
      statusTone: 'positive',
    },
  ],
  escalations: [
    {
      deliverable: 'DI-021-03 Stability Report Rev B (Hull 60)',
      daysOverdue: 149,
      status: 'Need Clarification',
      requiredAction: "URGENT: Program Office comments unaddressed since 12/10/2025",
    },
    {
      deliverable: 'DI-021-03 Stability Final As-Built (Hull 60)',
      daysOverdue: 89,
      status: 'Need Clarification',
      requiredAction: 'Linked to Rev B — resolve together',
    },
    {
      deliverable: 'DI-046-02 Fire Extinguishing System Rev C',
      daysOverdue: 44,
      status: 'Overdue',
      requiredAction: 'Technical: filter compliance gap (Solo vs Combo)',
    },
  ],
  progressThisWeek: [
    'DI-008 Material Ordering noted as received 5/12 — status update pending',
    'Overdue count tracking downward from prior week baseline',
  ],
  concerns: [
    'Stability Reports (DI-021-03) for Hull 60 remain unresolved 89–149 days',
    'Fire Extinguishing System (DI-046-02) has technical compliance issue',
  ],
  recommendedActions: [
    "Update DI-008 status to 'Yes' per 5/12/2026 receipt note",
    'Escalate DI-046-02 fire system filter compliance issue to engineering review',
    'Confirm DI-029 Trial Agendas — clarify if 4/2 submission is final',
    "Create action items for all 'Need Clarification' items to reduce backlog",
  ],
}

/* ─── Action Items ────────────────────────────────────────── */

export const DEMO_ACTION_ITEMS: ActionItem[] = [
  {
    id: 'act-001',
    priority: 'critical',
    diTitle: 'DI-021-03 Stability Report Rev B (Hull 60)',
    issue:
      'Program Office comments from 12/10/2025 not addressed — deadweight data discrepancies',
    dueDate: '2025-12-29',
    daysOverdue: 149,
    requiredAction:
      'Submit Rev B with corrected graphs showing updated lightship and full-load values',
    programOfficeNotes: 'Shipbuilder has taken for action — follow up required',
    response: {
      text: '',
      plannedResolutionDate: null,
      poc: '',
      notes: '',
      dateSubmitted: null,
      receiptConfirmed: false,
    },
  },
  {
    id: 'act-002',
    priority: 'critical',
    diTitle: 'DI-021-03 Stability Final As-Built (Hull 60)',
    issue: 'Cannot be accepted until Rev B corrections made — linked dependency',
    dueDate: '2026-02-27',
    daysOverdue: 89,
    requiredAction: 'Address Rev B comments first, then resubmit Final As-Built',
    programOfficeNotes: 'Shipbuilder has taken for action — linked to Rev B',
    response: {
      text: '',
      plannedResolutionDate: null,
      poc: '',
      notes: '',
      dateSubmitted: null,
      receiptConfirmed: false,
    },
  },
  {
    id: 'act-003',
    priority: 'high',
    diTitle: 'DI-010 Master Equipment List (Hull 67)',
    issue: 'Equipment items changed per ILS drumbeat discussion — updates needed',
    dueDate: '2026-04-03',
    daysOverdue: 54,
    requiredAction: 'Submit updated MEL reflecting Hull 63–67 equipment changes',
    programOfficeNotes: 'Coordinate with ILS team for current equipment list',
    response: {
      text: '',
      plannedResolutionDate: null,
      poc: '',
      notes: '',
      dateSubmitted: null,
      receiptConfirmed: false,
    },
  },
  {
    id: 'act-004',
    priority: 'high',
    diTitle: 'DI-046-02 Fire Extinguishing System Rev C',
    issue: "Solo filters don't meet 95% grease extraction per J-1 Appendix A",
    dueDate: '2026-04-13',
    daysOverdue: 44,
    requiredAction: 'Replace Solo with Combo filters OR provide technical justification',
    programOfficeNotes: 'Technical compliance gap — engineering review needed',
    response: {
      text: '',
      plannedResolutionDate: null,
      poc: '',
      notes: '',
      dateSubmitted: null,
      receiptConfirmed: false,
    },
  },
  {
    id: 'act-005',
    priority: 'medium',
    diTitle: 'DI-021-32 HVAC Diagrams Rev D (Hull 63)',
    issue: 'Rev C had Level A & C comments requiring resubmission',
    dueDate: '2026-05-06',
    daysOverdue: 21,
    requiredAction: 'Submit Rev D addressing all Level A & C comments from Rev C review',
    programOfficeNotes: 'Despite Series Deliverable status, updates needed',
    response: {
      text: '',
      plannedResolutionDate: null,
      poc: '',
      notes: '',
      dateSubmitted: null,
      receiptConfirmed: false,
    },
  },
]

/* ─── Analytics ───────────────────────────────────────────── */

export const DEMO_ANALYTICS: AnalyticsSnapshot = {
  lastRefreshed: `${DEMO_REPORT_DATE}T11:26:00.000Z`,
  metrics: [
    { label: 'Overdue', current: 3, historical: 7, change: -4, pctChange: -57, trend: 'down' },
    {
      label: 'Submitted / Received',
      current: 2,
      historical: 24,
      change: -22,
      pctChange: -92,
      trend: 'down',
    },
    {
      label: 'Need Clarification',
      current: 2,
      historical: 2,
      change: 0,
      pctChange: 0,
      trend: 'flat',
    },
    {
      label: 'Not Yet Due (Milestone Shift)',
      current: 1,
      historical: 7,
      change: -6,
      pctChange: -86,
      trend: 'down',
    },
  ],
  series: [
    { weekEnding: '2026-04-09', overdue: 7, needClarification: 4, received: 24, notYetDue: 7 },
    { weekEnding: '2026-04-16', overdue: 6, needClarification: 4, received: 24, notYetDue: 6 },
    { weekEnding: '2026-04-23', overdue: 6, needClarification: 3, received: 23, notYetDue: 5 },
    { weekEnding: '2026-04-30', overdue: 5, needClarification: 3, received: 22, notYetDue: 4 },
    { weekEnding: '2026-05-07', overdue: 5, needClarification: 2, received: 22, notYetDue: 3 },
    { weekEnding: '2026-05-14', overdue: 4, needClarification: 2, received: 21, notYetDue: 2 },
    { weekEnding: '2026-05-21', overdue: 3, needClarification: 2, received: 2,  notYetDue: 1 },
  ],
  topOffenders: [
    { diNumber: 'DI-021-03', weeksOverdue: 21, lastSeen: '2026-05-21' },
    { diNumber: 'DI-046-02', weeksOverdue: 6,  lastSeen: '2026-05-21' },
    { diNumber: 'DI-010',    weeksOverdue: 8,  lastSeen: '2026-05-21' },
    { diNumber: 'DI-021-32', weeksOverdue: 3,  lastSeen: '2026-05-21' },
  ],
  statusDistribution: [
    { label: 'Overdue',        current: 3, historical: 7,  color: '#dc2626' },
    { label: 'Clarification',  current: 2, historical: 2,  color: '#d97706' },
    { label: 'Received',       current: 2, historical: 24, color: '#16a34a' },
    { label: 'Not Yet Due',    current: 1, historical: 7,  color: '#0071e3' },
  ],
  typeBreakdown: [
    { type: 'Per Hull', total: 2, overdue: 0, received: 0, clarification: 2 },
    { type: 'Series',   total: 6, overdue: 3, received: 2, clarification: 0 },
  ],
  aging: [
    { bucket: '0–14 days',  count: 1, pct: 0.20, risk: 'low' },
    { bucket: '15–30 days', count: 1, pct: 0.20, risk: 'medium' },
    { bucket: '31–60 days', count: 1, pct: 0.20, risk: 'high' },
    { bucket: '60+ days',   count: 2, pct: 0.40, risk: 'critical' },
  ],
  hulls: [
    { hull: 'Hull 60', total: 2, overdue: 0, received: 0, clarification: 2, notYetDue: 0 },
    { hull: 'Hull 61', total: 1, overdue: 1, received: 0, clarification: 0, notYetDue: 0 },
    { hull: 'Hull 63', total: 2, overdue: 1, received: 0, clarification: 0, notYetDue: 1 },
    { hull: 'Hull 65', total: 1, overdue: 0, received: 1, clarification: 0, notYetDue: 0 },
    { hull: 'Hull 67', total: 2, overdue: 1, received: 1, clarification: 0, notYetDue: 0 },
  ],
  kpis: [
    { label: 'Overdue Rate',         value: '60%', status: 'crit', note: 'High' },
    { label: 'Resolution Rate',      value: '0%',  status: 'crit', note: 'Poor' },
    { label: 'Clarification Backlog',value: '40%', status: 'crit', note: 'High backlog' },
    { label: 'Critical Risk (5)',    value: 2,     status: 'warn', note: 'Monitor closely' },
    { label: 'Max Days Overdue',     value: 149,   status: 'crit', note: 'Critical delay' },
    { label: 'Avg Days Overdue',     value: 71.4,  status: 'warn', note: 'Moderate' },
    { label: 'Avg Review Days',      value: 12.6,  status: 'good', note: '↓ from 13.5' },
    { label: 'Per Hull % Overdue',   value: '0%',  status: 'good', note: 'Series dominant' },
  ],
  priorityItems: [
    { rank: 1, title: 'DI-021-03 STABILITY REPORT Rev B (Hull 60)',  scope: 'Per Hull', status: 'Clarification', daysOverdue: 149, risk: 5, action: 'URGENT: escalate immediately' },
    { rank: 2, title: 'DI-021-03 STABILITY FINAL-AS-BUILT (Hull 60)', scope: 'Per Hull', status: 'Clarification', daysOverdue: 88,  risk: 5, action: 'URGENT: linked — resolve together' },
    { rank: 3, title: 'DI-010 MASTER EQUIPMENT LIST (Hull 67)',       scope: 'Series',   status: 'Overdue',       daysOverdue: 53,  risk: 4, action: 'CSY action pending — ILS drumbeat updates' },
    { rank: 4, title: 'DI-046-02 FIRE EXTINGUISHING (Resubmit)',      scope: 'Series',   status: 'Overdue',       daysOverdue: 43,  risk: 4, action: 'Technical issue — filter compliance gap' },
    { rank: 5, title: 'DI-021-32 HVAC DIAGRAMS Rev D (Hull 63)',      scope: 'Series',   status: 'Overdue',       daysOverdue: 25,  risk: 3, action: 'Rev C comments require resubmission' },
  ],
}

/* ─── Weekly Archive (snapshots) ──────────────────────────── */

function pastSnapshot(weekEnding: string, totals: WeeklySnapshot['totals']): WeeklySnapshot {
  return {
    weekEnding,
    capturedAt: `${weekEnding}T17:00:00.000Z`,
    rows: [], // historical row payloads omitted from demo seed (large)
    totals,
  }
}

export const DEMO_ARCHIVE: WeeklySnapshot[] = [
  pastSnapshot('2026-04-09', { overdue: 7, needClarification: 4, received: 24, notYetDue: 7 }),
  pastSnapshot('2026-04-16', { overdue: 6, needClarification: 4, received: 24, notYetDue: 6 }),
  pastSnapshot('2026-04-23', { overdue: 6, needClarification: 3, received: 23, notYetDue: 5 }),
  pastSnapshot('2026-04-30', { overdue: 5, needClarification: 3, received: 22, notYetDue: 4 }),
  pastSnapshot('2026-05-07', { overdue: 5, needClarification: 2, received: 22, notYetDue: 3 }),
  pastSnapshot('2026-05-14', { overdue: 4, needClarification: 2, received: 21, notYetDue: 2 }),
  {
    weekEnding: '2026-05-21',
    capturedAt: '2026-05-21T17:00:00.000Z',
    rows: DEMO_ROWS,
    totals: { overdue: 3, needClarification: 2, received: 2, notYetDue: 1 },
  },
]

/* ─── Submittal Schedule (DI catalog) ─────────────────────── */

export const DEMO_SUBMITTAL_SCHEDULE: SubmittalScheduleEntry[] = [
  { id: 'sch-001', diListing: 'DI-003 | LGC and ILS Agenda and Minutes',                      deliverable: 'Agenda',       active: true,  scope: 'n/a',      cadence: 'Quarterly', notes: '' },
  { id: 'sch-002', diListing: 'DI-003 | LGC and ILS Agenda and Minutes',                      deliverable: 'Presentation', active: true,  scope: 'n/a',      cadence: 'Quarterly', notes: '' },
  { id: 'sch-003', diListing: 'DI-003 | LGC and ILS Agenda and Minutes',                      deliverable: 'Minutes',      active: true,  scope: 'n/a',      cadence: 'Quarterly', notes: '' },
  { id: 'sch-004', diListing: 'DI-004 | Interim Progress Review Agenda & Minutes',            deliverable: 'Agenda',       active: true,  scope: 'n/a',      cadence: 'Per IPR',   notes: '' },
  { id: 'sch-005', diListing: 'DI-004 | Interim Progress Review Agenda & Minutes',            deliverable: 'Presentation', active: true,  scope: 'n/a',      cadence: 'Per IPR',   notes: '' },
  { id: 'sch-006', diListing: 'DI-004 | Interim Progress Review Agenda & Minutes',            deliverable: 'Minutes',      active: true,  scope: 'n/a',      cadence: 'Per IPR',   notes: '' },
  { id: 'sch-007', diListing: 'DI-007 | Drawing Schedule and Documentation Schedule',         deliverable: 'Schedule',     active: true,  scope: 'series',   cadence: 'One-Time',  notes: 'Revisions per DR/IPR cycle.' },
  { id: 'sch-008', diListing: 'DI-008 | Material Ordering Plan',                              deliverable: 'Plan',         active: true,  scope: 'series',   cadence: 'One-Time',  notes: '' },
  { id: 'sch-009', diListing: 'DI-010 | Master Equipment List',                               deliverable: 'List',         active: true,  scope: 'series',   cadence: 'As Required', notes: 'Updated per ILS drumbeat.' },
  { id: 'sch-010', diListing: 'DI-021-03 | Stability Report',                                 deliverable: 'Rev B',        active: true,  scope: 'per-hull', cadence: 'Per Hull',  notes: 'Post-trial submission.' },
  { id: 'sch-011', diListing: 'DI-021-03 | Stability Report',                                 deliverable: 'Final As-Built', active: true, scope: 'per-hull', cadence: 'Per Hull',  notes: 'Follows Rev B.' },
  { id: 'sch-012', diListing: 'DI-021-32 | HVAC Diagrams',                                    deliverable: 'Rev D',        active: true,  scope: 'per-hull', cadence: 'Per Hull',  notes: '' },
  { id: 'sch-013', diListing: 'DI-029 | Trial Agendas',                                       deliverable: 'Agenda',       active: true,  scope: 'per-hull', cadence: 'Per Hull',  notes: '' },
  { id: 'sch-014', diListing: 'DI-046-02 | Fire Extinguishing System',                        deliverable: 'Rev C',        active: true,  scope: 'series',   cadence: 'One-Time',  notes: 'J-1 Appendix A compliance required.' },
]

/* ─── Submittals Library (raw catalog excerpt) ────────────── */

export const DEMO_SUBMITTALS_LIBRARY: RawSubmittal[] = [
  { id: 'lib-001', hullNo: '60', swbs: '42', dataItemNo: 'DI-005 | Production Readiness Review Agenda, Presentation, and Minutes', itemNumber: null, dataItemTitle: 'PRR Agenda & Minutes' },
  { id: 'lib-002', hullNo: '60', swbs: '42', dataItemNo: 'DI-005 | Production Readiness Review Agenda, Presentation, and Minutes', itemNumber: null, dataItemTitle: 'PRR Presentation' },
  { id: 'lib-003', hullNo: '60', swbs: '40', dataItemNo: 'SSP-001 | Security System Plan',                                          itemNumber: null, dataItemTitle: 'Security System Plan' },
  { id: 'lib-004', hullNo: '60', swbs: '42', dataItemNo: 'DI-021-03 | Stability Report',                                            itemNumber: 'Rev B', dataItemTitle: 'Stability Report (Rev B)' },
  { id: 'lib-005', hullNo: '60', swbs: '42', dataItemNo: 'DI-021-03 | Stability Report',                                            itemNumber: 'Final', dataItemTitle: 'Stability Final As-Built' },
  { id: 'lib-006', hullNo: '60', swbs: '42', dataItemNo: 'DI-029 | Trial Agendas',                                                  itemNumber: null, dataItemTitle: 'Builder Trial Agenda' },
  { id: 'lib-007', hullNo: '61', swbs: '42', dataItemNo: 'DI-005 | Production Readiness Review Agenda, Presentation, and Minutes', itemNumber: null, dataItemTitle: 'PRR Agenda' },
  { id: 'lib-008', hullNo: '61', swbs: '42', dataItemNo: 'DI-007 | Drawing Schedule and Documentation Schedule',                    itemNumber: null, dataItemTitle: 'Drawing Schedule' },
  { id: 'lib-009', hullNo: '62', swbs: '42', dataItemNo: 'DI-008 | Material Ordering Plan',                                         itemNumber: null, dataItemTitle: 'Material Ordering Plan' },
  { id: 'lib-010', hullNo: '63', swbs: '50', dataItemNo: 'DI-021-32 | HVAC Diagrams',                                               itemNumber: 'Rev C', dataItemTitle: 'HVAC Diagrams (Rev C)' },
  { id: 'lib-011', hullNo: '63', swbs: '50', dataItemNo: 'DI-021-32 | HVAC Diagrams',                                               itemNumber: 'Rev D', dataItemTitle: 'HVAC Diagrams (Rev D)' },
  { id: 'lib-012', hullNo: '64', swbs: '70', dataItemNo: 'DI-046-02 | Fire Extinguishing System',                                   itemNumber: 'Rev C', dataItemTitle: 'Fire Extinguishing System (Rev C)' },
  { id: 'lib-013', hullNo: '65', swbs: '42', dataItemNo: 'DI-010 | Master Equipment List',                                          itemNumber: null, dataItemTitle: 'Master Equipment List' },
  { id: 'lib-014', hullNo: '66', swbs: '42', dataItemNo: 'DI-010 | Master Equipment List',                                          itemNumber: null, dataItemTitle: 'Master Equipment List' },
  { id: 'lib-015', hullNo: '67', swbs: '42', dataItemNo: 'DI-010 | Master Equipment List',                                          itemNumber: null, dataItemTitle: 'Master Equipment List' },
  { id: 'lib-016', hullNo: '67', swbs: '42', dataItemNo: 'DI-007 | Drawing Schedule and Documentation Schedule',                    itemNumber: null, dataItemTitle: 'Drawing Schedule (Hull 67)' },
]
