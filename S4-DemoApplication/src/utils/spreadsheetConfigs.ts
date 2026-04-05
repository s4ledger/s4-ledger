import { Organization, ColumnConfig, ColumnKey, SpreadsheetConfig } from '../types'

/* ═══════════════════════════════════════════════════════════════
   Three Distinct Spreadsheet Configurations
   ═══════════════════════════════════════════════════════════════
   Each organization has a structurally different spreadsheet —
   different columns, labels, widths, and edit permissions.
   All three read from and write to one shared database (DRLRow).
   When any org edits their spreadsheet, changes propagate to all.

   Government  — Full picture: every column, every note, full edit
   Contractor  — Nearly full, but Gov't can restrict via permissions
   Shipbuilder — Their own spreadsheet for their workflow: submission
                  tracking, their notes, compliance responses. Cannot
                  see Gov't internal notes or review-day columns.
   ═══════════════════════════════════════════════════════════════ */

/* ─── Government Spreadsheet ─────────────────────────────────── */
const GOV_COLUMNS: ColumnConfig[] = [
  { key: 'title',                label: 'S4 DRL(S) TITLE / REVISIONS',  width: 'min-w-[220px] w-[18%]', editable: true,  field: 'title' },
  { key: 'diNumber',             label: 'DI NUMBER',                    width: 'min-w-[110px] w-[9%]',  editable: true,  field: 'diNumber' },
  { key: 'contractDueFinish',    label: 'CONTRACT DUE: FINISH',         width: 'min-w-[110px] w-[8%]',  editable: true,  field: 'contractDueFinish' },
  { key: 'calculatedDueDate',    label: 'CALCULATED DUE DATE',          width: 'min-w-[110px] w-[8%]',  editable: true,  field: 'calculatedDueDate' },
  { key: 'submittalGuidance',    label: 'SUBMITTAL GUIDANCE',           width: 'min-w-[130px] w-[10%]', editable: true,  field: 'submittalGuidance' },
  { key: 'actualSubmissionDate', label: 'ACTUAL SUBMISSION DATE',       width: 'min-w-[110px] w-[8%]',  editable: true,  field: 'actualSubmissionDate' },
  { key: 'received',             label: 'RCVD',                         width: 'min-w-[55px] w-[4%]',   editable: true,  field: 'received' },
  { key: 'calendarDaysToReview', label: 'CAL DAYS TO REVIEW',           width: 'min-w-[80px] w-[6%]',   editable: true,  field: 'calendarDaysToReview' },
  { key: 'responsibleParty',     label: 'RESPONSIBLE PARTY',            width: 'min-w-[100px] w-[7%]',  editable: true,  field: 'responsibleParty' },
  { key: 'notes',                label: 'NOTES / REMARKS',              width: 'min-w-[140px] w-[10%]', editable: true,  field: 'notes' },
  { key: 'govNotes',             label: 'GOV\'T INTERNAL NOTES',        width: 'min-w-[120px] w-[8%]',  editable: true,  field: 'govNotes' },
  { key: 'shipbuilderNotes',     label: 'SHIPBUILDER NOTES',            width: 'min-w-[120px] w-[8%]',  editable: false, field: 'shipbuilderNotes' },
]

/* ─── Contractor Spreadsheet ─────────────────────────────────── */
const CONTRACTOR_COLUMNS: ColumnConfig[] = [
  { key: 'title',                label: 'S4 DRL(S) TITLE / REVISIONS',  width: 'min-w-[220px] w-[18%]', editable: true,  field: 'title' },
  { key: 'diNumber',             label: 'DI NUMBER',                    width: 'min-w-[110px] w-[9%]',  editable: true,  field: 'diNumber' },
  { key: 'contractDueFinish',    label: 'CONTRACT DUE: FINISH',         width: 'min-w-[110px] w-[9%]',  editable: true,  field: 'contractDueFinish' },
  { key: 'calculatedDueDate',    label: 'CALCULATED DUE DATE',          width: 'min-w-[110px] w-[9%]',  editable: true,  field: 'calculatedDueDate' },
  { key: 'submittalGuidance',    label: 'SUBMITTAL GUIDANCE',           width: 'min-w-[130px] w-[11%]', editable: true,  field: 'submittalGuidance' },
  { key: 'actualSubmissionDate', label: 'ACTUAL SUBMISSION DATE',       width: 'min-w-[110px] w-[9%]',  editable: true,  field: 'actualSubmissionDate' },
  { key: 'received',             label: 'RCVD',                         width: 'min-w-[55px] w-[4%]',   editable: true,  field: 'received' },
  { key: 'calendarDaysToReview', label: 'CAL DAYS TO REVIEW',           width: 'min-w-[80px] w-[6%]',   editable: true,  field: 'calendarDaysToReview' },
  { key: 'responsibleParty',     label: 'RESPONSIBLE PARTY',            width: 'min-w-[100px] w-[7%]',  editable: false, field: 'responsibleParty' },
  { key: 'notes',                label: 'NOTES / REMARKS',              width: 'min-w-[140px] w-[10%]', editable: true,  field: 'notes' },
  { key: 'shipbuilderNotes',     label: 'SHIPBUILDER NOTES',            width: 'min-w-[120px] w-[8%]',  editable: false, field: 'shipbuilderNotes' },
]

/* ─── Shipbuilder Spreadsheet ────────────────────────────────── */
const SHIPBUILDER_COLUMNS: ColumnConfig[] = [
  { key: 'title',                label: 'DELIVERABLE TITLE',            width: 'min-w-[220px] w-[22%]', editable: false, field: 'title' },
  { key: 'diNumber',             label: 'DI NUMBER',                    width: 'min-w-[110px] w-[10%]', editable: false, field: 'diNumber' },
  { key: 'contractDueFinish',    label: 'CONTRACT DUE DATE',            width: 'min-w-[110px] w-[10%]', editable: false, field: 'contractDueFinish' },
  { key: 'calculatedDueDate',    label: 'CALCULATED DUE DATE',          width: 'min-w-[110px] w-[10%]', editable: false, field: 'calculatedDueDate' },
  { key: 'submittalGuidance',    label: 'SUBMITTAL GUIDANCE',           width: 'min-w-[130px] w-[12%]', editable: false, field: 'submittalGuidance' },
  { key: 'actualSubmissionDate', label: 'SUBMISSION DATE',              width: 'min-w-[110px] w-[10%]', editable: true,  field: 'actualSubmissionDate' },
  { key: 'received',             label: 'RCVD',                         width: 'min-w-[55px] w-[5%]',   editable: false, field: 'received' },
  { key: 'shipbuilderNotes',     label: 'NOTES / COMMENTS',             width: 'min-w-[180px] w-[15%]', editable: true,  field: 'shipbuilderNotes' },
]

/* ─── Config map ────────────────────────────────────────────── */
const SPREADSHEET_CONFIGS: Record<Organization, SpreadsheetConfig> = {
  Government: {
    org: 'Government',
    label: 'Government Deliverables Tracker',
    columns: GOV_COLUMNS,
  },
  Contractor: {
    org: 'Contractor',
    label: 'Contractor Deliverables Tracker',
    columns: CONTRACTOR_COLUMNS,
  },
  Shipbuilder: {
    org: 'Shipbuilder',
    label: 'Shipbuilder Deliverables Tracker',
    columns: SHIPBUILDER_COLUMNS,
  },
}

/** Get the spreadsheet configuration for the given org */
export function getSpreadsheetConfig(org: Organization): SpreadsheetConfig {
  return SPREADSHEET_CONFIGS[org]
}

/** All possible columns that Gov't can grant/revoke for Contractor */
export const CONTRACTOR_GRANTABLE_COLUMNS: ColumnKey[] = [
  'calendarDaysToReview',
  'responsibleParty',
  'govNotes',
]

/**
 * Dynamically build the Contractor spreadsheet columns based on
 * what the Government has granted. Starts from base CONTRACTOR_COLUMNS
 * and adds any granted extras.
 */
export function getContractorColumnsWithGrants(grants: Set<ColumnKey>): ColumnConfig[] {
  const base = [...CONTRACTOR_COLUMNS]
  // If Gov't grants govNotes visibility, insert before shipbuilderNotes
  if (grants.has('govNotes')) {
    const sbIdx = base.findIndex(c => c.key === 'shipbuilderNotes')
    base.splice(sbIdx, 0, {
      key: 'govNotes',
      label: "GOV'T NOTES (GRANTED)",
      width: 'w-[8%]',
      editable: false,
      field: 'govNotes',
    })
  }
  return base
}

// Re-export ColumnKey for convenience
export type { ColumnKey } from '../types'
