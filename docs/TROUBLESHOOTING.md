# S4 Ledger — Troubleshooting Guide

Common issues and solutions for developers and operators.

---

## Build & Installation

### `npm install` fails with ERESOLVE

**Symptom:** Dependency resolution conflict during install.

**Fix:** Use `--legacy-peer-deps`:
```bash
npm install --legacy-peer-deps
```

---

### `vite build` fails: "Could not resolve entry module"

**Symptom:** Build fails when run from wrong directory.

**Fix:** Run from the correct app directory or use the workspace scripts:
```bash
# From workspace root (correct)
npm run build

# Or from individual app
cd demo-app && npm run build
```

---

### Python import errors (`ModuleNotFoundError`)

**Symptom:** `import xrpl` or `import cryptography` fails.

**Fix:**
```bash
pip install -r requirements.txt
# For test dependencies too:
pip install -r requirements-dev.txt
```

Ensure you're using the correct Python version (>= 3.10):
```bash
python3 --version
```

---

## Runtime Errors

### "Supabase connection failed" / API returns 500

**Symptom:** API calls fail, health endpoint shows `"degraded"`.

**Causes:**
1. Missing environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`)
2. Supabase project paused (free tier)
3. Network connectivity

**Fix:**
- Verify env vars: `echo $SUPABASE_URL`
- Check Supabase dashboard for project status
- Test connectivity: `curl https://YOUR_PROJECT.supabase.co/rest/v1/`

---

### "XRPL connection timeout"

**Symptom:** Anchoring fails, wallet balance returns error.

**Causes:**
1. XRPL node unreachable (network issue)
2. Invalid wallet seed

**Fix:**
- Check XRPL status: `curl https://s1.ripple.com:51234/ -d '{"method":"server_info"}'`
- Verify `XRPL_WALLET_SEED` is set and valid
- The API auto-retries with fallback nodes

---

### Toast errors: "Failed to save" / "API error"

**Symptom:** Red toast notifications in the UI.

**Context:** The `_s4Fetch` wrapper shows user-facing errors for failed API calls.

**Fix:**
1. Open browser DevTools → Network tab → check the failing request
2. Look at the response body for the specific error message
3. Check the API logs (Vercel dashboard → Function Logs) for structured JSON

---

### Blank panels / missing data after login

**Symptom:** ILS tool panels load but show no data.

**Causes:**
1. No program selected — most tools filter by program
2. Supabase RLS blocking queries (wrong org_id)
3. Demo mode active — demo uses mock data, not live API

**Fix:**
- Select a program from the program dropdown
- Check that the API key's org_id matches the data's org_id
- Verify you're on the correct app (demo-app vs prod-app)

---

## Testing

### Vitest: "Test environment was torn down"

**Symptom:** Tests intermittently fail with DOM cleanup errors.

**Fix:** Ensure async operations are awaited:
```javascript
// Bad
it('loads data', () => { fetchData(); });

// Good
it('loads data', async () => { await fetchData(); });
```

---

### Playwright: "Browser not found"

**Symptom:** E2E tests fail immediately.

**Fix:**
```bash
npx playwright install
```

---

### pytest: "ImportError: cannot import name"

**Symptom:** Python tests fail on import.

**Fix:**
```bash
pip install -r requirements-dev.txt
# Ensure you're in the workspace root
cd /path/to/s4ledger
pytest -v
```

---

## Deployment

### Vercel: "Serverless Function has crashed"

**Symptom:** 500 errors in production.

**Causes:**
1. Missing environment variable in Vercel project settings
2. Python dependency not in `requirements.txt`
3. Function timeout (default 10s on Hobby, 60s on Pro)

**Fix:**
- Check Vercel dashboard → Functions → Logs for the error
- Verify all env vars are set in Vercel → Settings → Environment Variables
- For large operations (batch anchor), ensure Pro plan for 60s timeout

---

### Build deploys but site shows old version

**Symptom:** Cache serving stale assets.

**Fix:**
- Both apps use cache-busting via Vite content hashes in filenames
- Force refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
- Clear service worker: DevTools → Application → Service Workers → Unregister

---

## Environment-Specific

### Flankspeed / Nautilus VDI

The apps auto-detect Navy VDI environments and disable:
- `backdrop-filter` (cause rendering issues on Citrix)
- Heavy CSS animations
- Non-allowlisted CDN requests

If the auto-detection fails, add `?vdi=true` to the URL.

---

### Air-Gapped / Offline Mode

**Symptom:** Cannot reach API endpoints (classified network).

**Expected behavior:** The app falls back to IndexedDB for local storage and queues hashes for later sync.

**To sync when back online:**
```bash
curl -X POST https://s4ledger.com/api/offline/sync
```

Or click the "Sync Queue" button in the Offline panel.

---

## Common Development Mistakes

1. **Editing only one app** — Changes must go in BOTH demo-app and prod-app. Shared files (`enhancements.js`, `web-vitals.js`) are copied between them.
2. **Forgetting to rebuild** — After JS changes, run `npm run build` before testing the production build.
3. **Not running tests** — Always `npm test && pytest -v` before committing.
4. **Wrong port** — Demo runs on 3001, prod on 3000.
5. **Inline scripts in HTML** — CSP blocks them in production. Use the module files instead.

---

## Getting Help

- **Structured logs:** API emits JSON to stdout — viewable in Vercel Function Logs
- **Client errors:** Automatically reported to `/api/errors/report` → Supabase `client_errors` table
- **Web Vitals:** Tracked and beaconed to `/api/vitals` on page hide
- **Health check:** `GET /api/health` shows service status
- **Security issues:** See [SECURITY.md](../SECURITY.md) for responsible disclosure
