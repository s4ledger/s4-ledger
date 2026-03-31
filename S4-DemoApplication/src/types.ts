export interface CDRLRow {
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
  status: 'green' | 'yellow' | 'red'
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

export type AuthStage = 'cac' | 'welcome' | 'role' | 'tracker'
