/**
 * NSERC IDE External Sync Service — PMS 300 DRL Connection Layer
 *
 * ⚠️ CONSOLIDATED: All production logic now lives in nsercIdeService.ts.
 * This module is a thin compatibility wrapper that delegates to the
 * canonical implementation. Do NOT add new logic here.
 *
 * Production integration flows through:
 *   nsercIdeService.connectToNSERCIDE() → /api/nserc-sync proxy → Azure AD → Graph API
 *
 * See nsercIdeService.ts for full architecture documentation.
 */

import { DRLRow } from '../types'
import { fetchLatestDRLUpdates, NSERCSyncResult } from './nsercIdeService'

export type SyncSource = 'NSERC IDE (PMS 300)'

export interface SyncServiceResult {
  isReal: boolean
  source: SyncSource
  rows: DRLRow[]
  fetchedAt: string
  warnings: string[]
}

/**
 * Official NSERC IDE connection point for PMS 300.
 * Delegates to nsercIdeService.fetchLatestDRLUpdates().
 */
export async function performRealSync(
  currentRows: DRLRow[],
): Promise<SyncServiceResult[]> {
  const result: NSERCSyncResult = await fetchLatestDRLUpdates(currentRows)
  return [{
    isReal: result.isReal,
    source: result.source,
    rows: result.rows,
    fetchedAt: result.fetchedAt,
    warnings: result.warnings,
  }]
}
