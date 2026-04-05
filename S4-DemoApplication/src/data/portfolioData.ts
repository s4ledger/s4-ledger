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
]

/* ─── Contract → DRL mapping ───────────────────────────────── */
// Existing sampleData items are CTR-001 (patrol boats + RHIBs).
// CTR-002 covers harbor tugs + utility boats.

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
