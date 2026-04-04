/* ─── Portfolio Hierarchy: Program → Contract → DRL ───────── */

export interface Program {
  id: string
  name: string
  shortName: string                // e.g. "PMS 300"
  description: string
  programManager: string
  contracts: Contract[]
}

export interface Contract {
  id: string
  programId: string
  contractNumber: string           // e.g. "N00024-23-C-6200"
  title: string
  contractor: string
  shipbuilder: string
  awardDate: string
  popEnd: string                   // period of performance end
  totalValue: string               // e.g. "$45.2M"
  status: 'active' | 'closeout' | 'complete'
}

export interface DRLRow {
  id: string
  contractId?: string              // links row to a specific contract
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

/* ─── Document Attachments ────────────────────────────────── */

export type DocumentType = 'di_submittal' | 'sow_reference' | 'correspondence' | 'general'

export interface DocumentAttachment {
  id: string
  row_id: string
  file_name: string
  file_type: string           // MIME type
  file_size: number           // bytes
  storage_path: string | null // Supabase Storage path
  blob_url?: string           // in-memory URL for demo mode
  uploaded_by_email: string | null
  uploaded_by_role: string | null
  uploaded_by_org: string | null
  ai_analysis: AIDocAnalysis | null
  ai_analyzed_at: string | null
  notes: string | null
  document_type: DocumentType
  created_at: string
}

export interface AIDocAnalysis {
  summary: string
  compliance_items: { requirement: string; status: 'met' | 'partial' | 'missing'; detail: string }[]
  compliance_score: number    // 0-100
  recommendations: string[]
  extracted_text_preview: string
}
