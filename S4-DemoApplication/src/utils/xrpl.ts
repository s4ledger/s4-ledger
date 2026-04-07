import { AnchorRecord } from '../types'
import { checkAnchorLimit } from './rateLimiter'

const ANCHOR_API = '/api/anchor'

/**
 * Anchor a data hash to the XRPL via the S4 Ledger backend API.
 * The backend submits a real AccountSet transaction with a memo to the XRPL,
 * then deducts 0.01 SLS from the demo wallet → Treasury.
 */
export async function anchorToXRPL(
  rowId: string,
  hash: string,
  contentPreview?: string,
): Promise<AnchorRecord> {
  if (checkAnchorLimit()) {
    console.warn('[XRPL] Rate limited — using local placeholder')
    return localFallback(rowId, hash)
  }

  try {
    const resp = await fetch(ANCHOR_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hash,
        record_type: 'DRL_DELIVERABLE',
        content_preview: contentPreview || rowId,
        session_id: `s4demo-${Date.now()}`,
        user_email: 'demo@s4ledger.com',
      }),
    })

    if (resp.ok) {
      const result = await resp.json()
      const rec = result.record || {}
      const xrpl = result.xrpl || {}

      return {
        rowId,
        hash,
        timestamp: rec.timestamp || new Date().toISOString(),
        txHash: xrpl.tx_hash || rec.tx_hash || '',
        ledgerIndex: xrpl.ledger_index || rec.ledger_index || 0,
        network: rec.network || 'XRPL',
        explorerUrl: xrpl.explorer_url || rec.explorer_url || null,
        slsFee: result.fee_transfer ? String(result.fee_transfer.amount) : (rec.fee ? String(rec.fee) : null),
      }
    }

    // API returned an error — fall through to local fallback
    console.warn(`Anchor API returned ${resp.status}`)
  } catch (e) {
    console.warn('Anchor API unreachable, using local placeholder:', e)
  }

  // Local fallback when API is unavailable (dev mode, offline, etc.)
  return localFallback(rowId, hash)
}

function localFallback(rowId: string, hash: string): AnchorRecord {
  return {
    rowId,
    hash,
    timestamp: new Date().toISOString(),
    txHash: 'LOCAL_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
    ledgerIndex: 0,
    network: 'Pending',
    explorerUrl: null,
    slsFee: null,
  }
}

export async function verifyHash(
  currentHash: string,
  anchoredHash: string,
): Promise<boolean> {
  return currentHash === anchoredHash
}
