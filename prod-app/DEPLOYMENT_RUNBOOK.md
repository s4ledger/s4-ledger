# S4 Ledger Prod-App — Deployment Runbook

**Version:** 5.12.0  
**Last Updated:** March 5, 2026

---

## Pre-Deployment Checklist

- [ ] All source changes are in `prod-app/src/` (NOT in `dist/`)
- [ ] Service Worker version bumped in `prod-app/public/sw.js` (e.g., `s4-prod-v709` → `s4-prod-v710`)
- [ ] No `console.log` in production code (terser strips them, but verify)
- [ ] DOMPurify wraps all `.innerHTML` assignments via `_s4Safe()`
- [ ] Cross-chunk window exports verified (run: `npx playwright test tests/e2e/prod-app-smoke.spec.js`)
- [ ] Build succeeds with zero errors

## Build & Deploy

### 1. Install Dependencies (first time or after package.json changes)

```bash
cd prod-app && npm install
```

### 2. Build Production Bundle

```bash
cd prod-app && rm -rf dist && npx vite build
```

**Expected output:**
```
✓ 6 modules transformed.
dist/index.html                   427.xx kB
dist/assets/engine-XXXXXXXX.js    ~503 kB
dist/assets/enhancements-XXXX.js  ~237 kB
dist/assets/navigation-XXXX.js    ~51 kB
dist/assets/metrics-XXXXXXXX.js   ~49 kB
dist/assets/index-XXXXXXXXX.js    ~43 kB
dist/assets/main-XXXXXXXXX.css    ~89 kB
```

### 3. Local Verification

```bash
# From workspace root (not prod-app/)
python3 preview_server.py 8080
# Then open: http://localhost:8080
```

**Verify manually:**
1. Landing page loads with S4 Ledger logo
2. Click "Enter Platform" → DoD Consent → Accept → CAC Login → Authenticate
3. Onboarding wizard appears → Select tier → Complete 5 steps
4. Role selector appears → Pick a role → Apply
5. Workspace loads, AI agent visible (bottom-right)
6. Navigate to each section (Anchor, Verify, Log, ILS, Systems, Metrics)
7. Anchor a test record → Verify balance deducts 0.01 Credits
8. Check Audit Vault shows the record
9. Toggle dark/light mode
10. Test logout returns to landing

### 4. Run E2E Tests

```bash
# Start server in background
npx serve -l 9999 -s . &

# Run prod-app test suite
npx playwright test tests/e2e/prod-app-smoke.spec.js tests/e2e/prod-anchor-flow.spec.js

# Or run all E2E tests
npx playwright test
```

### 5. Commit & Deploy

```bash
git add -A
git commit -m "feat: <description>"
git push origin main
```

Vercel auto-deploys from the `main` branch. Deployment is live within ~60 seconds.

### 6. Post-Deploy Verification

Visit https://s4ledger.com and run through the manual verification steps above.

---

## Environment Variables (Vercel Dashboard)

Navigate to: **Vercel Dashboard → Project → Settings → Environment Variables**

| Variable | Required | Description |
|----------|:--------:|-------------|
| `XRPL_WALLET_SEED` | ✅ | XRPL wallet seed for anchoring transactions |
| `XRPL_TREASURY_SEED` | ✅ | Treasury wallet seed for fee collection |
| `XRPL_DEMO_SEED` | Optional | Demo wallet for test transactions |
| `XRPL_NETWORK` | ✅ | `mainnet` or `testnet` |
| `S4_API_MASTER_KEY` | ✅ | Master API key for admin endpoints |
| `OPENAI_API_KEY` | ✅ | OpenAI GPT-4o key for AI assistant |
| `ANTHROPIC_API_KEY` | Optional | Claude key (cascade fallback if OpenAI fails) |
| `SUPABASE_URL` | ✅ | Supabase project URL for auth/database |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public key |
| `STRIPE_SECRET_KEY` | Optional | Stripe key for subscription billing |
| `STRIPE_PRICE_*` | Optional | Stripe price IDs per tier |

---

## Rollback Procedure

If a deployment introduces issues:

```bash
# Option 1: Revert to previous commit
git revert HEAD
git push origin main

# Option 2: Redeploy from Vercel Dashboard
# Go to Deployments → Find last known good → Click ⋯ → Redeploy
```

---

## Build Configuration Reference

| Setting | Value | Why |
|---------|-------|-----|
| Bundler | Vite 6.x | Fast builds, ES module output |
| Minifier | **terser** | Preserves `window.*` exports (esbuild tree-shakes them) |
| `treeshake` | `false` | Required — all functions called via `window.*` and `onclick` |
| `sourcemap` | `false` | Security — no source maps in production |
| `drop_console` | `true` | Strip `console.log/debugger` in production |
| `target` | `es2020` | Browser compatibility |
| Base path | `/prod-app/dist/` | Matches Vercel rewrite rules |

### Chunk Strategy

```
main.js (entry)
├── engine chunk    (engine.js)           ~503 KB — core logic
├── enhancements    (enhancements.js)     ~237 KB — feature modules
├── navigation      (navigation + roles + onboarding) ~51 KB
├── metrics         (metrics + web-vitals) ~49 KB
└── core/index      (sanitize, session-init, etc.) ~43 KB
```

---

## Vercel Routing (vercel.json)

```
/                    → prod-app/dist/index.html
/demo-app            → demo-app/dist/index.html
/demo.html           → prod-app/demo.html
/api/*               → api/index.py (serverless function)
```

Headers applied: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=()`.

---

## Troubleshooting

### Build fails with "Cannot find module"
```bash
cd prod-app && rm -rf node_modules && npm install
```

### Preview shows broken CSS/logos
Use `python3 preview_server.py 8080` from workspace root — NOT `npx vite preview` (Vite dev server doesn't serve `/s4-assets/`).

### Cross-chunk functions undefined at runtime
Check that `window.*` exports exist in the declaring module. Run the Playwright smoke test to catch all missing exports:
```bash
npx playwright test tests/e2e/prod-app-smoke.spec.js --grep "exports"
```

### Anchor button does nothing
Common cause: `enhancements.js` failed to load (S4.register error). Check that `index.html` has the inline `S4.register` definition:
```html
<script>
  window.S4 = window.S4 || {};
  S4.modules = S4.modules || {};
  S4.register = S4.register || function(name, meta) { S4.modules[name] = meta; };
</script>
```

### DOMPurify strips onclick handlers
Verify `sanitize.js` includes `ADD_URI_SAFE_ATTR: ['onclick', 'onchange']`.

### Service Worker caching stale content
Bump the cache name in `public/sw.js` (e.g., `s4-prod-v709` → `s4-prod-v710`) and rebuild.
