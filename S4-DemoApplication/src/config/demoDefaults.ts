/**
 * ═══════════════════════════════════════════════════════════════
 *  Demo Defaults — All hardcoded data for demonstration mode.
 *  These are the EXACT values that were previously scattered
 *  across nsercIdeService.ts, sampleData.ts, portfolioData.ts,
 *  and chatService.ts. Extracted here as a single source of truth.
 *
 *  In production mode, these are replaced by s4-config.json.
 *  In demo mode, these load automatically — zero behavior change.
 * ═══════════════════════════════════════════════════════════════
 */

import type { S4Config, CraftEntry, ContractMappingRule, SchemaMapping, DRLTemplate } from './appConfig'
import type { DRLRow, Program, Contract } from '../types'

/* ─── Craft Registry (was PMS300_CRAFT_REGISTRY) ──────────── */

export const DEMO_CRAFT_REGISTRY: CraftEntry[] = [
  { label: 'APL-101',  desc: 'Barracks craft — hull 1' },
  { label: 'APL-102',  desc: 'Barracks craft — hull 2' },
  { label: 'YRBM-51', desc: 'Repair barge — hull 1' },
  { label: 'YRBM-52', desc: 'Repair barge — hull 2' },
  { label: 'YTB-810', desc: 'Harbor tug — hull 1' },
  { label: 'YTB-811', desc: 'Harbor tug — hull 2' },
]

/* ─── Programs (was portfolioData programs) ───────────────── */

export const DEMO_PROGRAMS: Program[] = [
  {
    id: 'PGM-001',
    name: 'U.S. Navy & FMS Boats and Craft',
    shortName: 'PMS 300',
    description: 'Boats & Craft acquisition and sustainment for the U.S. Navy and Foreign Military Sales',
    programManager: 'CAPT J. Richardson',
    contracts: [],
  },
]

/* ─── Contracts (was portfolioData contracts) ─────────────── */

export const DEMO_CONTRACTS: Contract[] = [
  {
    id: 'CTR-001',
    programId: 'PGM-001',
    contractNumber: 'N00024-23-C-6200',
    title: 'Patrol Boat & RHIB Multi-Hull Acquisition',
    contractor: 'Maritime Defense Systems, Inc.',
    shipbuilder: 'Gulf Coast Shipyard',
    awardDate: '2023-06-15',
    popEnd: '2027-12-31',
    totalValue: '$45.2M',
    status: 'active',
  },
  {
    id: 'CTR-002',
    programId: 'PGM-001',
    contractNumber: 'N00024-24-C-3100',
    title: 'Harbor Tug & Utility Craft Services',
    contractor: 'Atlantic Marine Corp.',
    shipbuilder: 'Chesapeake Shipbuilding',
    awardDate: '2024-01-20',
    popEnd: '2028-06-30',
    totalValue: '$28.7M',
    status: 'active',
  },
]

/* ─── Contract Mapping Rules ──────────────────────────────── */

export const DEMO_CONTRACT_MAPPING: ContractMappingRule[] = [
  { contractId: 'CTR-001', patterns: ['patrol boat', 'rhib'] },
  { contractId: 'CTR-002', patterns: ['harbor tug', 'utility boat', 'diving support', 'force protection'] },
]

/* ─── SharePoint Schema Mapping (default column names) ────── */

export const DEMO_SCHEMA_MAPPING: SchemaMapping = {
  drlId: 'DRL_ID',
  title: 'Title',
  diNumber: 'DI_Number',
  contractDue: 'Contract_Due',
  calcDueDate: 'Calc_Due_Date',
  submittalGuide: 'Submittal_Guide',
  actualSubDate: 'Actual_Sub_Date',
  received: 'Received',
  calDaysReview: 'Cal_Days_Review',
  notes: 'Notes',
  status: 'Status',
  revision: 'Revision',
  comments: 'Comments',
}

/* ─── DRL Templates (was NEW_CRAFT_TITLES + templates) ────── */

export const DEMO_DRL_TEMPLATES: DRLTemplate[] = [
  { titlePrefix: 'Systems Engineering Plan (SEP)',            diNumber: 'DI-SESS-81521', submittalGuidance: 'Submit via IDE 30 days prior to PDR' },
  { titlePrefix: 'Integrated Logistics Support Plan (ILSP)',  diNumber: 'DI-MGMT-81466', submittalGuidance: 'Monthly — 10th of each month' },
  { titlePrefix: 'Test and Evaluation Master Plan (TEMP)',     diNumber: 'DI-ILSS-80890', submittalGuidance: 'Submit 90 days prior to IOT&E' },
  { titlePrefix: 'Configuration Management Plan (CMP)',        diNumber: 'DI-RELI-80531A', submittalGuidance: 'Submit with TEMP update' },
  { titlePrefix: 'Reliability Program Plan (RPP)',             diNumber: 'DI-RELI-81315', submittalGuidance: 'Submit NLT SRR + 30 calendar days' },
  { titlePrefix: 'Training Plan',                              diNumber: 'DI-ILSS-80890', submittalGuidance: 'Submit 90 days prior to IOT&E' },
  { titlePrefix: 'Quality Assurance Plan (QAP)',               diNumber: 'DI-QCIC-80123A', submittalGuidance: 'Submit 30 days prior to PDR' },
  { titlePrefix: 'Software Development Plan (SDP)',            diNumber: 'DI-IPSC-81427A', submittalGuidance: 'Submit 45 days after PDR' },
]

/* ─── Chat Craft Channels ─────────────────────────────────── */

export const DEMO_CHAT_CRAFT_CHANNELS = ['APL-101', 'YRBM-51', 'YTB-810']

/* ─── Sample Data (was sampleData.ts) ─────────────────────── */

export const DEMO_SAMPLE_DATA: DRLRow[] = [
  {
    id: 'DRL-001',
    vesselId: 'APL-101',
    title: 'Systems Engineering Plan (SEP) Rev B (APL-101)',
    diNumber: 'DI-MGMT-81024A',
    contractDueFinish: '2025-01-15',
    calculatedDueDate: '2025-01-15',
    submittalGuidance: 'Submit 30 days after contract award',
    actualSubmissionDate: '2025-01-10',
    received: 'Yes',
    calendarDaysToReview: 12,
    notes: 'Completed with minor comments incorporated.',
    status: 'green',
    responsibleParty: 'Shipbuilder',
    govNotes: 'Accepted. Filed in EDMS. Minor formatting comments resolved.',
    shipbuilderNotes: 'Submitted on time. Comments incorporated per Rev B.',
  },
  {
    id: 'DRL-002',
    vesselId: 'APL-101',
    title: 'Test and Evaluation Master Plan (TEMP) Rev A (APL-101)',
    diNumber: 'DI-TMSS-80301C',
    contractDueFinish: '2025-02-01',
    calculatedDueDate: '2025-02-01',
    submittalGuidance: 'Submit 60 days prior to CDR',
    actualSubmissionDate: '2025-02-05',
    received: 'Yes',
    calendarDaysToReview: 18,
    notes: 'Submitted 4 days late. Non-compliance: test matrix incomplete per TEMP DI requirements.',
    status: 'yellow',
    responsibleParty: 'Shipbuilder',
    govNotes: 'Late submission. Test matrix missing 3 required test events. RID-2025-004 issued.',
    shipbuilderNotes: 'Working on test matrix update. Targeting 2025-02-20 for resubmission.',
  },
  {
    id: 'DRL-003',
    vesselId: 'YRBM-51',
    title: 'Integrated Logistics Support Plan (ILSP) (YRBM-51)',
    diNumber: 'DI-ALSS-81529',
    contractDueFinish: '2025-02-15',
    calculatedDueDate: '2025-02-15',
    submittalGuidance: 'Submit with SRR deliverables',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: 'OVERDUE — not yet submitted. Escalated to PM.',
    status: 'red',
    responsibleParty: 'Shipbuilder',
    govNotes: 'Escalated. Shipbuilder cited subcontractor delays. CAR under consideration.',
    shipbuilderNotes: 'Subcontractor logistics data package delayed. Targeting end of month.',
  },
  {
    id: 'DRL-004',
    vesselId: 'APL-102',
    title: 'Software Development Plan (SDP) Rev C (APL-102)',
    diNumber: 'DI-IPSC-81427A',
    contractDueFinish: '2025-03-01',
    calculatedDueDate: '2025-03-01',
    submittalGuidance: 'Submit 45 days after PDR',
    actualSubmissionDate: '2025-02-28',
    received: 'Yes',
    calendarDaysToReview: 7,
    notes: 'Completed. No action required.',
    status: 'green',
    responsibleParty: 'Shipbuilder',
    govNotes: 'Accepted without comment. Meets all DI requirements.',
    shipbuilderNotes: 'Rev C submitted on schedule.',
  },
  {
    id: 'DRL-005',
    vesselId: 'YRBM-51',
    title: 'Configuration Management Plan (CMP) (YRBM-51)',
    diNumber: 'DI-CMAN-80858B',
    contractDueFinish: '2025-03-10',
    calculatedDueDate: '2025-03-10',
    submittalGuidance: 'Submit with SDP',
    actualSubmissionDate: '2025-03-12',
    received: 'Yes',
    calendarDaysToReview: 22,
    notes: 'Comments pending resolution — 2 RIDs open. Prior review comments from Rev A not addressed.',
    status: 'yellow',
    responsibleParty: 'Shipbuilder',
    govNotes: 'RID-2025-007 and RID-2025-008 issued. Prior Rev A comments (sections 3.2, 4.1) still not incorporated.',
    shipbuilderNotes: 'Addressing RIDs. Rev A comments being incorporated into Rev B draft.',
  },
  {
    id: 'DRL-006',
    vesselId: 'YTB-810',
    title: 'Reliability Program Plan (RPP) (YTB-810)',
    diNumber: 'DI-RELI-81315',
    contractDueFinish: '2025-03-15',
    calculatedDueDate: '2025-03-15',
    submittalGuidance: 'Submit NLT SRR + 30 calendar days',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: 'OVERDUE — contractor cited staffing delays.',
    status: 'red',
    responsibleParty: 'Shipbuilder',
    govNotes: 'Overdue 19 days. Shipbuilder staffing issue acknowledged. Weekly status required.',
    shipbuilderNotes: 'Reliability engineer onboarding complete. Draft in progress.',
  },
  {
    id: 'DRL-007',
    vesselId: 'YRBM-52',
    title: 'Quality Assurance Plan (QAP) Rev B (YRBM-52)',
    diNumber: 'DI-QCIC-80123A',
    contractDueFinish: '2025-04-01',
    calculatedDueDate: '2025-04-01',
    submittalGuidance: 'Submit 30 days prior to PDR',
    actualSubmissionDate: '2025-03-28',
    received: 'Yes',
    calendarDaysToReview: 10,
    notes: 'Accepted. Filed in EDMS.',
    status: 'green',
    responsibleParty: 'Shipbuilder',
    govNotes: 'Accepted. All quality standards addressed per MIL-STD-1520C.',
    shipbuilderNotes: 'QAP Rev B submitted early. No further action.',
  },
  {
    id: 'DRL-008',
    vesselId: 'APL-102',
    title: 'Technical Performance Measurement Report (APL-102)',
    diNumber: 'DI-MGMT-81466',
    contractDueFinish: '2025-04-15',
    calculatedDueDate: '2025-04-15',
    submittalGuidance: 'Monthly — 10th of each month',
    actualSubmissionDate: '2025-04-14',
    received: 'Yes',
    calendarDaysToReview: 5,
    notes: 'On track. No discrepancies noted.',
    status: 'green',
    responsibleParty: 'Shipbuilder',
    govNotes: 'TPM data consistent with EVM reports. No action.',
    shipbuilderNotes: 'Monthly report submitted. All KPPs within threshold.',
  },
  {
    id: 'DRL-009',
    vesselId: 'YTB-810',
    title: 'Interface Control Document (ICD) Rev A (YTB-810)',
    diNumber: 'DI-SESS-81248A',
    contractDueFinish: '2025-04-30',
    calculatedDueDate: '2025-04-30',
    submittalGuidance: 'Submit 15 days prior to CDR',
    actualSubmissionDate: '2025-05-02',
    received: 'Yes',
    calendarDaysToReview: 30,
    notes: 'Late submission. Non-compliance: 3 TBDs remain unresolved. Contract requires all TBDs resolved at CDR.',
    status: 'yellow',
    responsibleParty: 'Shipbuilder',
    govNotes: 'Late 2 days. 3 TBDs in sections 5.2, 6.1, 7.3 violate CDR entry criteria. RID-2025-012 issued.',
    shipbuilderNotes: 'TBDs being worked. Awaiting GFI data for section 7.3.',
  },
  {
    id: 'DRL-011',
    vesselId: 'YTB-811',
    title: 'Training Plan Rev A (YTB-811)',
    diNumber: 'DI-ILSS-80890',
    contractDueFinish: '2025-05-15',
    calculatedDueDate: '2025-05-15',
    submittalGuidance: 'Submit 90 days prior to IOT&E',
    actualSubmissionDate: '2025-05-10',
    received: 'Yes',
    calendarDaysToReview: 14,
    notes: 'Submitted on time. Under government review — no issues identified yet.',
    status: 'pending',
    responsibleParty: 'Government',
    govNotes: 'In QA review queue. Reviewer assigned: J. Martinez. Target completion: 2025-05-24.',
    shipbuilderNotes: 'Submitted 5 days early. Awaiting Gov\'t review.',
  },
  // ── PS-driven milestone-linked DRL rows ──────────────────────────
  {
    id: 'DRL-015',
    vesselId: 'APL-101',
    title: "Builder's Trial Readiness Report (APL-101)",
    diNumber: 'DI-TMSS-80313',
    contractDueFinish: '',
    calculatedDueDate: '',
    submittalGuidance: "Submit 15 days after builder's trial (BT)",
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: 'Due date driven by APL-101 BT milestone in Program Schedule.',
    status: 'pending',
    responsibleParty: 'Shipbuilder',
    govNotes: '',
    shipbuilderNotes: 'Awaiting BT completion. Draft in progress.',
  },
  {
    id: 'DRL-016',
    vesselId: 'APL-101',
    title: 'Pre-Delivery ILS Inspection Checklist (APL-101)',
    diNumber: 'DI-ALSS-81530',
    contractDueFinish: '',
    calculatedDueDate: '',
    submittalGuidance: 'Submit 14 days prior to BT',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: 'Due date computed from APL-101 BT milestone minus 14 days.',
    status: 'pending',
    responsibleParty: 'Shipbuilder',
    govNotes: '',
    shipbuilderNotes: '',
  },
  {
    id: 'DRL-017',
    vesselId: 'APL-101',
    title: 'Ship Acceptance Document (APL-101)',
    diNumber: 'DI-NDTI-80566',
    contractDueFinish: '',
    calculatedDueDate: '',
    submittalGuidance: 'Submit at acceptance trial (AT)',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: 'Due date is APL-101 AT milestone date from Program Schedule.',
    status: 'pending',
    responsibleParty: 'Government',
    govNotes: '',
    shipbuilderNotes: '',
  },
  {
    id: 'DRL-018',
    vesselId: 'APL-101',
    title: 'As-Built Drawing Package (APL-101)',
    diNumber: 'DI-SESS-81020',
    contractDueFinish: '',
    calculatedDueDate: '',
    submittalGuidance: 'Submit 30 days after delivery (DEL)',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: 'Due date = APL-101 DEL milestone + 30 calendar days.',
    status: 'pending',
    responsibleParty: 'Shipbuilder',
    govNotes: '',
    shipbuilderNotes: 'Drawing package accumulation started. Final reconciliation post-delivery.',
  },
  {
    id: 'DRL-019',
    vesselId: 'YRBM-51',
    title: 'Delivery Documentation Package (YRBM-51)',
    diNumber: 'DI-NDTI-81003',
    contractDueFinish: '',
    calculatedDueDate: '',
    submittalGuidance: 'Submit at ship delivery (DEL)',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: 'Due at YRBM-51 delivery milestone. Synced from Program Schedule.',
    status: 'pending',
    responsibleParty: 'Shipbuilder',
    govNotes: '',
    shipbuilderNotes: '',
  },
]

/* ─── Assemble full demo config ───────────────────────────── */

export function getDemoConfig(): S4Config {
  // Wire programs ← contracts
  const programs = DEMO_PROGRAMS.map(p => ({
    ...p,
    contracts: DEMO_CONTRACTS.filter(c => c.programId === p.id),
  }))

  return {
    mode: 'demo',
    craftRegistry: DEMO_CRAFT_REGISTRY,
    programs,
    contracts: DEMO_CONTRACTS,
    contractMapping: DEMO_CONTRACT_MAPPING,
    schemaMapping: DEMO_SCHEMA_MAPPING,
    sampleData: DEMO_SAMPLE_DATA,
    drlTemplates: DEMO_DRL_TEMPLATES,
    chatCraftChannels: DEMO_CHAT_CRAFT_CHANNELS,
  }
}
