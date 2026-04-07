/**
 * ═══════════════════════════════════════════════════════════════════
 *  NSERC IDE Service — PMS 300 U.S. Navy & FMS Boats and Craft
 *  Production-Ready Microsoft Graph API / SharePoint REST Integration
 * ═══════════════════════════════════════════════════════════════════
 *
 * This is the definitive service layer for connecting S4 Ledger's
 * Deliverables Tracker to the NAVSEA NSERC Integrated Data Environment
 * for PMS 300 (U.S. Navy & FMS Boats and Craft program).
 *
 * ── Architecture ────────────────────────────────────────────────
 *
 *   [S4 Ledger Frontend]
 *        │
 *        ▼
 *   nsercIdeService.connectToNSERCIDE()     ← Acquire Azure AD token
 *        │
 *        ▼
 *   nsercIdeService.fetchLatestDRLUpdates() ← GET SharePoint list items
 *        │                                     via Microsoft Graph API
 *        ▼
 *   nsercIdeService.mapNSERCDataToTrackerRow()  ← Normalize to DRLRow
 *        │
 *        ▼
 *   [externalSync.ts realSyncPipeline()]    ← Diff, Seal, AI, RACI
 *
 * ── Production Endpoints (PMS 300) ─────────────────────────────
 *
 *   Microsoft Graph base:
 *     https://graph.microsoft.com/v1.0
 *
 *   PMS 300 SharePoint site:
 *     /sites/{pms300-site-id}
 *
 *   DRL metadata list (per craft):
 *     /sites/{pms300-site-id}/lists/{drl-list-id}/items
 *     ?$expand=fields($select=DRL_ID,Title,DI_Number,Contract_Due,
 *       Calc_Due_Date,Submittal_Guide,Actual_Sub_Date,Received,
 *       Cal_Days_Review,Notes,Status,Revision,Comments,
 *       Craft,Platform,Attachment_J2_Ref)
 *     &$top=500
 *     &$filter=fields/Program eq 'PMS 300'
 *
 *   Per-craft filtering (multiple crafts/platforms via list filter):
 *     &$filter=fields/Program eq 'PMS 300' and fields/Craft eq '{craft}'
 *     Supported craft values: 'Hull 1', 'Hull 2', 'Hull 3', 'Hull 4', 'Hull 5'
 *
 *   Document library (for actual file retrieval, future):
 *     /sites/{pms300-site-id}/drives/{drive-id}/root:/{folder-path}:/children
 *     e.g. /sites/.../drives/.../root:/PMS300/Hull1/DRLs:/children
 *
 *   Authentication:
 *     Azure AD OAuth2 client-credentials (server-to-server):
 *       POST https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token
 *       grant_type=client_credentials
 *       client_id={app-id}
 *       client_secret={secret}  ← stored in Vercel env: AZURE_CLIENT_SECRET
 *       scope=https://graph.microsoft.com/.default
 *
 *     Required Graph API permissions:
 *       Sites.Read.All          (read SharePoint site/list content)
 *       Sites.ReadWrite.All     (future: write-back sync status)
 *       Files.Read.All          (future: download DRL documents)
 *
 *     User-delegated (CAC/PIV) alternative:
 *       @azure/msal-browser acquireTokenSilent
 *       scopes: ['Sites.Read.All', 'User.Read']
 *
 * ── Attachment J-2 Reference ───────────────────────────────────
 *
 *   The PMS 300 PMS 300 Boats & Craft contract includes Attachment J-2
 *   (Contract Data Requirements List), which defines:
 *     - DRL exhibit line items (A001 through A0XX)
 *     - DI Numbers per MIL-STD/DI-form
 *     - Submittal frequency, distribution, and approval authority
 *     - Government review periods (typically 30 calendar days)
 *
 *   All notes and AI analysis reference Attachment J-2 for contractual
 *   traceability.
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { DRLRow } from '../types'

/* ═══════════════════════════════════════════════════════════════
   §1  Configuration
   ═══════════════════════════════════════════════════════════════ */

interface NSERCIdeConfig {
  /** DoD Azure AD tenant ID (NAVSEA M365 tenant) */
  tenantId: string
  /** Azure AD application (client) ID for S4 Ledger */
  clientId: string
  /** PMS 300 SharePoint site ID in NSERC IDE */
  pms300SiteId: string
  /** SharePoint list ID for DRL metadata records */
  drlListId: string
  /** SharePoint drive ID for DRL document library (future) */
  documentDriveId: string
  /** Microsoft Graph API base URL */
  graphBaseUrl: string
}

/**
 * Load NSERC IDE config from Vite environment variables.
 * Non-secret values (tenant ID, client ID, site IDs) are safe for frontend.
 * AZURE_CLIENT_SECRET is NEVER exposed to the frontend — it stays in
 * the Vercel serverless function (/api/nserc-sync).
 *
 * Required Vercel environment variables:
 *   VITE_AZURE_TENANT_ID   → config.tenantId    (frontend, non-secret)
 *   VITE_AZURE_CLIENT_ID   → config.clientId     (frontend, non-secret)
 *   VITE_PMS300_SITE_ID    → config.pms300SiteId (frontend, non-secret)
 *   VITE_PMS300_DRL_LIST_ID→ config.drlListId    (frontend, non-secret)
 *   VITE_PMS300_DOC_DRIVE_ID→config.documentDriveId (frontend, non-secret)
 *   AZURE_CLIENT_SECRET    → server-only (Vercel serverless function)
 */
let _cachedConfig: NSERCIdeConfig | null = null

function loadNSERCConfig(): NSERCIdeConfig {
  if (_cachedConfig) return _cachedConfig
  _cachedConfig = {
    tenantId:        import.meta.env.VITE_AZURE_TENANT_ID || '',
    clientId:        import.meta.env.VITE_AZURE_CLIENT_ID || '',
    pms300SiteId:    import.meta.env.VITE_PMS300_SITE_ID || '',
    drlListId:       import.meta.env.VITE_PMS300_DRL_LIST_ID || '',
    documentDriveId: import.meta.env.VITE_PMS300_DOC_DRIVE_ID || '',
    graphBaseUrl:    'https://graph.microsoft.com/v1.0',
  }
  return _cachedConfig
}

/**
 * Check whether production NSERC IDE credentials are configured.
 * Returns true when all required env vars are set and non-empty.
 */
export function isProductionConfigured(): boolean {
  const cfg = loadNSERCConfig()
  return [cfg.tenantId, cfg.clientId, cfg.pms300SiteId, cfg.drlListId]
    .every(v => v.length > 0)
}

/* ── Error Types ──────────────────────────────────────────────── */

export type NSERCErrorCode =
  | 'AUTH_FAILED' | 'FORBIDDEN' | 'NOT_FOUND' | 'RATE_LIMITED'
  | 'SERVER_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR' | 'INVALID_RESPONSE'
  | 'INVALID_INPUT' | 'UNKNOWN'

export class NSERCError extends Error {
  constructor(
    message: string,
    public readonly code: NSERCErrorCode,
    public readonly httpStatus?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message)
    this.name = 'NSERCError'
  }
}

/* ── Retry Utility — Exponential Backoff ──────────────────────── */

const MAX_RETRIES = 3
const RETRY_DELAYS = [2000, 5000, 10000]

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs: number = 30000,
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const resp = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeoutId)

      // Rate limited → honor Retry-After header
      if (resp.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = resp.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_DELAYS[attempt] || 10000
        console.warn(`[NSERC IDE] Rate limited (429) — retry in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      // Server error → retry with backoff
      if (resp.status >= 500 && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] || 10000
        console.warn(`[NSERC IDE] Server error (${resp.status}) — retry in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      return resp
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err instanceof Error ? err : new Error(String(err))

      if (lastError.name === 'AbortError') {
        lastError = new NSERCError(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT', undefined, true)
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] || 10000
        console.warn(`[NSERC IDE] Network error — retry in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}):`, lastError.message)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }

  throw lastError || new NSERCError('Request failed after all retries', 'NETWORK_ERROR', undefined, false)
}

/* ── OData Input Sanitization ─────────────────────────────────── */

/**
 * Sanitize a craft filter value for safe OData query interpolation.
 * Prevents injection by allowing only safe characters and escaping quotes.
 */
function sanitizeCraftFilter(craft: string): string {
  if (!/^[a-zA-Z0-9\s\-#().]+$/.test(craft)) {
    throw new NSERCError(
      `Invalid craft filter: "${craft}" — only alphanumeric, spaces, hyphens, #, parens allowed`,
      'INVALID_INPUT',
    )
  }
  return craft.replace(/'/g, "''")
}

/* ═══════════════════════════════════════════════════════════════
   §2  Types — Raw SharePoint shape & mapped output
   ═══════════════════════════════════════════════════════════════ */

/** Raw shape returned by Microsoft Graph for a PMS 300 DRL list item */
export interface NSERCSharePointItem {
  id: string
  fields: {
    DRL_ID: string
    Title: string
    DI_Number: string
    Contract_Due: string
    Calc_Due_Date: string
    Submittal_Guide: string
    Actual_Sub_Date: string | null
    Received: string
    Cal_Days_Review: number | null
    Notes: string
    Status: 'Green' | 'Yellow' | 'Red'
    Revision: string | null
    Comments: string | null
    Craft: string | null
    Platform: string | null
    Attachment_J2_Ref: string | null
    Program: string
  }
}

/** Result of a sync operation from NSERC IDE */
export interface NSERCSyncResult {
  /** True when data came from real Microsoft Graph API */
  isReal: boolean
  /** Always 'NSERC IDE (PMS 300)' */
  source: 'NSERC IDE (PMS 300)'
  /** Normalized rows ready for the Deliverables Tracker */
  rows: DRLRow[]
  /** ISO timestamp of the fetch */
  fetchedAt: string
  /** Non-fatal warnings (e.g. simulation mode active) */
  warnings: string[]
}

/** Connection state returned by connectToNSERCIDE() */
export interface NSERCConnection {
  /** Whether authentication succeeded */
  connected: boolean
  /** Bearer token for Microsoft Graph (null in simulation mode) */
  token: string | null
  /** Resolved config used for this connection */
  config: NSERCIdeConfig
}

/* ═══════════════════════════════════════════════════════════════
   §3  connectToNSERCIDE() — Authentication
   ═══════════════════════════════════════════════════════════════ */

/**
 * Establish an authenticated connection to the PMS 300 NSERC IDE
 * SharePoint site via Azure AD.
 *
 * Production (client-credentials):
 *   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
 *   Content-Type: application/x-www-form-urlencoded
 *   Body:
 *     grant_type=client_credentials
 *     &client_id={clientId}
 *     &client_secret={AZURE_CLIENT_SECRET}
 *     &scope=https://graph.microsoft.com/.default
 *
 * Returns { connected: true, token } on success, or { connected: false, token: null }
 * when credentials are not yet provisioned (enters simulation mode).
 */
export async function connectToNSERCIDE(
  config: NSERCIdeConfig = loadNSERCConfig(),
): Promise<NSERCConnection> {
  if (!isProductionConfigured()) {
    console.info('[NSERC IDE (PMS 300)] Production credentials not configured — simulation mode active')
    return { connected: false, token: null, config }
  }

  // Production: token acquisition is handled by the backend proxy
  // (/api/nserc-sync). The client secret never touches the frontend.
  // We verify proxy availability with a health check on first connect.
  try {
    const resp = await fetchWithRetry('/api/nserc-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'health' }),
    }, 15000)

    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      console.error(`[NSERC IDE] Proxy health check failed: ${resp.status} — ${body.slice(0, 200)}`)
      return { connected: false, token: null, config }
    }

    console.info('[NSERC IDE (PMS 300)] Production proxy connected — real sync mode active')
    return { connected: true, token: '__proxy__', config }
  } catch (err) {
    console.error('[NSERC IDE] Proxy connectivity error:', err instanceof Error ? err.message : err)
    return { connected: false, token: null, config }
  }
}

/* ═══════════════════════════════════════════════════════════════
   §4  fetchLatestDRLUpdates() — Microsoft Graph API Call
   ═══════════════════════════════════════════════════════════════ */

/**
 * Fetch the latest DRL records from PMS 300 NSERC IDE.
 *
 * @param currentRows - Current tracker data (used as base for simulation)
 * @param craft       - Optional craft filter: 'Hull 1' | 'Hull 2' | ... | 'Hull 5'
 *                      Omit to fetch all crafts under PMS 300.
 * @param connection  - Optional pre-established connection (avoids re-auth)
 *
 * Production endpoint:
 *   GET https://graph.microsoft.com/v1.0
 *       /sites/{pms300SiteId}/lists/{drlListId}/items
 *       ?$expand=fields($select=DRL_ID,Title,DI_Number,Contract_Due,
 *         Calc_Due_Date,Submittal_Guide,Actual_Sub_Date,Received,
 *         Cal_Days_Review,Notes,Status,Revision,Comments,
 *         Craft,Platform,Attachment_J2_Ref)
 *       &$top=500
 *       &$filter=fields/Program eq 'PMS 300'
 *       [&$filter=... and fields/Craft eq '{craft}']
 *
 * Headers:
 *   Authorization: Bearer {token}
 *   Accept: application/json
 *   ConsistencyLevel: eventual
 */
export async function fetchLatestDRLUpdates(
  currentRows: DRLRow[],
  craft?: string,
  connection?: NSERCConnection,
): Promise<NSERCSyncResult> {
  const conn = connection ?? await connectToNSERCIDE()

  if (conn.connected && conn.token) {
    // ── Production: call backend proxy for real NSERC IDE data ──
    try {
      const sanitizedCraft = craft ? sanitizeCraftFilter(craft) : undefined

      const resp = await fetchWithRetry('/api/nserc-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          siteId: conn.config.pms300SiteId,
          listId: conn.config.drlListId,
          craft: sanitizedCraft,
        }),
      })

      if (!resp.ok) {
        const body = await resp.text().catch(() => '')
        const code: NSERCErrorCode =
          resp.status === 401 ? 'AUTH_FAILED'
          : resp.status === 403 ? 'FORBIDDEN'
          : resp.status === 404 ? 'NOT_FOUND'
          : resp.status === 429 ? 'RATE_LIMITED'
          : resp.status >= 500 ? 'SERVER_ERROR'
          : 'UNKNOWN'
        throw new NSERCError(
          `NSERC IDE sync failed: ${resp.status} — ${body.slice(0, 200)}`,
          code, resp.status, resp.status >= 500 || resp.status === 429,
        )
      }

      const data = await resp.json()

      // Validate response schema — Graph API returns { value: [...] }
      if (!data || !Array.isArray(data.value)) {
        throw new NSERCError(
          'Invalid response from NSERC IDE proxy — expected { value: [...] }',
          'INVALID_RESPONSE',
        )
      }

      // Map each SharePoint item to DRLRow with per-row validation
      const rows: DRLRow[] = []
      const warnings: string[] = []

      for (const item of data.value) {
        try {
          if (!item.fields || !item.fields.DRL_ID || !item.fields.Title) {
            warnings.push(`Skipped item ${item.id || 'unknown'}: missing required fields (DRL_ID, Title)`)
            continue
          }
          rows.push(mapNSERCDataToTrackerRow(item as NSERCSharePointItem))
        } catch (mapErr) {
          warnings.push(`Failed to map item ${item.fields?.DRL_ID || item.id || 'unknown'}: ${mapErr instanceof Error ? mapErr.message : String(mapErr)}`)
        }
      }

      if (warnings.length > 0) {
        console.warn('[NSERC IDE] Row mapping warnings:', warnings)
      }

      return {
        isReal: true,
        source: 'NSERC IDE (PMS 300)',
        rows,
        fetchedAt: new Date().toISOString(),
        warnings,
      }
    } catch (err) {
      // Non-retryable errors (auth, forbidden): surface clearly, don't silently simulate
      if (err instanceof NSERCError && !err.retryable) {
        console.error(`[NSERC IDE] Non-retryable error (${err.code}):`, err.message)
        return {
          isReal: false,
          source: 'NSERC IDE (PMS 300)',
          rows: [],
          fetchedAt: new Date().toISOString(),
          warnings: [`Production sync failed: ${err.message} (${err.code}). No data returned.`],
        }
      }

      // Retryable errors (network, timeout, 5xx): fall back to simulation with warning
      console.error('[NSERC IDE] Transient error, falling back to simulation:', err)
      const simResult = simulatePMS300Updates(currentRows, craft)
      simResult.warnings.push(
        `Production sync failed: ${err instanceof Error ? err.message : String(err)}. Using simulated data.`,
      )
      return simResult
    }
  }

  // ── Simulation: generate realistic PMS 300 updates until credentials exist ──
  return simulatePMS300Updates(currentRows, craft)
}

/* ═══════════════════════════════════════════════════════════════
   §5  mapNSERCDataToTrackerRow() — Field Normalizer
   ═══════════════════════════════════════════════════════════════ */

/**
 * Normalize a raw NSERC IDE SharePoint list item into the DRLRow
 * shape used by the Deliverables Tracker.
 *
 * Maps PMS 300 DRL SharePoint columns → tracker columns:
 *   fields.DRL_ID            → id
 *   fields.Title              → title (+ Revision suffix if present)
 *   fields.DI_Number          → diNumber
 *   fields.Contract_Due       → contractDueFinish
 *   fields.Calc_Due_Date      → calculatedDueDate
 *   fields.Submittal_Guide    → submittalGuidance
 *   fields.Actual_Sub_Date    → actualSubmissionDate
 *   fields.Received           → received
 *   fields.Cal_Days_Review    → calendarDaysToReview
 *   fields.Notes              → notes (+ Attachment J-2 ref + Comments)
 *   fields.Status             → status (lowercase)
 *   fields.Craft              → (encoded in title for Hull tracking)
 */
export function mapNSERCDataToTrackerRow(item: NSERCSharePointItem): DRLRow {
  const rev = item.fields.Revision ? ` (${item.fields.Revision})` : ''
  const craftTag = item.fields.Craft ? ` (${item.fields.Craft})` : ''
  const j2Ref = item.fields.Attachment_J2_Ref
    ? `[Ref: Attachment J-2, ${item.fields.Attachment_J2_Ref}] `
    : ''
  const comments = item.fields.Comments
    ? ` | PMS 300 Comment: ${item.fields.Comments}`
    : ''

  return {
    id: item.fields.DRL_ID,
    title: item.fields.Title + rev + craftTag,
    diNumber: item.fields.DI_Number,
    contractDueFinish: item.fields.Contract_Due,
    calculatedDueDate: item.fields.Calc_Due_Date,
    submittalGuidance: item.fields.Submittal_Guide,
    actualSubmissionDate: item.fields.Actual_Sub_Date || '',
    received: item.fields.Received,
    calendarDaysToReview: item.fields.Cal_Days_Review,
    notes: j2Ref + item.fields.Notes + comments,
    status: item.fields.Status.toLowerCase() as DRLRow['status'],
  }
}

/* ═══════════════════════════════════════════════════════════════
   §6  Simulation Layer — PMS 300 Attachment J-2 Language
   ═══════════════════════════════════════════════════════════════
   Active until real Azure AD credentials are provisioned.
   Uses realistic PMS 300 PMS 300 Boats & Craft contractual language
   referencing Attachment J-2 (Contract Data Requirements List). */

const ATTACHMENT_J2_REMARKS: Record<string, string[]> = {
  green: [
    'Per Attachment J-2, Exhibit A — deliverable accepted by PMS 300 Program Office. Government review complete, no further action required.',
    'Accepted per PMS 300 DRL Attachment J-2 requirements. Contracting Officer concurrence obtained. Revision incorporated per contract modification P00012.',
    'Final acceptance recorded in NSERC IDE per Attachment J-2 submittal schedule. Distribution list updated.',
  ],
  yellow: [
    'Per Attachment J-2, Block 16 — under PMS 300 government review. Response expected within 30 calendar days per DFARS 252.242-7006.',
    'PMS 300 NAVSEA technical authority returned minor comments per Attachment J-2 review criteria. Contractor resubmittal requested within 30 days.',
    'Technical evaluation in progress per Attachment J-2, Exhibit A review timeline. PMS 300 engineering division coordinating.',
  ],
  red: [
    'DELINQUENT per Attachment J-2 submittal schedule — past contractual due date. PMS 300 Program Manager notified. Cure notice under DFARS 252.249-8711 consideration.',
    'REJECTED per Attachment J-2 acceptance criteria — significant deficiencies identified per MIL-STD-1916 sampling procedures. Full resubmittal required within 15 calendar days.',
    'OVERDUE per Attachment J-2 — escalated to PMS 300 Contracting Officer for corrective action coordination per FAR 52.242-15.',
  ],
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/* ── PMS 300 Service Craft & Small Boats registry ────────────── */

/**
 * Craft registry — loaded from config (production mode) or demo defaults.
 * Replaces the formerly hardcoded PMS300_CRAFT_REGISTRY array.
 */
import { getConfigOrDemo } from '../config/appConfig'

function getCraftRegistry() {
  return getConfigOrDemo().craftRegistry
}

function getDrlTemplates() {
  return getConfigOrDemo().drlTemplates ?? []
}

/** Exported function to get PMS 300 craft labels for UI dropdowns */
export function getPMS300CraftLabels(): string[] {
  return getCraftRegistry().map(c => c.label)
}

/**
 * Parse a title's trailing (Platform — Hull N) group into platform and hull.
 * Returns null if no craft+hull tag is found.
 */
function parseCraftTag(title: string): { platform: string; hull: string } | null {
  const idx = title.lastIndexOf('(')
  if (idx === -1) return null
  const end = title.lastIndexOf(')')
  if (end <= idx) return null
  const inner = title.slice(idx + 1, end).trim()
  const dashIdx = inner.indexOf('—')
  if (dashIdx === -1) return null
  const platform = inner.slice(0, dashIdx).trim()
  const hull = inner.slice(dashIdx + 1).trim()
  if (!platform || !hull) return null
  return { platform, hull }
}

/**
 * Detect which PMS 300 platform types already exist in the dataset.
 */
export function detectExistingCrafts(rows: DRLRow[]): Set<string> {
  const platforms = new Set<string>()
  for (const row of rows) {
    const parsed = parseCraftTag(row.title)
    if (parsed) platforms.add(parsed.platform)
  }
  return platforms
}

/** Get the highest hull number for a given platform type in the dataset */
export function getMaxHullForPlatform(rows: DRLRow[], platform: string): number {
  let max = 0
  for (const row of rows) {
    const parsed = parseCraftTag(row.title)
    if (parsed && parsed.platform === platform) {
      const hm = parsed.hull.match(/(\d+)/)
      if (hm) max = Math.max(max, parseInt(hm[1], 10))
    }
  }
  return max
}

/** Detect the highest hull number in the current dataset (for backward compat) */
export function detectMaxHull(rows: DRLRow[]): number {
  let max = 0
  for (const row of rows) {
    const m = row.title.match(/\bHull\s*(\d+)\b/i)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max
}

/** Get the next PMS 300 service craft type not yet in the dataset */
export function getNextPMS300Craft(currentRows: DRLRow[]): { craftLabel: string; desc: string } {
  const existing = detectExistingCrafts(currentRows)
  const registry = getCraftRegistry()

  // Find the next craft from the registry not yet present
  for (const craft of registry) {
    if (!existing.has(craft.label)) {
      return { craftLabel: craft.label, desc: craft.desc }
    }
  }

  // All registry types present — cycle with a numeric suffix
  const idx = existing.size % registry.length
  const base = registry[idx]
  const suffix = Math.floor(existing.size / registry.length) + 1
  return { craftLabel: `${base.label} #${suffix + 1}`, desc: base.desc }
}

/**
 * Generate new PMS 300 service craft rows.
 * Always produces 2-4 rows for the next available craft type at Hull 1,
 * or adds a new hull number to an existing craft type.
 */
export function generateNewCraftRows(currentRows: DRLRow[]): { rows: DRLRow[]; craftLabel: string } {
  const nextCraft = getNextPMS300Craft(currentRows)
  const hullNum = getMaxHullForPlatform(currentRows, nextCraft.craftLabel) + 1
  const maxId = currentRows.reduce((m, r) => {
    const n = parseInt(r.id.replace(/\D/g, ''), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 0)

  const templates = getDrlTemplates()
  const newCount = 2 + Math.floor(Math.random() * 3) // 2-4 rows
  const rows: DRLRow[] = []
  for (let i = 0; i < newCount; i++) {
    const tpl = templates[i % templates.length]
    const rowId = `DRL-${String(maxId + 1 + i).padStart(3, '0')}`
    const status: DRLRow['status'] = pickRandom(['yellow', 'yellow', 'red'])
    const remarks = ATTACHMENT_J2_REMARKS[status]

    rows.push({
      id: rowId,
      title: `${tpl.titlePrefix} Rev A (${nextCraft.craftLabel} — Hull ${hullNum})`,
      diNumber: tpl.diNumber,
      contractDueFinish: tpl.contractDueOffset || '2026-06-30',
      calculatedDueDate: tpl.contractDueOffset || '2026-06-30',
      submittalGuidance: tpl.submittalGuidance,
      actualSubmissionDate: '',
      received: 'No',
      calendarDaysToReview: null,
      notes: `[Synced from NSERC IDE (PMS 300)] New service craft detected — ${nextCraft.craftLabel} Hull ${hullNum}: ${nextCraft.desc}. ${pickRandom(remarks)}`,
      status,
    })
  }
  return { rows, craftLabel: nextCraft.craftLabel }
}

/**
 * Generate rows for a manually entered craft (offline/fallback).
 * Auto-detects next hull number for the given craft type.
 * @param craftName - Platform label, e.g. "Harbor Tug YTB"
 */
export function generateManualCraftRows(currentRows: DRLRow[], craftName: string): DRLRow[] {
  const hullNum = getMaxHullForPlatform(currentRows, craftName) + 1
  const maxId = currentRows.reduce((m, r) => {
    const n = parseInt(r.id.replace(/\D/g, ''), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 0)

  const templates = getDrlTemplates()
  const rows: DRLRow[] = []
  const count = 3
  for (let i = 0; i < count; i++) {
    const tpl = templates[i % templates.length]
    const rowId = `DRL-${String(maxId + 1 + i).padStart(3, '0')}`
    const status: DRLRow['status'] = pickRandom(['yellow', 'yellow', 'red'])
    const remarks = ATTACHMENT_J2_REMARKS[status]

    rows.push({
      id: rowId,
      title: `${tpl.titlePrefix} Rev A (${craftName} — Hull ${hullNum})`,
      diNumber: tpl.diNumber,
      contractDueFinish: tpl.contractDueOffset || '2026-06-30',
      calculatedDueDate: tpl.contractDueOffset || '2026-06-30',
      submittalGuidance: tpl.submittalGuidance,
      actualSubmissionDate: '',
      received: 'No',
      calendarDaysToReview: null,
      notes: `[Manual Entry — NSERC IDE Offline] New craft: ${craftName} Hull ${hullNum}. ${pickRandom(remarks)}`,
      status,
    })
  }
  return rows
}

function simulatePMS300Updates(
  currentRows: DRLRow[],
  craft?: string,
): NSERCSyncResult {
  // Filter to specific craft if requested
  let eligible = currentRows
  if (craft) {
    eligible = currentRows.filter(r =>
      r.title.toLowerCase().includes(craft.toLowerCase()),
    )
    if (eligible.length === 0) eligible = currentRows // fallback
  }

  // Pick 2-4 rows to receive NSERC IDE updates
  const count = 2 + Math.floor(Math.random() * 3)
  const indices = new Set<number>()
  while (indices.size < Math.min(count, eligible.length)) {
    indices.add(Math.floor(Math.random() * eligible.length))
  }

  const updatedExistingRows = Array.from(indices).map(idx => {
    const row = eligible[idx]
    const remarks = ATTACHMENT_J2_REMARKS[row.status]
    const newNote = `[Synced from NSERC IDE (PMS 300)] ${pickRandom(remarks)}`

    const updated = { ...row, notes: newNote }

    // Occasionally update submission date for non-green rows
    if (row.status !== 'green' && Math.random() > 0.5) {
      const d = new Date()
      updated.actualSubmissionDate =
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    return updated
  })

  // ── Always detect new service craft from NSERC IDE ────────────
  // PMS 300 manages a wide portfolio — each sync discovers craft in the pipeline
  const newCraftResult = generateNewCraftRows(currentRows)
  const newCraftRows = newCraftResult.rows

  const allRows = [...updatedExistingRows, ...newCraftRows]

  return {
    isReal: false,
    source: 'NSERC IDE (PMS 300)',
    rows: allRows,
    fetchedAt: new Date().toISOString(),
    warnings: [
      'Synced from NSERC IDE (PMS 300) — simulation active until Azure AD credentials are provisioned.',
      ...(newCraftRows.length > 0
        ? [`New service craft detected: ${newCraftResult.craftLabel} — ${newCraftRows.length} new deliverable rows.`]
        : []),
    ],
  }
}
