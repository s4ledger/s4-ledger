# NSERC IDE Activation Guide — PMS 300

> **Created:** April 6, 2026 (v8.10.0)
> **Purpose:** Step-by-step instructions for activating the real NSERC IDE connection when Azure AD credentials are provisioned.

---

## Current State (Simulation Mode)

The NSERC IDE connection is **fully coded and production-ready**. Right now the app runs in **simulation mode** — it generates realistic PMS 300 DRL data using Attachment J-2 contractual language. When live, it will connect to the actual NAVSEA NSERC Integrated Data Environment SharePoint site via Microsoft Graph API.

**What's already built:**
- Backend proxy (`/api/nserc-sync.ts`) — Vercel serverless function that handles Azure AD token acquisition server-side
- Token caching with auto-refresh (5-minute pre-expiry buffer)
- Retry logic with exponential backoff (3 retries: 2s → 5s → 10s)
- AbortController timeouts (15s for auth, 30s for Graph API calls)
- OData injection prevention (craft filter sanitization)
- Response schema validation (verifies `{ value: [...] }` shape)
- Per-row field validation before mapping to DRLRow
- Pagination support (`@odata.nextLink`, 5000-item safety cap)
- Error categorization (AUTH_FAILED, FORBIDDEN, RATE_LIMITED, TIMEOUT, NETWORK_ERROR, etc.)
- UI simulation mode banner (amber bar below header)
- Automatic mode detection — the app switches to real sync as soon as env vars are set

---

## Step 1: Azure AD App Registration

You need an Azure AD app registration in the NAVSEA M365 (DoD) tenant.

### Required Information to Obtain:
| Value | Description | Where It Goes |
|-------|-------------|---------------|
| **Tenant ID** | DoD Azure AD tenant ID (NAVSEA M365) | `VITE_AZURE_TENANT_ID` |
| **Client ID** | Azure AD application (client) ID for S4 Ledger | `VITE_AZURE_CLIENT_ID` |
| **Client Secret** | Azure AD client secret (rotates, typically 1-2 year expiry) | `AZURE_CLIENT_SECRET` |

### Required Graph API Permissions (Application type, NOT delegated):
| Permission | Type | Purpose |
|------------|------|---------|
| `Sites.Read.All` | Application | Read SharePoint site/list content |
| `Sites.ReadWrite.All` | Application | Future: write-back sync status |
| `Files.Read.All` | Application | Future: download DRL documents |

### Admin Consent:
- These application permissions require **Azure AD admin consent** from the NAVSEA tenant admin
- Request consent through the Azure Portal > App Registrations > API Permissions > "Grant admin consent"

---

## Step 2: Get SharePoint Site & List IDs

You need the IDs for the PMS 300 NSERC IDE SharePoint resources.

### How to find the Site ID:
```
GET https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}
```
Example:
```
GET https://graph.microsoft.com/v1.0/sites/navsea.sharepoint.com:/sites/NSERC-PMS300
```
The response `id` field is your **Site ID**.

### How to find the DRL List ID:
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists
```
Look for the list that contains the DRL metadata records. The `id` field is your **List ID**.

### How to find the Document Drive ID (optional, for future file retrieval):
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
```
Find the drive that contains DRL documents. The `id` field is your **Drive ID**.

### Required Information:
| Value | Description | Where It Goes |
|-------|-------------|---------------|
| **Site ID** | PMS 300 SharePoint site ID in NSERC IDE | `VITE_PMS300_SITE_ID` |
| **DRL List ID** | SharePoint list ID for DRL metadata | `VITE_PMS300_DRL_LIST_ID` |
| **Document Drive ID** | SharePoint drive ID for DRL docs (future) | `VITE_PMS300_DOC_DRIVE_ID` |

---

## Step 3: Verify SharePoint List Column Names

The code expects these exact SharePoint column **internal names** on the DRL list:

| Internal Name | Type | Example Value |
|---------------|------|---------------|
| `DRL_ID` | Text | `DRL-001` |
| `Title` | Text | `ILS Management Plan` |
| `DI_Number` | Text | `DI-ILSS-80555A` |
| `Contract_Due` | Date (ISO) | `2026-06-15` |
| `Calc_Due_Date` | Date (ISO) | `2026-06-30` |
| `Submittal_Guide` | Text | `IAW DRL A001, Block 16` |
| `Actual_Sub_Date` | Date (ISO or null) | `2026-05-20` |
| `Received` | Text | `Yes` / `No` / `Partial` |
| `Cal_Days_Review` | Number (or null) | `30` |
| `Notes` | Multi-line Text | Free text |
| `Status` | Choice | `Green` / `Yellow` / `Red` |
| `Revision` | Text (or null) | `Rev B` |
| `Comments` | Multi-line Text (or null) | Reviewer comments |
| `Craft` | Text (or null) | `Hull 1` |
| `Platform` | Text (or null) | `Harbor Tug YTB` |
| `Attachment_J2_Ref` | Text (or null) | `Exhibit A, Item A001` |
| `Program` | Text | `PMS 300` |

> **⚠️ CRITICAL:** If the SharePoint list uses **different internal column names**, you must update the field mapping in `src/services/nsercIdeService.ts` → `mapNSERCDataToTrackerRow()` and the `$select` field list in `api/nserc-sync.ts` → `fetchGraphItems()`.

---

## Step 4: Set Environment Variables in Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**.

### Frontend Variables (VITE_ prefix — exposed to browser, non-secret):
```
VITE_AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_PMS300_SITE_ID=your-pms300-site-id
VITE_PMS300_DRL_LIST_ID=your-drl-list-id
VITE_PMS300_DOC_DRIVE_ID=your-doc-drive-id
VITE_APP_MODE=production
```

### Server-Only Variables (NO VITE_ prefix — never reaches the browser):
```
AZURE_CLIENT_SECRET=your-client-secret-value
```

> **⚠️ SECURITY:** `AZURE_CLIENT_SECRET` must **NOT** have the `VITE_` prefix. The `VITE_` prefix would expose it to the browser. Without the prefix, it's only accessible to Vercel serverless functions (`/api/nserc-sync`).

### Recommended: Set for specific environments:
- **Production** environment: All variables above
- **Preview** environment: Same variables (for staging/PR previews) or leave empty to use simulation mode
- **Development** environment: Leave empty (uses simulation mode locally)

---

## Step 5: Deploy and Verify

### 5a. Deploy
```bash
git push origin main
# Vercel auto-deploys from main branch
```

### 5b. Verify the proxy health check
Open your browser console or use curl:
```bash
curl -X POST https://s4ledger.com/api/nserc-sync \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'
```

Expected response:
```json
{
  "status": "ok",
  "configured": true,
  "timestamp": "2026-XX-XXTXX:XX:XX.XXXZ"
}
```

If `configured` is `false`, the server-side env vars (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`) are missing.

### 5c. Verify the simulation banner disappears
- Load the app in production
- The **amber "Simulation Mode" banner** below the header should be **gone**
- The sync toast should say `NSERC IDE (PMS 300): X updates synced` **without** `[Simulated]`

### 5d. Verify a real sync
- Click the sync button in the Deliverables Tracker toolbar
- Check the browser console for `[NSERC IDE (PMS 300)] Production proxy connected — real sync mode active`
- Verify DRL rows populate with real data from the SharePoint list

---

## Step 6: Verify SharePoint Field Mapping

After the first successful real sync, check that:

1. **Row IDs** match the SharePoint `DRL_ID` values
2. **Titles** include revision suffixes (e.g., "ILS Management Plan (Rev B)")
3. **Status colors** map correctly (Green/Yellow/Red)
4. **Notes** include Attachment J-2 references and Comments
5. **Dates** parse correctly (ISO format)
6. **Craft/Platform** tags appear in titles

If any fields are wrong, update `mapNSERCDataToTrackerRow()` in `nsercIdeService.ts`.

---

## Troubleshooting

### Error: AUTH_FAILED (401)
- Client secret may have expired — regenerate in Azure Portal
- Ensure `AZURE_CLIENT_SECRET` is set in Vercel (server-only, no VITE_ prefix)
- Verify tenant ID and client ID match the app registration

### Error: FORBIDDEN (403)
- Graph API permissions not granted — check admin consent in Azure Portal
- Ensure `Sites.Read.All` application permission is granted (not delegated)

### Error: NOT_FOUND (404)
- Site ID or List ID is wrong — re-verify with Graph Explorer
- The SharePoint site may have moved or been renamed

### Error: RATE_LIMITED (429)
- Built-in retry handles this automatically (honors Retry-After header)
- If persistent, reduce auto-sync frequency (currently 5 minutes)

### Error: TIMEOUT
- Graph API is slow or unreachable — retries handle transient issues
- If persistent, check network connectivity to `graph.microsoft.com`

### Error: INVALID_RESPONSE
- SharePoint list schema may have changed
- Verify column internal names match Step 3 table above

### Simulation banner still showing after setting env vars:
- You may need to **redeploy** for VITE_ vars to take effect (they're baked at build time)
- Check Vercel deployment logs for the build

---

## Architecture Reference

```
┌─────────────────────────────────────────────────────┐
│  Browser (S4 Ledger Frontend)                       │
│                                                     │
│  nsercIdeService.connectToNSERCIDE()                │
│    → POST /api/nserc-sync { action: 'health' }     │
│    → Returns { connected: true, token: '__proxy__' }│
│                                                     │
│  nsercIdeService.fetchLatestDRLUpdates()            │
│    → POST /api/nserc-sync { action: 'sync', ... }  │
│    → Validates response, maps rows via              │
│      mapNSERCDataToTrackerRow()                     │
│    → Returns NSERCSyncResult { isReal: true, ... }  │
│                                                     │
│  externalSync.ts realSyncPipeline()                 │
│    → Diffs rows, seals to XRPL, AI analysis,       │
│      RACI notifications                             │
└──────────────────────┬──────────────────────────────┘
                       │ POST /api/nserc-sync
                       ▼
┌─────────────────────────────────────────────────────┐
│  Vercel Serverless Function (/api/nserc-sync.ts)    │
│                                                     │
│  acquireToken()                                     │
│    → POST https://login.microsoftonline.com/        │
│      {tenant}/oauth2/v2.0/token                     │
│    → client_credentials grant                       │
│    → Token cached with 5-min pre-expiry refresh     │
│                                                     │
│  fetchGraphItems()                                  │
│    → GET https://graph.microsoft.com/v1.0/          │
│      sites/{siteId}/lists/{listId}/items            │
│    → Pagination via @odata.nextLink                 │
│    → Returns { value: [...items] }                  │
└──────────────────────┬──────────────────────────────┘
                       │ Bearer token
                       ▼
┌─────────────────────────────────────────────────────┐
│  Microsoft Graph API → NSERC IDE SharePoint         │
│  (DoD M365 Tenant)                                  │
│                                                     │
│  PMS 300 DRL SharePoint List                        │
│    → DRL_ID, Title, Status, Notes, etc.             │
└─────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `api/nserc-sync.ts` | Vercel serverless proxy — token acquisition & Graph API calls (server-side) |
| `S4-DemoApplication/src/services/nsercIdeService.ts` | Frontend service — auth, fetch, field mapping, simulation fallback |
| `S4-DemoApplication/src/services/externalSyncService.ts` | Thin wrapper delegating to nsercIdeService (backward compat) |
| `S4-DemoApplication/src/utils/externalSync.ts` | Sync orchestration — diff, XRPL seal, AI analysis, RACI notifications |
| `S4-DemoApplication/src/components/DeliverablesTracker.tsx` | UI — sync button, simulation banner, error display |
| `S4-DemoApplication/.env.example` | Template for all required environment variables |
| `S4-DemoApplication/src/config/appConfig.ts` | Config loader (demo vs production mode) |

---

## Security Checklist

- [ ] `AZURE_CLIENT_SECRET` set as server-only env var (no `VITE_` prefix)
- [ ] Client secret NOT committed to git (verify with `git log --all -p -- '*secret*'`)
- [ ] Content Security Policy in `vercel.json` allows `connect-src` to self (for `/api/nserc-sync`)
- [ ] Azure AD app registration uses minimum required permissions
- [ ] Client secret has a rotation schedule (recommended: rotate every 6-12 months)
- [ ] Vercel deployment uses HTTPS only (enforced by default)

---

## Client Secret Rotation

When the Azure AD client secret approaches expiry:

1. Generate a new secret in Azure Portal → App Registrations → Certificates & Secrets
2. Update `AZURE_CLIENT_SECRET` in Vercel environment variables
3. Redeploy (or the new value takes effect on next serverless function cold start)
4. Delete the old secret from Azure Portal after confirming the new one works

The token cache in the serverless function auto-refreshes — no code changes needed.
