/**
 * Deliverables Tracker v2 — per-vessel datasets.
 *
 * Each vessel (platform / hull class) has its own self-contained dataset
 * so switching vessels in the shell re-flows every tab:
 *   • Tracker rows, Executive Brief, Action Items, Analytics, Archive,
 *     Schedule, Library.
 *
 * Generic terminology only — no real shipyard/platform names.
 */

import type { DRLRow } from '../types'
import type {
  ActionItem,
  AnalyticsSnapshot,
  ExecutiveBrief,
  RawSubmittal,
  SubmittalScheduleEntry,
  WeeklySnapshot,
} from '../types/deliverablesV2'

import {
  DEMO_ROWS,
  DEMO_EXECUTIVE_BRIEF,
  DEMO_ACTION_ITEMS,
  DEMO_ANALYTICS,
  DEMO_ARCHIVE,
  DEMO_SUBMITTAL_SCHEDULE,
  DEMO_SUBMITTALS_LIBRARY,
} from './deliverablesDemoData'

/* ─── Types ────────────────────────────────────────────── */

export interface VesselDataset {
  id: VesselId
  label: string
  shortLabel: string
  shipbuilder: string
  hulls: string[]
  icon: string
  description: string
  rows: DRLRow[]
  brief: ExecutiveBrief
  actions: ActionItem[]
  analytics: AnalyticsSnapshot
  archive: WeeklySnapshot[]
  schedule: SubmittalScheduleEntry[]
  library: RawSubmittal[]
}

export type VesselId = 'vessel-a' | 'vessel-b' | 'vessel-c'

/* ─── Backfill: add row payloads to historical snapshots ─── */
/*
 * The original DEMO_ARCHIVE only carries totals for prior weeks (rows: []).
 * For the click-to-view feature we synthesise plausible row sets for each
 * prior week by perturbing the current Vessel-A rows: flipping some greens
 * back to yellow/red, removing the most recent additions, etc.
 */
function backfillArchive(current: DRLRow[], snapshots: WeeklySnapshot[]): WeeklySnapshot[] {
  return snapshots.map(snap => {
    if (snap.rows && snap.rows.length > 0) return snap
    const t = snap.totals
    const want = t.overdue + t.needClarification + t.received + t.notYetDue
    // Reverse-engineer historical row set: start from current, then
    // mutate to roughly hit the historical totals.
    const work = current.map(r => ({ ...r }))
    // Slide statuses backward in time:
    //   - Items currently 'green' were more likely 'red' or 'yellow' earlier.
    //   - Items currently 'red' may have been 'pending' earlier (newer).
    // We rotate statuses based on the snapshot's age.
    const idx = parseInt(snap.weekEnding.slice(-2), 10) // 0..30
    work.forEach((r, i) => {
      if ((i + idx) % 5 === 0 && r.status === 'green') r.status = 'yellow'
      if ((i + idx) % 7 === 0 && r.status === 'yellow') r.status = 'red'
      if ((i + idx) % 9 === 0 && r.status === 'red') r.status = 'pending'
    })
    // Trim or pad to roughly hit the row count
    const extra: DRLRow[] = []
    while (work.length + extra.length < want) {
      const seed = current[(work.length + extra.length) % current.length]
      extra.push({
        ...seed,
        id: `${seed.id}-hist-${snap.weekEnding}-${extra.length}`,
        notes: `[Historical snapshot] ${seed.notes}`,
      })
    }
    return { ...snap, rows: [...work, ...extra].slice(0, want) }
  })
}

/* ─── Vessel A: Vessel Class A (YRBM-style) ────────────── */

const VESSEL_A: VesselDataset = {
  id: 'vessel-a',
  label: 'Vessel Class A',
  shortLabel: 'Class A',
  shipbuilder: 'Acme Shipyard',
  hulls: ['Hull 60', 'Hull 61', 'Hull 63', 'Hull 65', 'Hull 67'],
  icon: 'fa-ship',
  description: 'YRBM-equivalent berthing barges · 5 hulls active',
  rows: DEMO_ROWS,
  brief: DEMO_EXECUTIVE_BRIEF,
  actions: DEMO_ACTION_ITEMS,
  analytics: DEMO_ANALYTICS,
  archive: backfillArchive(DEMO_ROWS, DEMO_ARCHIVE),
  schedule: DEMO_SUBMITTAL_SCHEDULE,
  library: DEMO_SUBMITTALS_LIBRARY,
}

/* ─── Vessel B: Vessel Class B (LSV-style logistics) ───── */

const VESSEL_B_ROWS: DRLRow[] = [
  { id: 'vb-001', diNumber: 'DI-101', title: 'DI-101 Cargo Deck Load Plan — (Hull LSV-01)',
    contractDueFinish: '2026-05-15', calculatedDueDate: '60 DAC', submittalGuidance: '2026-05-15',
    actualSubmissionDate: '', received: 'No', calendarDaysToReview: 14,
    notes: 'Awaiting structural calculations for tie-down patterns on aft deck.',
    status: 'red', scope: 'per-hull' },
  { id: 'vb-002', diNumber: 'DI-102', title: 'DI-102 Ramp Hydraulic Schematic — (Hull LSV-01)',
    contractDueFinish: '2026-05-22', calculatedDueDate: '45 DAC', submittalGuidance: '2026-05-22',
    actualSubmissionDate: '2026-05-20', received: 'Yes', calendarDaysToReview: 10,
    notes: 'Received 5/20 — under Program Office review.',
    status: 'green', scope: 'per-hull' },
  { id: 'vb-003', diNumber: 'DI-103', title: 'DI-103 Ballast Tank Inspection Report — (Hull LSV-02)',
    contractDueFinish: '2026-04-30', calculatedDueDate: 'Post-survey + 30 DAC', submittalGuidance: '2026-04-30',
    actualSubmissionDate: '', received: 'No', calendarDaysToReview: 14,
    notes: 'Inspection completed but report draft pending shipbuilder QA review.',
    status: 'yellow', scope: 'per-hull' },
  { id: 'vb-004', diNumber: 'DI-104', title: 'DI-104 Navigation System Integration Test',
    contractDueFinish: '2026-06-20', calculatedDueDate: '90 DAC', submittalGuidance: '2026-06-20',
    actualSubmissionDate: '', received: 'No', calendarDaysToReview: 21,
    notes: 'Test rig scheduled. Not yet due.',
    status: 'pending', scope: 'series' },
  { id: 'vb-005', diNumber: 'DI-105', title: 'DI-105 Mooring Equipment Spec — (Hull LSV-02)',
    contractDueFinish: '2026-04-10', calculatedDueDate: '30 DAC', submittalGuidance: '2026-04-10',
    actualSubmissionDate: '2026-04-08', received: 'Yes', calendarDaysToReview: 7,
    notes: 'Received and accepted 4/08.',
    status: 'green', scope: 'per-hull' },
  { id: 'vb-006', diNumber: 'DI-106', title: 'DI-106 Fire Pump Performance Curve',
    contractDueFinish: '2026-03-15', calculatedDueDate: '60 DAC', submittalGuidance: '2026-03-15',
    actualSubmissionDate: '', received: 'No', calendarDaysToReview: 14,
    notes: 'Vendor data not yet received. Escalated.',
    status: 'red', scope: 'series' },
]

const VESSEL_B: VesselDataset = {
  id: 'vessel-b',
  label: 'Vessel Class B',
  shortLabel: 'Class B',
  shipbuilder: 'Bayside Marine Group',
  hulls: ['LSV-01', 'LSV-02'],
  icon: 'fa-anchor',
  description: 'Logistics support vessels · 2 hulls active',
  rows: VESSEL_B_ROWS,
  brief: {
    reportDate: '2026-05-27',
    weekEnding: '2026-05-21',
    totals: { overdue: 2, needClarification: 1, received: 2 },
    kpis: [
      { metric: 'Total Items Tracked',     current: 6,      prior: 8,      changeLabel: '-2',     trend: 'down', statusLabel: 'Fewer Items', statusTone: 'neutral' },
      { metric: 'Overdue Rate',            current: '33%',  prior: '50%',  changeLabel: '-17pp',  trend: 'down', statusLabel: 'Improving', statusTone: 'positive' },
      { metric: 'Resolution Rate',         current: '33%',  prior: '12%',  changeLabel: '+21pp',  trend: 'up',   statusLabel: 'Improving', statusTone: 'positive' },
      { metric: 'Clarification Backlog',   current: 1,      prior: 3,      changeLabel: '-2',     trend: 'down', statusLabel: 'Shrinking', statusTone: 'positive' },
    ],
    escalations: [
      { deliverable: 'DI-106 Fire Pump Performance Curve', daysOverdue: 73, status: 'Overdue', requiredAction: 'Vendor data overdue — engage procurement' },
      { deliverable: 'DI-101 Cargo Deck Load Plan (LSV-01)', daysOverdue: 13, status: 'Overdue', requiredAction: 'Structural calcs required for tie-down patterns' },
    ],
    progressThisWeek: [ 'DI-102 ramp hydraulic schematic received 5/20', 'DI-105 mooring spec accepted' ],
    concerns: [ 'Fire pump data is on critical path for J-1 compliance', 'Ballast tank report stalled in QA' ],
    recommendedActions: [
      'Engage fire pump vendor; weekly cadence call',
      'Set hard internal deadline on DI-103 QA review (5/30)',
      'Confirm DI-104 NAV integration test slot',
    ],
  },
  actions: [
    { id: 'b-act-001', priority: 'critical', diTitle: 'DI-106 Fire Pump Performance Curve',
      issue: 'Vendor curve data not received — blocks fire-fighting J-1 compliance package',
      dueDate: '2026-03-15', daysOverdue: 73,
      requiredAction: 'Procure curves from vendor and submit within 14 days',
      programOfficeNotes: 'Critical-path item for hull delivery',
      response: { text: '', plannedResolutionDate: null, poc: '', notes: '', dateSubmitted: null, receiptConfirmed: false } },
    { id: 'b-act-002', priority: 'high', diTitle: 'DI-101 Cargo Deck Load Plan (LSV-01)',
      issue: 'Structural tie-down calculations missing — aft deck pattern',
      dueDate: '2026-05-15', daysOverdue: 13,
      requiredAction: 'Submit revised calc package with tie-down pattern matrix',
      programOfficeNotes: 'Coordinate with naval architect',
      response: { text: '', plannedResolutionDate: null, poc: '', notes: '', dateSubmitted: null, receiptConfirmed: false } },
    { id: 'b-act-003', priority: 'medium', diTitle: 'DI-103 Ballast Tank Inspection Report (LSV-02)',
      issue: 'Inspection complete but draft report stalled in QA',
      dueDate: '2026-04-30', daysOverdue: 28,
      requiredAction: 'Release draft to Program Office for parallel review',
      programOfficeNotes: 'Findings already discussed verbally',
      response: { text: '', plannedResolutionDate: null, poc: '', notes: '', dateSubmitted: null, receiptConfirmed: false } },
  ],
  analytics: {
    lastRefreshed: '2026-05-27T11:30:00.000Z',
    metrics: [
      { label: 'Overdue',                       current: 2, historical: 4, change: -2,  pctChange: -50, trend: 'down' },
      { label: 'Submitted / Received',          current: 2, historical: 1, change: +1,  pctChange: +100, trend: 'up' },
      { label: 'Need Clarification',            current: 1, historical: 2, change: -1,  pctChange: -50, trend: 'down' },
      { label: 'Not Yet Due',                   current: 1, historical: 1, change: 0,   pctChange: 0,  trend: 'flat' },
    ],
    series: [
      { weekEnding: '2026-04-09', overdue: 4, needClarification: 3, received: 1, notYetDue: 2 },
      { weekEnding: '2026-04-16', overdue: 4, needClarification: 3, received: 1, notYetDue: 2 },
      { weekEnding: '2026-04-23', overdue: 3, needClarification: 2, received: 1, notYetDue: 2 },
      { weekEnding: '2026-04-30', overdue: 3, needClarification: 2, received: 1, notYetDue: 1 },
      { weekEnding: '2026-05-07', overdue: 3, needClarification: 2, received: 1, notYetDue: 1 },
      { weekEnding: '2026-05-14', overdue: 2, needClarification: 1, received: 2, notYetDue: 1 },
      { weekEnding: '2026-05-21', overdue: 2, needClarification: 1, received: 2, notYetDue: 1 },
    ],
    topOffenders: [
      { diNumber: 'DI-106', weeksOverdue: 11, lastSeen: '2026-05-21' },
      { diNumber: 'DI-103', weeksOverdue: 4,  lastSeen: '2026-05-21' },
      { diNumber: 'DI-101', weeksOverdue: 2,  lastSeen: '2026-05-21' },
    ],
    statusDistribution: [
      { label: 'Overdue',       current: 2, historical: 4, color: '#dc2626' },
      { label: 'Clarification', current: 1, historical: 2, color: '#d97706' },
      { label: 'Received',      current: 2, historical: 1, color: '#16a34a' },
      { label: 'Not Yet Due',   current: 1, historical: 1, color: '#0071e3' },
    ],
    typeBreakdown: [
      { type: 'Per Hull', total: 4, overdue: 1, received: 2, clarification: 1 },
      { type: 'Series',   total: 2, overdue: 1, received: 0, clarification: 0 },
    ],
    aging: [
      { bucket: '0–14 days',  count: 1, pct: 0.50, risk: 'low' },
      { bucket: '15–30 days', count: 0, pct: 0.00, risk: 'medium' },
      { bucket: '31–60 days', count: 0, pct: 0.00, risk: 'high' },
      { bucket: '60+ days',   count: 1, pct: 0.50, risk: 'critical' },
    ],
    hulls: [
      { hull: 'LSV-01', total: 3, overdue: 2, received: 1, clarification: 0, notYetDue: 0 },
      { hull: 'LSV-02', total: 2, overdue: 0, received: 1, clarification: 1, notYetDue: 0 },
      { hull: 'Series', total: 1, overdue: 0, received: 0, clarification: 0, notYetDue: 1 },
    ],
    kpis: [
      { label: 'Overdue Rate',          value: '33%',  status: 'warn', note: 'Moderate' },
      { label: 'Resolution Rate',       value: '33%',  status: 'good', note: 'Improving' },
      { label: 'Clarification Backlog', value: '17%',  status: 'good', note: 'Low' },
      { label: 'Critical Risk (5)',     value: 1,      status: 'crit', note: 'Fire pump' },
      { label: 'Max Days Overdue',      value: 73,     status: 'crit', note: 'Critical' },
      { label: 'Avg Days Overdue',      value: 43,     status: 'warn', note: 'Moderate' },
      { label: 'Avg Review Days',       value: 13.3,   status: 'good', note: 'On track' },
      { label: 'Per Hull % Overdue',    value: '50%',  status: 'warn', note: 'Hull dominant' },
    ],
    priorityItems: [
      { rank: 1, title: 'DI-106 Fire Pump Performance Curve', scope: 'Series',   status: 'Overdue', daysOverdue: 73, risk: 5, action: 'URGENT: vendor escalation' },
      { rank: 2, title: 'DI-103 Ballast Tank Inspection Report (LSV-02)', scope: 'Per Hull', status: 'Clarification', daysOverdue: 28, risk: 4, action: 'Release draft for parallel review' },
      { rank: 3, title: 'DI-101 Cargo Deck Load Plan (LSV-01)',           scope: 'Per Hull', status: 'Overdue',       daysOverdue: 13, risk: 3, action: 'Submit structural tie-down calcs' },
    ],
  },
  archive: backfillArchive(VESSEL_B_ROWS, [
    { weekEnding: '2026-04-09', capturedAt: '2026-04-09T17:00:00Z', rows: [], totals: { overdue: 4, needClarification: 3, received: 1, notYetDue: 2 } },
    { weekEnding: '2026-04-16', capturedAt: '2026-04-16T17:00:00Z', rows: [], totals: { overdue: 4, needClarification: 3, received: 1, notYetDue: 2 } },
    { weekEnding: '2026-04-23', capturedAt: '2026-04-23T17:00:00Z', rows: [], totals: { overdue: 3, needClarification: 2, received: 1, notYetDue: 2 } },
    { weekEnding: '2026-04-30', capturedAt: '2026-04-30T17:00:00Z', rows: [], totals: { overdue: 3, needClarification: 2, received: 1, notYetDue: 1 } },
    { weekEnding: '2026-05-07', capturedAt: '2026-05-07T17:00:00Z', rows: [], totals: { overdue: 3, needClarification: 2, received: 1, notYetDue: 1 } },
    { weekEnding: '2026-05-14', capturedAt: '2026-05-14T17:00:00Z', rows: [], totals: { overdue: 2, needClarification: 1, received: 2, notYetDue: 1 } },
    { weekEnding: '2026-05-21', capturedAt: '2026-05-21T17:00:00Z', rows: VESSEL_B_ROWS, totals: { overdue: 2, needClarification: 1, received: 2, notYetDue: 1 } },
  ]),
  schedule: [
    { id: 'b-sch-001', diListing: 'DI-101 | Cargo Deck Load Plan',             deliverable: 'Plan',         active: true,  scope: 'per-hull', cadence: 'Per Hull',    notes: '' },
    { id: 'b-sch-002', diListing: 'DI-102 | Ramp Hydraulic Schematic',         deliverable: 'Schematic',    active: true,  scope: 'per-hull', cadence: 'Per Hull',    notes: '' },
    { id: 'b-sch-003', diListing: 'DI-103 | Ballast Tank Inspection Report',   deliverable: 'Report',       active: true,  scope: 'per-hull', cadence: 'Per Hull',    notes: 'Post-survey.' },
    { id: 'b-sch-004', diListing: 'DI-104 | Navigation System Integration',    deliverable: 'Test Report',  active: true,  scope: 'series',   cadence: 'One-Time',    notes: '' },
    { id: 'b-sch-005', diListing: 'DI-105 | Mooring Equipment Spec',           deliverable: 'Spec',         active: true,  scope: 'per-hull', cadence: 'Per Hull',    notes: '' },
    { id: 'b-sch-006', diListing: 'DI-106 | Fire Pump Performance Curve',      deliverable: 'Curve Data',   active: true,  scope: 'series',   cadence: 'One-Time',    notes: 'Vendor-provided.' },
  ],
  library: [
    { id: 'b-lib-001', hullNo: 'LSV-01', swbs: '20', dataItemNo: 'DI-101 | Cargo Deck Load Plan',           itemNumber: null, dataItemTitle: 'Load Plan (LSV-01)' },
    { id: 'b-lib-002', hullNo: 'LSV-01', swbs: '50', dataItemNo: 'DI-102 | Ramp Hydraulic Schematic',       itemNumber: null, dataItemTitle: 'Ramp Hydraulics' },
    { id: 'b-lib-003', hullNo: 'LSV-02', swbs: '50', dataItemNo: 'DI-103 | Ballast Tank Inspection Report', itemNumber: null, dataItemTitle: 'Ballast Tank Inspection' },
    { id: 'b-lib-004', hullNo: 'LSV-02', swbs: '40', dataItemNo: 'DI-105 | Mooring Equipment Spec',         itemNumber: null, dataItemTitle: 'Mooring Spec' },
    { id: 'b-lib-005', hullNo: 'Series', swbs: '70', dataItemNo: 'DI-106 | Fire Pump Performance Curve',    itemNumber: null, dataItemTitle: 'Fire Pump Curves' },
    { id: 'b-lib-006', hullNo: 'Series', swbs: '60', dataItemNo: 'DI-104 | Navigation System Integration',  itemNumber: null, dataItemTitle: 'NAV Integration Test' },
  ],
}

/* ─── Vessel C: Vessel Class C (LCU-style landing craft) ─ */

const VESSEL_C_ROWS: DRLRow[] = [
  { id: 'vc-001', diNumber: 'DI-201', title: 'DI-201 Bow Ramp Structural Analysis — (Hull LCU-15)',
    contractDueFinish: '2026-05-01', calculatedDueDate: '60 DAC', submittalGuidance: '2026-05-01',
    actualSubmissionDate: '2026-04-29', received: 'Yes', calendarDaysToReview: 14,
    notes: 'Received and accepted. No comments.',
    status: 'green', scope: 'per-hull' },
  { id: 'vc-002', diNumber: 'DI-202', title: 'DI-202 Propulsion System FAT Report',
    contractDueFinish: '2026-04-20', calculatedDueDate: 'Post-FAT + 14 DAC', submittalGuidance: '2026-04-20',
    actualSubmissionDate: '', received: 'No', calendarDaysToReview: 7,
    notes: 'FAT scheduled with vendor 6/05. Report due 6/19.',
    status: 'pending', scope: 'series' },
  { id: 'vc-003', diNumber: 'DI-203', title: 'DI-203 Beach Landing Operations Manual — (Hull LCU-15)',
    contractDueFinish: '2026-03-31', calculatedDueDate: '90 DAC', submittalGuidance: '2026-03-31',
    actualSubmissionDate: '', received: 'No', calendarDaysToReview: 21,
    notes: 'Awaiting final crew familiarization sign-off before submission.',
    status: 'red', scope: 'per-hull' },
  { id: 'vc-004', diNumber: 'DI-204', title: 'DI-204 Hull Cathodic Protection Survey — (Hull LCU-16)',
    contractDueFinish: '2026-05-10', calculatedDueDate: '30 DAC', submittalGuidance: '2026-05-10',
    actualSubmissionDate: '2026-05-08', received: 'Yes', calendarDaysToReview: 7,
    notes: 'Received, under technical review.',
    status: 'yellow', scope: 'per-hull' },
  { id: 'vc-005', diNumber: 'DI-205', title: 'DI-205 Crew Berthing Compartment Drawings',
    contractDueFinish: '2026-04-15', calculatedDueDate: '45 DAC', submittalGuidance: '2026-04-15',
    actualSubmissionDate: '2026-04-12', received: 'Yes', calendarDaysToReview: 10,
    notes: 'Accepted. Revisions A/B closed out.',
    status: 'green', scope: 'series' },
]

const VESSEL_C: VesselDataset = {
  id: 'vessel-c',
  label: 'Vessel Class C',
  shortLabel: 'Class C',
  shipbuilder: 'Coastal Defense Yards',
  hulls: ['LCU-15', 'LCU-16'],
  icon: 'fa-water',
  description: 'Landing craft utility · 2 hulls active',
  rows: VESSEL_C_ROWS,
  brief: {
    reportDate: '2026-05-27',
    weekEnding: '2026-05-21',
    totals: { overdue: 1, needClarification: 1, received: 3 },
    kpis: [
      { metric: 'Total Items Tracked',     current: 5,      prior: 7,      changeLabel: '-2',     trend: 'down', statusLabel: 'Streamlining', statusTone: 'neutral' },
      { metric: 'Overdue Rate',            current: '20%',  prior: '43%',  changeLabel: '-23pp',  trend: 'down', statusLabel: 'Excellent', statusTone: 'positive' },
      { metric: 'Resolution Rate',         current: '60%',  prior: '29%',  changeLabel: '+31pp',  trend: 'up',   statusLabel: 'Strong',    statusTone: 'positive' },
      { metric: 'Clarification Backlog',   current: 1,      prior: 2,      changeLabel: '-1',     trend: 'down', statusLabel: 'Low',       statusTone: 'positive' },
    ],
    escalations: [
      { deliverable: 'DI-203 Beach Landing Operations Manual (LCU-15)', daysOverdue: 57, status: 'Overdue', requiredAction: 'Complete crew familiarization sign-off' },
    ],
    progressThisWeek: [
      'DI-201 Bow ramp structural analysis received & accepted',
      'DI-204 Cathodic survey received 5/08, under technical review',
      'DI-205 Crew berthing drawings closed out',
    ],
    concerns: [ 'Beach landing manual remains the only open critical item' ],
    recommendedActions: [
      'Schedule crew familiarization sign-off by 6/01',
      'Confirm DI-202 propulsion FAT date',
    ],
  },
  actions: [
    { id: 'c-act-001', priority: 'high', diTitle: 'DI-203 Beach Landing Operations Manual (LCU-15)',
      issue: 'Crew familiarization sign-off blocking submission',
      dueDate: '2026-03-31', daysOverdue: 57,
      requiredAction: 'Complete sign-off and submit manual',
      programOfficeNotes: 'Final blocker before submission',
      response: { text: '', plannedResolutionDate: null, poc: '', notes: '', dateSubmitted: null, receiptConfirmed: false } },
    { id: 'c-act-002', priority: 'medium', diTitle: 'DI-204 Hull Cathodic Protection Survey (LCU-16)',
      issue: 'Technical review of submitted survey pending',
      dueDate: '2026-05-10', daysOverdue: 0,
      requiredAction: 'Coordinate review with corrosion engineer',
      programOfficeNotes: 'Submission received — review only',
      response: { text: '', plannedResolutionDate: null, poc: '', notes: '', dateSubmitted: null, receiptConfirmed: false } },
  ],
  analytics: {
    lastRefreshed: '2026-05-27T11:35:00.000Z',
    metrics: [
      { label: 'Overdue',              current: 1, historical: 3, change: -2, pctChange: -67, trend: 'down' },
      { label: 'Submitted / Received', current: 3, historical: 2, change: +1, pctChange: +50, trend: 'up'   },
      { label: 'Need Clarification',   current: 1, historical: 2, change: -1, pctChange: -50, trend: 'down' },
      { label: 'Not Yet Due',          current: 1, historical: 0, change: +1, pctChange: 100, trend: 'up'   },
    ],
    series: [
      { weekEnding: '2026-04-09', overdue: 3, needClarification: 2, received: 2, notYetDue: 0 },
      { weekEnding: '2026-04-16', overdue: 3, needClarification: 2, received: 2, notYetDue: 0 },
      { weekEnding: '2026-04-23', overdue: 2, needClarification: 2, received: 2, notYetDue: 1 },
      { weekEnding: '2026-04-30', overdue: 2, needClarification: 1, received: 3, notYetDue: 1 },
      { weekEnding: '2026-05-07', overdue: 2, needClarification: 1, received: 3, notYetDue: 1 },
      { weekEnding: '2026-05-14', overdue: 1, needClarification: 1, received: 3, notYetDue: 1 },
      { weekEnding: '2026-05-21', overdue: 1, needClarification: 1, received: 3, notYetDue: 1 },
    ],
    topOffenders: [
      { diNumber: 'DI-203', weeksOverdue: 8, lastSeen: '2026-05-21' },
    ],
    statusDistribution: [
      { label: 'Overdue',       current: 1, historical: 3, color: '#dc2626' },
      { label: 'Clarification', current: 1, historical: 2, color: '#d97706' },
      { label: 'Received',      current: 3, historical: 2, color: '#16a34a' },
      { label: 'Not Yet Due',   current: 1, historical: 0, color: '#0071e3' },
    ],
    typeBreakdown: [
      { type: 'Per Hull', total: 3, overdue: 1, received: 1, clarification: 1 },
      { type: 'Series',   total: 2, overdue: 0, received: 1, clarification: 0 },
    ],
    aging: [
      { bucket: '0–14 days',  count: 0, pct: 0.00, risk: 'low' },
      { bucket: '15–30 days', count: 0, pct: 0.00, risk: 'medium' },
      { bucket: '31–60 days', count: 1, pct: 1.00, risk: 'high' },
      { bucket: '60+ days',   count: 0, pct: 0.00, risk: 'critical' },
    ],
    hulls: [
      { hull: 'LCU-15', total: 2, overdue: 1, received: 1, clarification: 0, notYetDue: 0 },
      { hull: 'LCU-16', total: 1, overdue: 0, received: 0, clarification: 1, notYetDue: 0 },
      { hull: 'Series', total: 2, overdue: 0, received: 1, clarification: 0, notYetDue: 1 },
    ],
    kpis: [
      { label: 'Overdue Rate',          value: '20%',  status: 'good', note: 'Low' },
      { label: 'Resolution Rate',       value: '60%',  status: 'good', note: 'Excellent' },
      { label: 'Clarification Backlog', value: '20%',  status: 'good', note: 'Low' },
      { label: 'Critical Risk (5)',     value: 0,      status: 'good', note: 'None' },
      { label: 'Max Days Overdue',      value: 57,     status: 'warn', note: 'Moderate' },
      { label: 'Avg Days Overdue',      value: 57,     status: 'warn', note: 'Single item' },
      { label: 'Avg Review Days',       value: 11.8,   status: 'good', note: 'On track' },
      { label: 'Per Hull % Overdue',    value: '100%', status: 'warn', note: 'LCU-15 only' },
    ],
    priorityItems: [
      { rank: 1, title: 'DI-203 Beach Landing Operations Manual (LCU-15)', scope: 'Per Hull', status: 'Overdue', daysOverdue: 57, risk: 4, action: 'Complete crew familiarization sign-off' },
      { rank: 2, title: 'DI-204 Hull Cathodic Protection Survey (LCU-16)', scope: 'Per Hull', status: 'Clarification', daysOverdue: 0, risk: 2, action: 'Coordinate technical review' },
    ],
  },
  archive: backfillArchive(VESSEL_C_ROWS, [
    { weekEnding: '2026-04-09', capturedAt: '2026-04-09T17:00:00Z', rows: [], totals: { overdue: 3, needClarification: 2, received: 2, notYetDue: 0 } },
    { weekEnding: '2026-04-16', capturedAt: '2026-04-16T17:00:00Z', rows: [], totals: { overdue: 3, needClarification: 2, received: 2, notYetDue: 0 } },
    { weekEnding: '2026-04-23', capturedAt: '2026-04-23T17:00:00Z', rows: [], totals: { overdue: 2, needClarification: 2, received: 2, notYetDue: 1 } },
    { weekEnding: '2026-04-30', capturedAt: '2026-04-30T17:00:00Z', rows: [], totals: { overdue: 2, needClarification: 1, received: 3, notYetDue: 1 } },
    { weekEnding: '2026-05-07', capturedAt: '2026-05-07T17:00:00Z', rows: [], totals: { overdue: 2, needClarification: 1, received: 3, notYetDue: 1 } },
    { weekEnding: '2026-05-14', capturedAt: '2026-05-14T17:00:00Z', rows: [], totals: { overdue: 1, needClarification: 1, received: 3, notYetDue: 1 } },
    { weekEnding: '2026-05-21', capturedAt: '2026-05-21T17:00:00Z', rows: VESSEL_C_ROWS, totals: { overdue: 1, needClarification: 1, received: 3, notYetDue: 1 } },
  ]),
  schedule: [
    { id: 'c-sch-001', diListing: 'DI-201 | Bow Ramp Structural Analysis',  deliverable: 'Analysis',   active: true,  scope: 'per-hull', cadence: 'Per Hull',    notes: '' },
    { id: 'c-sch-002', diListing: 'DI-202 | Propulsion System FAT Report',  deliverable: 'Report',     active: true,  scope: 'series',   cadence: 'One-Time',    notes: 'Post-FAT.' },
    { id: 'c-sch-003', diListing: 'DI-203 | Beach Landing Operations Manual', deliverable: 'Manual',   active: true,  scope: 'per-hull', cadence: 'Per Hull',    notes: '' },
    { id: 'c-sch-004', diListing: 'DI-204 | Hull Cathodic Protection Survey', deliverable: 'Survey',   active: true,  scope: 'per-hull', cadence: 'Annually',    notes: '' },
    { id: 'c-sch-005', diListing: 'DI-205 | Crew Berthing Compartment Drawings', deliverable: 'Drawings', active: true, scope: 'series', cadence: 'One-Time',   notes: '' },
  ],
  library: [
    { id: 'c-lib-001', hullNo: 'LCU-15', swbs: '10', dataItemNo: 'DI-201 | Bow Ramp Structural Analysis',     itemNumber: null, dataItemTitle: 'Bow Ramp Analysis' },
    { id: 'c-lib-002', hullNo: 'LCU-15', swbs: '60', dataItemNo: 'DI-203 | Beach Landing Operations Manual',   itemNumber: null, dataItemTitle: 'Landing Ops Manual' },
    { id: 'c-lib-003', hullNo: 'LCU-16', swbs: '10', dataItemNo: 'DI-204 | Hull Cathodic Protection Survey',   itemNumber: null, dataItemTitle: 'Cathodic Survey' },
    { id: 'c-lib-004', hullNo: 'Series', swbs: '30', dataItemNo: 'DI-202 | Propulsion System FAT Report',      itemNumber: null, dataItemTitle: 'Propulsion FAT' },
    { id: 'c-lib-005', hullNo: 'Series', swbs: '40', dataItemNo: 'DI-205 | Crew Berthing Compartment Drawings', itemNumber: null, dataItemTitle: 'Crew Berthing Drawings' },
  ],
}

/* ─── Registry ─────────────────────────────────────────── */

export const VESSELS: VesselDataset[] = [VESSEL_A, VESSEL_B, VESSEL_C]

export function getVesselDataset(id: VesselId): VesselDataset {
  return VESSELS.find(v => v.id === id) ?? VESSELS[0]
}
