import { Program, Contract, DRLRow } from '../types'

/* ─── Programs ──────────────────────────────────────────────── */

export const programs: Program[] = [
  {
    id: 'PGM-001',
    name: 'U.S. Navy & FMS Boats and Craft',
    shortName: 'PMS 300',
    description: 'Boats & Craft acquisition and sustainment for the U.S. Navy and Foreign Military Sales',
    programManager: 'CAPT J. Richardson',
    contracts: [],   // populated below
  },
  {
    id: 'PGM-002',
    name: 'Coastal Patrol Craft Program',
    shortName: 'CPC',
    description: 'Next-generation coastal patrol craft for allied nations under FMS',
    programManager: 'CDR L. Alvarez',
    contracts: [],
  },
]

/* ─── Contracts ─────────────────────────────────────────────── */

export const contracts: Contract[] = [
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
  {
    id: 'CTR-003',
    programId: 'PGM-002',
    contractNumber: 'N00024-25-C-1500',
    title: 'FMS Coastal Patrol Craft — Phase I',
    contractor: 'Sentinel Maritime LLC',
    shipbuilder: 'Bollinger Shipyards',
    awardDate: '2025-03-01',
    popEnd: '2029-09-30',
    totalValue: '$62.4M',
    status: 'active',
  },
]

/* ─── Contract → DRL mapping ───────────────────────────────── */
// Existing sampleData items are CTR-001 (patrol boats + RHIBs).
// CTR-002 covers harbor tugs + utility boats.
// CTR-003 is a new FMS contract with its own DRLs.

/** Assigns contractId to existing sampleData rows based on craft type in title */
export function assignContractIds(rows: DRLRow[]): DRLRow[] {
  return rows.map(row => {
    if (row.contractId) return row  // already assigned

    const title = row.title.toLowerCase()
    if (title.includes('patrol boat') || title.includes('rhib')) {
      return { ...row, contractId: 'CTR-001' }
    }
    if (title.includes('harbor tug') || title.includes('utility boat') || title.includes('diving support')) {
      return { ...row, contractId: 'CTR-002' }
    }
    if (title.includes('force protection')) {
      return { ...row, contractId: 'CTR-002' }
    }
    return { ...row, contractId: 'CTR-001' }  // default
  })
}

/** Additional DRL rows for CTR-003 (FMS Coastal Patrol Craft) */
export const fmsContractData: DRLRow[] = [
  {
    id: 'DRL-101',
    contractId: 'CTR-003',
    title: 'Systems Engineering Plan (SEP) Rev A (Coastal Patrol Craft — Hull 1)',
    diNumber: 'DI-MGMT-81024A',
    contractDueFinish: '2026-01-15',
    calculatedDueDate: '2026-01-15',
    submittalGuidance: 'Submit 30 days after contract award',
    actualSubmissionDate: '2026-01-12',
    received: 'Yes',
    calendarDaysToReview: 9,
    notes: 'Completed. Minor comments incorporated.',
    status: 'green',
    responsibleParty: 'Shipbuilder',
    govNotes: 'Accepted. FMS customer concurrence received.',
    shipbuilderNotes: 'Submitted ahead of schedule.',
  },
  {
    id: 'DRL-102',
    contractId: 'CTR-003',
    title: 'Integrated Logistics Support Plan (ILSP) (Coastal Patrol Craft — Hull 1)',
    diNumber: 'DI-ALSS-81529',
    contractDueFinish: '2026-02-28',
    calculatedDueDate: '2026-02-28',
    submittalGuidance: 'Submit with SRR deliverables',
    actualSubmissionDate: '2026-03-05',
    received: 'Yes',
    calendarDaysToReview: 20,
    notes: 'Submitted 5 days late. FMS customer review pending.',
    status: 'yellow',
    responsibleParty: 'Contractor',
    govNotes: 'Late submission. FMS customer notified. RID pending.',
    shipbuilderNotes: 'ILSP delivered. Awaiting FMS review feedback.',
  },
  {
    id: 'DRL-103',
    contractId: 'CTR-003',
    title: 'Test & Evaluation Master Plan (TEMP) (Coastal Patrol Craft — Hull 2)',
    diNumber: 'DI-TMSS-80301C',
    contractDueFinish: '2026-04-01',
    calculatedDueDate: '2026-04-01',
    submittalGuidance: 'Submit 60 days prior to CDR',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: 'Coming due — 25 days remaining.',
    status: 'pending',
    responsibleParty: 'Shipbuilder',
    govNotes: '',
    shipbuilderNotes: 'Draft TEMP in internal review. On track.',
  },
  {
    id: 'DRL-104',
    contractId: 'CTR-003',
    title: 'Configuration Management Plan (CMP) (Coastal Patrol Craft — Hull 1)',
    diNumber: 'DI-CMAN-80858B',
    contractDueFinish: '2026-03-15',
    calculatedDueDate: '2026-03-15',
    submittalGuidance: 'Submit with SDP',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: 'OVERDUE — 20 days past due. Contractor cited subcontractor delays.',
    status: 'red',
    responsibleParty: 'Contractor',
    govNotes: 'CAR under consideration. Weekly status updates required.',
    shipbuilderNotes: 'CM data package from sub delayed. Targeting Apr 10.',
  },
  {
    id: 'DRL-105',
    contractId: 'CTR-003',
    title: 'Quality Assurance Plan (QAP) (Coastal Patrol Craft — Hull 2)',
    diNumber: 'DI-QCIC-80123A',
    contractDueFinish: '2026-05-01',
    calculatedDueDate: '2026-05-01',
    submittalGuidance: 'Submit 30 days prior to PDR',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: 'Coming due — 27 days remaining.',
    status: 'pending',
    responsibleParty: 'Shipbuilder',
    govNotes: '',
    shipbuilderNotes: 'QAP template drafted. On schedule.',
  },
  {
    id: 'DRL-106',
    contractId: 'CTR-003',
    title: 'Software Development Plan (SDP) Rev A (Coastal Patrol Craft — Hull 1)',
    diNumber: 'DI-IPSC-81427A',
    contractDueFinish: '2026-03-01',
    calculatedDueDate: '2026-03-01',
    submittalGuidance: 'Submit 45 days after PDR',
    actualSubmissionDate: '2026-02-28',
    received: 'Yes',
    calendarDaysToReview: 11,
    notes: 'Completed. No action required.',
    status: 'green',
    responsibleParty: 'Shipbuilder',
    govNotes: 'Accepted. FMS customer review complete.',
    shipbuilderNotes: 'SDP Rev A delivered on time.',
  },
]

/* ─── Wire programs ←→ contracts ─────────────────────────── */
programs.forEach(p => {
  p.contracts = contracts.filter(c => c.programId === p.id)
})

/** Get all contracts for a program */
export function getContractsForProgram(programId: string): Contract[] {
  return contracts.filter(c => c.programId === programId)
}

/** Get contract by ID */
export function getContractById(contractId: string): Contract | undefined {
  return contracts.find(c => c.id === contractId)
}

/** Get program by ID */
export function getProgramById(programId: string): Program | undefined {
  return programs.find(p => p.id === programId)
}

/** Compute aggregate health stats for a set of DRL rows */
export function computeHealthStats(rows: DRLRow[]): {
  total: number
  green: number
  yellow: number
  red: number
  pending: number
  completionRate: number
  overdueRate: number
} {
  const total = rows.length
  const green = rows.filter(r => r.status === 'green').length
  const yellow = rows.filter(r => r.status === 'yellow').length
  const red = rows.filter(r => r.status === 'red').length
  const pending = rows.filter(r => r.status === 'pending').length
  return {
    total,
    green,
    yellow,
    red,
    pending,
    completionRate: total > 0 ? Math.round((green / total) * 100) : 0,
    overdueRate: total > 0 ? Math.round((red / total) * 100) : 0,
  }
}
