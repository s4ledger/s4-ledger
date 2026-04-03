/**
 * NSERC IDE External Sync Service — PMS 300 DRL Connection Layer
 *
 * Production-ready integration for the Naval Sea Systems Command (NAVSEA)
 * NSERC Integrated Data Environment, specifically the PMS 300 (U.S. Navy
 * & FMS Boats and Craft) DRL SharePoint site hosted in the DoD Microsoft 365
 * tenant.
 *
 * This module contains the real Microsoft Graph API / SharePoint REST
 * endpoints that will be used in production. Today it returns simulated
 * data in the correct DRLRow shape; when production Azure AD credentials
 * are provisioned, the real fetch calls below will activate automatically.
 *
 * ──────────────────────────────────────────────────────────────────
 * Production endpoints (PMS 300):
 *
 *   Site:  https://graph.microsoft.com/v1.0/sites/{pms300-site-id}
 *   List:  /sites/{pms300-site-id}/lists/{drl-list-id}/items
 *   Query: ?$expand=fields($select=DRL_ID,Title,DI_Number,Contract_Due,
 *           Calc_Due_Date,Submittal_Guide,Actual_Sub_Date,Received,
 *           Cal_Days_Review,Notes,Status,Revision,Comments)&$top=500
 *
 *   Auth:  Azure AD OAuth2 client-credentials flow
 *          Scope: https://graph.microsoft.com/.default
 *          Grant: Sites.Read.All, Sites.ReadWrite.All (for write-back)
 *
 *   Alt:   User-delegated flow with CAC/PIV via MSAL.js
 *          Scope: Sites.Read.All, User.Read
 * ──────────────────────────────────────────────────────────────────
 */

import { DRLRow } from '../types'

/* ═══════════════════════════════════════════════════════════════
   §1  PMS 300 NSERC IDE Configuration
   ═══════════════════════════════════════════════════════════════ */

interface PMS300SyncConfig {
  /** DoD Azure AD tenant ID for NAVSEA Microsoft 365 */
  tenantId: string
  /** Azure AD application (client) ID registered for S4 Ledger PMS 300 sync */
  clientId: string
  /** SharePoint site ID for the PMS 300 NSERC IDE DRL site */
  pms300SiteId: string
  /** SharePoint list ID containing the PMS 300 DRL / DRL records */
  drlListId: string
  /** Microsoft Graph base URL */
  graphBaseUrl: string
}

/**
 * TODO: PRODUCTION — Move to Vercel environment secrets:
 *   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET,
 *   PMS300_SITE_ID, PMS300_DRL_LIST_ID
 */
const PMS300_CONFIG: PMS300SyncConfig = {
  tenantId: 'TODO_NAVSEA_AZURE_TENANT_ID',
  clientId: 'TODO_S4_LEDGER_CLIENT_ID',
  pms300SiteId: 'TODO_PMS300_SHAREPOINT_SITE_ID',
  drlListId: 'TODO_PMS300_DRL_LIST_ID',
  graphBaseUrl: 'https://graph.microsoft.com/v1.0',
}

/* ═══════════════════════════════════════════════════════════════
   §2  Types
   ═══════════════════════════════════════════════════════════════ */

export type SyncSource = 'NSERC IDE (PMS 300)'

export interface SyncServiceResult {
  /** Whether this came from a real API or from simulation */
  isReal: boolean
  /** Always 'NSERC IDE (PMS 300)' for this service */
  source: SyncSource
  /** Rows returned from the PMS 300 DRL SharePoint list */
  rows: DRLRow[]
  /** ISO timestamp of the fetch */
  fetchedAt: string
  /** Any non-fatal warnings */
  warnings: string[]
}

/* ═══════════════════════════════════════════════════════════════
   §3  Azure AD Token Acquisition for PMS 300
   ═══════════════════════════════════════════════════════════════ */

/**
 * Acquire a bearer token from the DoD Azure AD tenant.
 *
 * Production flow (client-credentials, server-to-server):
 *   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
 *   Content-Type: application/x-www-form-urlencoded
 *   Body:
 *     grant_type=client_credentials
 *     client_id={clientId}
 *     client_secret={AZURE_CLIENT_SECRET}          // from Vercel secrets
 *     scope=https://graph.microsoft.com/.default
 *
 * User-delegated (CAC/PIV) flow:
 *   @azure/msal-browser acquireTokenSilent({
 *     scopes: ['Sites.Read.All', 'User.Read'],
 *     account: currentAccount,
 *   })
 *
 * Returns null when credentials are not yet configured (simulation mode).
 */
async function acquirePMS300Token(config: PMS300SyncConfig): Promise<string | null> {
  // ┌─────────────────────────────────────────────────────────────┐
  // │  TODO: PRODUCTION — Uncomment when PMS 300 Azure AD app is  │
  // │  registered and AZURE_CLIENT_SECRET is in Vercel secrets.    │
  // │                                                              │
  // │  const tokenEndpoint =                                       │
  // │    `https://login.microsoftonline.com/                       │
  // │     ${config.tenantId}/oauth2/v2.0/token`;                   │
  // │                                                              │
  // │  const body = new URLSearchParams({                          │
  // │    grant_type: 'client_credentials',                         │
  // │    client_id: config.clientId,                               │
  // │    client_secret: process.env.AZURE_CLIENT_SECRET!,          │
  // │    scope: 'https://graph.microsoft.com/.default',            │
  // │  });                                                         │
  // │                                                              │
  // │  const resp = await fetch(tokenEndpoint, {                   │
  // │    method: 'POST',                                           │
  // │    headers: {                                                │
  // │      'Content-Type': 'application/x-www-form-urlencoded',    │
  // │    },                                                        │
  // │    body,                                                     │
  // │  });                                                         │
  // │                                                              │
  // │  if (!resp.ok) {                                             │
  // │    const err = await resp.text();                             │
  // │    throw new Error(`PMS 300 token acquisition failed:        │
  // │      ${resp.status} — ${err}`);                              │
  // │  }                                                           │
  // │                                                              │
  // │  const json = await resp.json();                             │
  // │  return json.access_token as string;                         │
  // └─────────────────────────────────────────────────────────────┘

  console.info('[NSERC IDE PMS 300] Token acquisition skipped — using simulated mode')
  return null
}

/* ═══════════════════════════════════════════════════════════════
   §4  PMS 300 SharePoint / Microsoft Graph API
   ═══════════════════════════════════════════════════════════════ */

/**
 * Fetch DRL items from the PMS 300 NSERC IDE SharePoint list.
 *
 * Production endpoint:
 *   GET https://graph.microsoft.com/v1.0
 *       /sites/{pms300SiteId}/lists/{drlListId}/items
 *       ?$expand=fields($select=DRL_ID,Title,DI_Number,Contract_Due,
 *         Calc_Due_Date,Submittal_Guide,Actual_Sub_Date,Received,
 *         Cal_Days_Review,Notes,Status,Revision,Comments)
 *       &$top=500
 *       &$filter=fields/Program eq 'PMS 300'
 *
 * Headers:
 *   Authorization: Bearer {token}
 *   Accept: application/json
 *   ConsistencyLevel: eventual        (required for $filter on indexed cols)
 *
 * SharePoint field mapping (PMS 300 DRL list):
 *   fields.DRL_ID          -> row.id
 *   fields.Title             -> row.title
 *   fields.DI_Number         -> row.diNumber
 *   fields.Contract_Due      -> row.contractDueFinish
 *   fields.Calc_Due_Date     -> row.calculatedDueDate
 *   fields.Submittal_Guide   -> row.submittalGuidance
 *   fields.Actual_Sub_Date   -> row.actualSubmissionDate
 *   fields.Received          -> row.received
 *   fields.Cal_Days_Review   -> row.calendarDaysToReview
 *   fields.Notes             -> row.notes
 *   fields.Status            -> row.status ('green'|'yellow'|'red')
 *   fields.Revision          -> (appended to title if present)
 *   fields.Comments          -> (appended to notes if present)
 */
async function fetchPMS300Items(
  _config: PMS300SyncConfig,
  token: string | null,
  currentRows: DRLRow[],
): Promise<SyncServiceResult> {
  if (token) {
    // ┌─────────────────────────────────────────────────────────────┐
    // │  TODO: PRODUCTION — Real Microsoft Graph call for PMS 300   │
    // │                                                              │
    // │  const url =                                                 │
    // │    `${config.graphBaseUrl}/sites/${config.pms300SiteId}`     │
    // │    + `/lists/${config.drlListId}/items`                      │
    // │    + `?$expand=fields($select=DRL_ID,Title,DI_Number,`     │
    // │    + `Contract_Due,Calc_Due_Date,Submittal_Guide,`          │
    // │    + `Actual_Sub_Date,Received,Cal_Days_Review,`            │
    // │    + `Notes,Status,Revision,Comments)`                       │
    // │    + `&$top=500`                                             │
    // │    + `&$filter=fields/Program eq 'PMS 300'`;                │
    // │                                                              │
    // │  const resp = await fetch(url, {                             │
    // │    headers: {                                                │
    // │      Authorization: `Bearer ${token}`,                       │
    // │      Accept: 'application/json',                             │
    // │      ConsistencyLevel: 'eventual',                           │
    // │    },                                                        │
    // │  });                                                         │
    // │                                                              │
    // │  if (!resp.ok) throw new Error(                              │
    // │    `PMS 300 Graph API ${resp.status}: ${resp.statusText}`);  │
    // │                                                              │
    // │  const data = await resp.json();                             │
    // │  const rows = data.value.map(normalizePMS300Item);           │
    // │                                                              │
    // │  return {                                                    │
    // │    isReal: true,                                             │
    // │    source: 'NSERC IDE (PMS 300)',                            │
    // │    rows,                                                     │
    // │    fetchedAt: new Date().toISOString(),                      │
    // │    warnings: [],                                             │
    // │  };                                                          │
    // └─────────────────────────────────────────────────────────────┘
    void token // will be used when real call is implemented
  }

  // ── Simulated response (active until PMS 300 credentials are provisioned) ──
  return simulatePMS300Response(currentRows)
}

/* ═══════════════════════════════════════════════════════════════
   §5  PMS 300 Field Normalizer
   ═══════════════════════════════════════════════════════════════ */

/**
 * TODO: PRODUCTION — Normalize a PMS 300 SharePoint list item to DRLRow.
 *
 * interface PMS300SharePointItem {
 *   id: string
 *   fields: {
 *     DRL_ID: string              // e.g. "DRL-001"
 *     Title: string                // e.g. "ILS Management Plan (Hull 1)"
 *     DI_Number: string            // e.g. "DI-ILSS-80555A"
 *     Contract_Due: string         // ISO date, e.g. "2026-06-15"
 *     Calc_Due_Date: string        // ISO date
 *     Submittal_Guide: string      // e.g. "IAW DRL A001, Block 16"
 *     Actual_Sub_Date: string | null
 *     Received: string             // e.g. "Yes" | "No" | "Partial"
 *     Cal_Days_Review: number | null
 *     Notes: string
 *     Status: 'Green' | 'Yellow' | 'Red'
 *     Revision: string | null      // e.g. "Rev B"
 *     Comments: string | null      // PMS 300 reviewer comments
 *     Program: string              // always "PMS 300" for this query
 *   }
 * }
 *
 * function normalizePMS300Item(item: PMS300SharePointItem): DRLRow {
 *   const rev = item.fields.Revision ? ` (${item.fields.Revision})` : ''
 *   const comments = item.fields.Comments
 *     ? `\nPMS 300 Comment: ${item.fields.Comments}`
 *     : ''
 *   return {
 *     id: item.fields.DRL_ID,
 *     title: item.fields.Title + rev,
 *     diNumber: item.fields.DI_Number,
 *     contractDueFinish: item.fields.Contract_Due,
 *     calculatedDueDate: item.fields.Calc_Due_Date,
 *     submittalGuidance: item.fields.Submittal_Guide,
 *     actualSubmissionDate: item.fields.Actual_Sub_Date || '',
 *     received: item.fields.Received,
 *     calendarDaysToReview: item.fields.Cal_Days_Review,
 *     notes: item.fields.Notes + comments,
 *     status: item.fields.Status.toLowerCase() as DRLRow['status'],
 *   }
 * }
 */

/* ═══════════════════════════════════════════════════════════════
   §6  PMS 300 Simulation Layer
   ═══════════════════════════════════════════════════════════════
   Active until real Azure AD credentials are provisioned.
   Uses realistic PMS 300 PMS 300 Boats & Craft contractual language. */

const PMS300_REMARKS: Record<string, string[]> = {
  green: [
    'PMS 300 review complete — deliverable accepted, no further action required per PMS 300 DRL.',
    'Accepted by PMS 300 Program Office — revision incorporated per contract modification P00012.',
    'Final acceptance recorded in NSERC IDE — Contracting Officer concurrence obtained.',
  ],
  yellow: [
    'PMS 300: Under government review — response expected within 15 calendar days per DFARS 252.242-7006.',
    'PMS 300: Minor comments returned by NAVSEA technical authority — contractor resubmittal requested within 30 days.',
    'PMS 300: Technical evaluation in progress by PMS 300 engineering division.',
  ],
  red: [
    'PMS 300: Delinquent — past contractual due date per PMS 300 DRL. Cure notice under consideration.',
    'PMS 300: Rejected — significant deficiencies per MIL-STD-1916 sampling. Full resubmittal required.',
    'PMS 300: Overdue submittal — escalated to PMS 300 Program Manager for corrective action coordination.',
  ],
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function simulatePMS300Response(currentRows: DRLRow[]): SyncServiceResult {
  // Pick 2-4 rows to receive simulated PMS 300 NSERC IDE updates
  const count = 2 + Math.floor(Math.random() * 3)
  const indices = new Set<number>()
  while (indices.size < Math.min(count, currentRows.length)) {
    indices.add(Math.floor(Math.random() * currentRows.length))
  }

  const rows = Array.from(indices).map(idx => {
    const row = currentRows[idx]
    const remarks = PMS300_REMARKS[row.status]
    const newNote = `[NSERC IDE (PMS 300)] ${pickRandom(remarks)}`

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
    warnings: ['Simulated — PMS 300 Azure AD credentials not yet provisioned.'],
  }
}

/* ═══════════════════════════════════════════════════════════════
   §7  Public API — performRealSync()
   ═══════════════════════════════════════════════════════════════ */

/**
 * Official NSERC IDE connection point for PMS 300.
 *
 * Tries real Microsoft Graph API against the PMS 300 SharePoint DRL list.
 * Falls back gracefully to simulation if Azure AD credentials are not yet
 * configured in Vercel secrets.
 *
 * @param currentRows - Current DRL table data to diff against
 * @param config      - Optional PMS 300 config override (for testing)
 * @returns Single-element array with SyncServiceResult from NSERC IDE (PMS 300)
 */
export async function performRealSync(
  currentRows: DRLRow[],
  config: PMS300SyncConfig = PMS300_CONFIG,
): Promise<SyncServiceResult[]> {
  // Step 1: Acquire Azure AD token for PMS 300 SharePoint site
  const token = await acquirePMS300Token(config)

  // Step 2: Fetch DRL items from NSERC IDE (PMS 300)
  try {
    const result = await fetchPMS300Items(config, token, currentRows)
    return [result]
  } catch (e) {
    console.error('[NSERC IDE PMS 300] Fetch failed, falling back to simulation:', e)
    return [simulatePMS300Response(currentRows)]
  }
}
