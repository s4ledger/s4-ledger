import { Program, Contract, DRLRow } from '../types'
import { getConfigOrDemo, assignContractIdFromConfig } from '../config/appConfig'

/* ─── Config-driven programs & contracts ──────────────────── */

function getConfig() {
  return getConfigOrDemo()
}

/** Programs — loaded from config (production) or demo defaults */
export const programs: Program[] = getConfig().programs

/** Contracts — loaded from config (production) or demo defaults */
export const contracts: Contract[] = getConfig().contracts

/* ─── Contract → DRL mapping (config-driven) ─────────────── */

/** Assigns contractId to rows using config mapping rules */
export function assignContractIds(rows: DRLRow[]): DRLRow[] {
  const config = getConfig()
  const fallback = config.contracts[0]?.id || 'CTR-001'
  return rows.map(row => {
    if (row.contractId) return row
    return { ...row, contractId: assignContractIdFromConfig(row.title, config.contractMapping, fallback) }
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
