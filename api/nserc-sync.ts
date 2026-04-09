/**
 * Vercel Serverless Function — NSERC IDE Sync Proxy
 *
 * Handles Azure AD token acquisition and Microsoft Graph API calls
 * server-side so the client secret never touches the browser.
 *
 * POST /api/nserc-sync
 *
 * Actions:
 *   { action: 'health' }  → Verify proxy is reachable and configured
 *   { action: 'sync', siteId, listId, craft? } → Fetch DRL items from Graph API
 *
 * Required Vercel Environment Variables (server-only, NOT VITE_ prefixed):
 *   AZURE_TENANT_ID     — DoD Azure AD tenant ID
 *   AZURE_CLIENT_ID     — Azure AD app registration client ID
 *   AZURE_CLIENT_SECRET — Azure AD app registration client secret
 *
 * Required Graph API Permissions:
 *   Sites.Read.All       — Read SharePoint site/list content
 *   Sites.ReadWrite.All  — Future: write-back sync status
 *   Files.Read.All       — Future: download DRL documents
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/* ── Auth Helpers ─────────────────────────────────────────────── */

/** Validate the Supabase JWT from the Authorization header */
async function validateAuth(req: VercelRequest): Promise<{ ok: boolean; uid?: string }> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase isn't configured, require an API key fallback
    const apiKey = process.env.NSERC_API_KEY
    if (!apiKey) return { ok: false }
    const provided = req.headers['x-api-key']
    return { ok: provided === apiKey, uid: 'api-key' }
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { ok: false }
  const token = authHeader.slice(7)

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return { ok: false }
    return { ok: true, uid: data.user.id }
  } catch {
    return { ok: false }
  }
}

/* ── Rate Limiter (in-memory sliding window) ──────────────────── */

const rateLimitWindow = 60_000 // 1 minute
const rateLimitMax = 30 // max requests per window per IP
const rateBuckets = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const hits = rateBuckets.get(ip) || []
  // Prune expired entries
  const valid = hits.filter(t => now - t < rateLimitWindow)
  if (valid.length >= rateLimitMax) {
    rateBuckets.set(ip, valid)
    return false
  }
  valid.push(now)
  rateBuckets.set(ip, valid)
  return true
}

// Periodically evict stale buckets to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [ip, hits] of rateBuckets) {
    const valid = hits.filter(t => now - t < rateLimitWindow)
    if (valid.length === 0) rateBuckets.delete(ip)
    else rateBuckets.set(ip, valid)
  }
}, 5 * 60_000)

/* ── Token Cache ──────────────────────────────────────────────── */

interface CachedToken {
  accessToken: string
  expiresAt: number // Unix ms
}

let tokenCache: CachedToken | null = null
const TOKEN_BUFFER_MS = 5 * 60 * 1000 // refresh 5 min before expiry

/* ── Configuration ────────────────────────────────────────────── */

function getServerConfig() {
  return {
    tenantId: process.env.AZURE_TENANT_ID || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
  }
}

function isConfigured(): boolean {
  const cfg = getServerConfig()
  return !!(cfg.tenantId && cfg.clientId && cfg.clientSecret)
}

/* ── Token Acquisition ────────────────────────────────────────── */

async function acquireToken(): Promise<string> {
  // Return cached token if still valid
  if (tokenCache && Date.now() < tokenCache.expiresAt - TOKEN_BUFFER_MS) {
    return tokenCache.accessToken
  }

  const cfg = getServerConfig()
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId)}/oauth2/v2.0/token`

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '')
      throw new Error(`Azure AD token acquisition failed: ${resp.status} — ${errBody.slice(0, 300)}`)
    }

    const json = await resp.json()
    const accessToken = json.access_token as string
    const expiresIn = (json.expires_in as number) || 3600

    // Cache the token
    tokenCache = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    }

    return accessToken
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

/* ── Graph API Fetch ──────────────────────────────────────────── */

async function fetchGraphItems(
  token: string,
  siteId: string,
  listId: string,
  craft?: string,
): Promise<unknown[]> {
  const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

  // Build OData filter — craft value is validated by frontend sanitizeCraftFilter()
  let filter = "fields/Program eq 'PMS 300'"
  if (craft) {
    // Double-escape single quotes for OData
    const safeCraft = craft.replace(/'/g, "''")
    filter += ` and fields/Craft eq '${safeCraft}'`
  }

  const fields = [
    'DRL_ID', 'Title', 'DI_Number', 'Contract_Due', 'Calc_Due_Date',
    'Submittal_Guide', 'Actual_Sub_Date', 'Received', 'Cal_Days_Review',
    'Notes', 'Status', 'Revision', 'Comments', 'Craft', 'Platform',
    'Attachment_J2_Ref',
  ].join(',')

  let url: string | null =
    `${GRAPH_BASE}/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items`
    + `?$expand=fields($select=${fields})`
    + `&$top=500`
    + `&$filter=${encodeURIComponent(filter)}`

  const allItems: unknown[] = []

  // Paginate through all results using @odata.nextLink
  while (url) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ConsistencyLevel: 'eventual',
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '')
        throw new Error(`Graph API error: ${resp.status} — ${errBody.slice(0, 300)}`)
      }

      const data = await resp.json()

      if (data.value && Array.isArray(data.value)) {
        allItems.push(...data.value)
      }

      // Follow pagination link if present
      url = data['@odata.nextLink'] || null

      // Safety: cap at 5000 items to prevent runaway pagination
      if (allItems.length > 5000) {
        console.warn('[nserc-sync] Pagination cap reached (5000 items)')
        break
      }
    } catch (err) {
      clearTimeout(timeoutId)
      throw err
    }
  }

  return allItems
}

/* ── Handler ──────────────────────────────────────────────────── */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Rate Limiting ──
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests — try again later', code: 'RATE_LIMITED' })
  }

  const { action, siteId, listId, craft } = req.body || {}

  // ── Health Check (no auth required) ──
  if (action === 'health') {
    return res.status(200).json({
      status: 'ok',
      configured: isConfigured(),
      timestamp: new Date().toISOString(),
    })
  }

  // ── Auth Required for all actions below ──
  const auth = await validateAuth(req)
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized — valid Supabase session or API key required', code: 'UNAUTHORIZED' })
  }

  // ── Sync ──
  if (action === 'sync') {
    if (!isConfigured()) {
      return res.status(503).json({
        error: 'NSERC IDE credentials not configured on server',
        code: 'NOT_CONFIGURED',
      })
    }

    // Validate required parameters
    if (!siteId || typeof siteId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid siteId' })
    }
    if (!listId || typeof listId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid listId' })
    }
    if (craft !== undefined && typeof craft !== 'string') {
      return res.status(400).json({ error: 'Invalid craft parameter' })
    }

    try {
      const token = await acquireToken()
      const items = await fetchGraphItems(token, siteId, listId, craft)

      return res.status(200).json({
        value: items,
        fetchedAt: new Date().toISOString(),
        count: items.length,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[nserc-sync] Sync failed:', message)

      // Determine appropriate status code
      const status = message.includes('token acquisition') ? 401
        : message.includes('Graph API error: 403') ? 403
        : message.includes('Graph API error: 404') ? 404
        : message.includes('Graph API error: 429') ? 429
        : 502

      return res.status(status).json({ error: message, code: 'SYNC_FAILED' })
    }
  }

  return res.status(400).json({ error: 'Invalid action — expected "health" or "sync"' })
}
