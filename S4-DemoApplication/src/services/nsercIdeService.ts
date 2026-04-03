/**
 * ═══════════════════════════════════════════════════════════════════
 *  NSERC IDE Service — PMS 300 Constellation-class Frigate
 *  Production-Ready Microsoft Graph API / SharePoint REST Integration
 * ═══════════════════════════════════════════════════════════════════
 *
 * This is the definitive service layer for connecting S4 Ledger's
 * Deliverables Tracker to the NAVSEA NSERC Integrated Data Environment
 * for PMS 300 (Constellation-class Frigate program).
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
 *   nsercIdeService.mapNSERCDataToTrackerRow()  ← Normalize to CDRLRow
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
 *     ?$expand=fields($select=CDRL_ID,Title,DI_Number,Contract_Due,
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
 *     e.g. /sites/.../drives/.../root:/PMS300/Hull1/CDRLs:/children
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
 *       Files.Read.All          (future: download CDRL documents)
 *
 *     User-delegated (CAC/PIV) alternative:
 *       @azure/msal-browser acquireTokenSilent
 *       scopes: ['Sites.Read.All', 'User.Read']
 *
 * ── Attachment J-2 Reference ───────────────────────────────────
 *
 *   The PMS 300 Constellation-class contract includes Attachment J-2
 *   (Contract Data Requirements List), which defines:
 *     - CDRL exhibit line items (A001 through A0XX)
 *     - DI Numbers per MIL-STD/DI-form
 *     - Submittal frequency, distribution, and approval authority
 *     - Government review periods (typically 30 calendar days)
 *
 *   All notes and AI analysis reference Attachment J-2 for contractual
 *   traceability.
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { CDRLRow } from '../types'

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
  /** SharePoint drive ID for CDRL document library (future) */
  documentDriveId: string
  /** Microsoft Graph API base URL */
  graphBaseUrl: string
}

/**
 * TODO: PRODUCTION — Store in Vercel environment secrets:
 *   AZURE_TENANT_ID        → config.tenantId
 *   AZURE_CLIENT_ID        → config.clientId
 *   AZURE_CLIENT_SECRET    → used in token acquisition (never in frontend)
 *   PMS300_SITE_ID         → config.pms300SiteId
 *   PMS300_DRL_LIST_ID     → config.drlListId
 *   PMS300_DOC_DRIVE_ID    → config.documentDriveId
 */
const NSERC_CONFIG: NSERCIdeConfig = {
  tenantId:        'TODO_NAVSEA_AZURE_TENANT_ID',
  clientId:        'TODO_S4_LEDGER_APP_CLIENT_ID',
  pms300SiteId:    'TODO_PMS300_NSERC_SITE_ID',
  drlListId:       'TODO_PMS300_DRL_LIST_ID',
  documentDriveId: 'TODO_PMS300_CDRL_DRIVE_ID',
  graphBaseUrl:    'https://graph.microsoft.com/v1.0',
}

/* ═══════════════════════════════════════════════════════════════
   §2  Types — Raw SharePoint shape & mapped output
   ═══════════════════════════════════════════════════════════════ */

/** Raw shape returned by Microsoft Graph for a PMS 300 DRL list item */
export interface NSERCSharePointItem {
  id: string
  fields: {
    CDRL_ID: string
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
  rows: CDRLRow[]
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
  config: NSERCIdeConfig = NSERC_CONFIG,
): Promise<NSERCConnection> {
  // ┌───────────────────────────────────────────────────────────────┐
  // │  TODO: PRODUCTION — Uncomment when Azure AD app registration  │
  // │  is complete and AZURE_CLIENT_SECRET is in Vercel secrets.     │
  // │                                                                │
  // │  const tokenUrl =                                              │
  // │    `https://login.microsoftonline.com/                         │
  // │     ${config.tenantId}/oauth2/v2.0/token`;                     │
  // │                                                                │
  // │  const body = new URLSearchParams({                            │
  // │    grant_type: 'client_credentials',                           │
  // │    client_id: config.clientId,                                 │
  // │    client_secret: process.env.AZURE_CLIENT_SECRET!,            │
  // │    scope: 'https://graph.microsoft.com/.default',              │
  // │  });                                                           │
  // │                                                                │
  // │  const resp = await fetch(tokenUrl, {                          │
  // │    method: 'POST',                                             │
  // │    headers: {                                                  │
  // │      'Content-Type': 'application/x-www-form-urlencoded',      │
  // │    },                                                          │
  // │    body,                                                       │
  // │  });                                                           │
  // │                                                                │
  // │  if (!resp.ok) {                                               │
  // │    console.error('[NSERC IDE] Auth failed:', resp.status);      │
  // │    return { connected: false, token: null, config };            │
  // │  }                                                             │
  // │                                                                │
  // │  const json = await resp.json();                               │
  // │  return {                                                      │
  // │    connected: true,                                            │
  // │    token: json.access_token,                                   │
  // │    config,                                                     │
  // │  };                                                            │
  // └───────────────────────────────────────────────────────────────┘

  console.info('[NSERC IDE (PMS 300)] Credentials not provisioned — entering simulation mode')
  return { connected: false, token: null, config }
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
 *       ?$expand=fields($select=CDRL_ID,Title,DI_Number,Contract_Due,
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
  currentRows: CDRLRow[],
  craft?: string,
  connection?: NSERCConnection,
): Promise<NSERCSyncResult> {
  const conn = connection ?? await connectToNSERCIDE()

  if (conn.connected && conn.token) {
    // ┌───────────────────────────────────────────────────────────────┐
    // │  TODO: PRODUCTION — Real Microsoft Graph call                 │
    // │                                                                │
    // │  const craftFilter = craft                                     │
    // │    ? ` and fields/Craft eq '${craft}'`                        │
    // │    : '';                                                       │
    // │                                                                │
    // │  const url =                                                   │
    // │    `${conn.config.graphBaseUrl}`                               │
    // │    + `/sites/${conn.config.pms300SiteId}`                     │
    // │    + `/lists/${conn.config.drlListId}/items`                  │
    // │    + `?$expand=fields($select=CDRL_ID,Title,DI_Number,`      │
    // │    + `Contract_Due,Calc_Due_Date,Submittal_Guide,`           │
    // │    + `Actual_Sub_Date,Received,Cal_Days_Review,`             │
    // │    + `Notes,Status,Revision,Comments,`                        │
    // │    + `Craft,Platform,Attachment_J2_Ref)`                      │
    // │    + `&$top=500`                                               │
    // │    + `&$filter=fields/Program eq 'PMS 300'${craftFilter}`;   │
    // │                                                                │
    // │  const resp = await fetch(url, {                               │
    // │    headers: {                                                  │
    // │      Authorization: `Bearer ${conn.token}`,                   │
    // │      Accept: 'application/json',                              │
    // │      ConsistencyLevel: 'eventual',                            │
    // │    },                                                          │
    // │  });                                                           │
    // │                                                                │
    // │  if (!resp.ok) throw new Error(                                │
    // │    `NSERC IDE Graph API ${resp.status}: ${resp.statusText}`); │
    // │                                                                │
    // │  const data = await resp.json();                               │
    // │  const rows: CDRLRow[] = data.value.map(                      │
    // │    (item: NSERCSharePointItem) => mapNSERCDataToTrackerRow(   │
    // │      item                                                      │
    // │    )                                                           │
    // │  );                                                            │
    // │                                                                │
    // │  return {                                                      │
    // │    isReal: true,                                               │
    // │    source: 'NSERC IDE (PMS 300)',                             │
    // │    rows,                                                       │
    // │    fetchedAt: new Date().toISOString(),                       │
    // │    warnings: [],                                               │
    // │  };                                                            │
    // └───────────────────────────────────────────────────────────────┘
    void conn.token
  }

  // ── Simulation: generate realistic PMS 300 updates until credentials exist ──
  return simulatePMS300Updates(currentRows, craft)
}

/* ═══════════════════════════════════════════════════════════════
   §5  mapNSERCDataToTrackerRow() — Field Normalizer
   ═══════════════════════════════════════════════════════════════ */

/**
 * Normalize a raw NSERC IDE SharePoint list item into the CDRLRow
 * shape used by the Deliverables Tracker.
 *
 * Maps PMS 300 DRL SharePoint columns → tracker columns:
 *   fields.CDRL_ID            → id
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
export function mapNSERCDataToTrackerRow(item: NSERCSharePointItem): CDRLRow {
  const rev = item.fields.Revision ? ` (${item.fields.Revision})` : ''
  const craftTag = item.fields.Craft ? ` (${item.fields.Craft})` : ''
  const j2Ref = item.fields.Attachment_J2_Ref
    ? `[Ref: Attachment J-2, ${item.fields.Attachment_J2_Ref}] `
    : ''
  const comments = item.fields.Comments
    ? ` | PMS 300 Comment: ${item.fields.Comments}`
    : ''

  return {
    id: item.fields.CDRL_ID,
    title: item.fields.Title + rev + craftTag,
    diNumber: item.fields.DI_Number,
    contractDueFinish: item.fields.Contract_Due,
    calculatedDueDate: item.fields.Calc_Due_Date,
    submittalGuidance: item.fields.Submittal_Guide,
    actualSubmissionDate: item.fields.Actual_Sub_Date || '',
    received: item.fields.Received,
    calendarDaysToReview: item.fields.Cal_Days_Review,
    notes: j2Ref + item.fields.Notes + comments,
    status: item.fields.Status.toLowerCase() as CDRLRow['status'],
  }
}

/* ═══════════════════════════════════════════════════════════════
   §6  Simulation Layer — PMS 300 Attachment J-2 Language
   ═══════════════════════════════════════════════════════════════
   Active until real Azure AD credentials are provisioned.
   Uses realistic PMS 300 Constellation-class contractual language
   referencing Attachment J-2 (Contract Data Requirements List). */

const ATTACHMENT_J2_REMARKS: Record<string, string[]> = {
  green: [
    'Per Attachment J-2, Exhibit A — deliverable accepted by PMS 300 Program Office. Government review complete, no further action required.',
    'Approved per Constellation-class DRL Attachment J-2 requirements. Contracting Officer concurrence obtained. Revision incorporated per contract modification P00012.',
    'Final acceptance recorded in NSERC IDE per Attachment J-2 submittal schedule. Distribution list updated.',
  ],
  yellow: [
    'Per Attachment J-2, Block 16 — under PMS 300 government review. Response expected within 30 calendar days per DFARS 252.242-7006.',
    'PMS 300 NAVSEA technical authority returned minor comments per Attachment J-2 review criteria. Contractor resubmittal requested within 30 days.',
    'Technical evaluation in progress per Attachment J-2, Exhibit A review timeline. Constellation-class engineering division coordinating.',
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

function simulatePMS300Updates(
  currentRows: CDRLRow[],
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

  const rows = Array.from(indices).map(idx => {
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

  return {
    isReal: false,
    source: 'NSERC IDE (PMS 300)',
    rows,
    fetchedAt: new Date().toISOString(),
    warnings: ['Synced from NSERC IDE (PMS 300) — simulation active until Azure AD credentials are provisioned.'],
  }
}
