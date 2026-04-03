export interface DRLRow {
  id: string
  title: string
  diNumber: string
  contractDueFinish: string
  calculatedDueDate: string
  submittalGuidance: string
  actualSubmissionDate: string
  received: string
  calendarDaysToReview: number | null
  notes: string
  status: 'green' | 'yellow' | 'red' | 'pending'
  /** Shipbuilder-specific notes (visible to Shipbuilder, synced to Gov't) */
  shipbuilderNotes?: string
  /** Government internal notes (never visible to Shipbuilder) */
  govNotes?: string
  /** Which org is responsible for the current action */
  responsibleParty?: Organization
}

export interface AnchorRecord {
  rowId: string
  hash: string
  timestamp: string
  txHash: string
  ledgerIndex: number
  network: string
  explorerUrl: string | null
  slsFee: string | null
}

export interface VerifyResult {
  rowId: string
  title: string
  currentHash: string
  anchoredHash: string
  match: boolean
  anchoredAt: string
  txHash: string
}

export type UserRole = 'Program Manager' | 'Contracting Officer' | 'Quality Assurance' | 'Logistics Specialist'

export type Organization = 'Government' | 'Contractor' | 'Shipbuilder'

export type AuthStage = 'cac' | 'welcome' | 'role' | 'tracker'

/* ─── Spreadsheet Column Configuration ────────────────────────
   Each org gets a structurally different spreadsheet with its
   own columns, labels, and edit permissions. All three read/write
   to the same shared database via the DRLRow interface.
   ─────────────────────────────────────────────────────────── */

/** All possible column keys that can appear in any spreadsheet */
export type ColumnKey =
  | 'title'
  | 'diNumber'
  | 'contractDueFinish'
  | 'calculatedDueDate'
  | 'submittalGuidance'
  | 'actualSubmissionDate'
  | 'received'
  | 'calendarDaysToReview'
  | 'notes'
  | 'shipbuilderNotes'
  | 'govNotes'
  | 'responsibleParty'
  | 'status'

/** Configuration for a single column in an org's spreadsheet */
export interface ColumnConfig {
  key: ColumnKey
  label: string
  width: string
  editable: boolean
  /** Whether this column maps to a DRLRow field directly */
  field: keyof DRLRow
}

/** Full spreadsheet configuration for an org */
export interface SpreadsheetConfig {
  org: Organization
  label: string
  columns: ColumnConfig[]
}
