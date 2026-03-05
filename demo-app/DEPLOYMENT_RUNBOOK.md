# S4 Ledger Demo-App — Deployment Runbook

**Version:** 5.12.0  
**Last Updated:** March 5, 2026

---

## Pre-Deployment Checklist

- [ ] All source changes are in `demo-app/src/` (NOT in `dist/`)
- [ ] Service Worker version bumped in `demo-app/sw.js` (e.g., `s4-v343` → `s4-v344`)
- [ ] No `console.log` in production code (esbuild strips them, but verify)
- [ ] DOMPurify wraps all `.innerHTML` assignments via `_s4Safe()`
- [ ] Cross-chunk window exports verified (run: `npx playwright test tests/e2e/demo-app-dedicated.spec.js`)
- [ ] Build succeeds with zero errors

## Build & Deploy

### 1. Install Dependencies (first time or after package.json changes)

```bash
cd demo-app && npm install
```

### 2. Build Production Bundle

```bash
cd demo-app && rm -rf dist && npx vite build
```

**Expected output:**
```
✓ 6 modules transformed.
dist/index.html                   xxx.xx kB
dist/assets/engine-XXXXXXXX.js    ~505 KB
dist/assets/enhancements-XXXX.js  ~224 KB
dist/assets/navigation-XXXX.js    ~52 KB
dist/assets/metrics-XXXXXXXX.js   ~49 KB
dist/assets/main-XXXXXXXXX.css    ~xx KB
```

### 3. Copy dist index.html to demo-app root

After building, copy the built `index.html` to the demo-app root for Vercel routing:

```bash
cp demo-app/dist/index.html demo-app/index.html
```

### 4. Local Verification

```bash
# From workspace root (not demo-app/)
python3 preview_server.py 8080
# Then open: http://localhost:8080/demo-app/dist/index.html
```

**Verify manually:**
1. Landing page loads with S4 Ledger logo
2. Click "Enter Platform" → DoD Consent → Accept → CAC Login → Authenticate
3. Onboarding wizard appears → Select tier → Complete 5 steps
4. Workspace loads, AI agent visible (bottom-right)
5. Demo banner and demo panel are visible
6. Navigate to each section (Anchor, Verify, Log, ILS, Systems, Metrics)
7. Anchor a test record → Verify balance deducts 0.01 Credits
8. Check Audit Vault shows the record
9. Toggle dark/light mode
10. Test demo credit flow visualizer
11. Test wallet tab toggle
12. Test logout returns to landing

### 5. Run E2E Tests

```bash
# Start server in background
npx serve -l 9999 -s . &

# Run demo-app test suite
npx playwright test tests/e2e/demo-app-dedicated.spec.js

# Or run all E2E tests
npx playwright test
```

### 6. Commit & Deploy

```bash
git add -A
git commit -m "feat: <description>"
git push origin main
```

Vercel auto-deploys from the `main` branch. Deployment is live within ~60 seconds.

### 7. Post-Deploy Verification

Visit https://s4ledger.com/demo-app and run through the manual verification steps above.

---

## Environment Variables (Vercel Dashboard)

The demo-app shares environment variables with the prod-app. Navigate to: **Vercel Dashboard → Project → Settings → Environment Variables**

| Variable | Required | Description |
|----------|:--------:|-------------|
| `XRPL_DEMO_SEED` | Optional | Demo wallet for test transactions |
| `XRPL_NETWORK` | Yes | `testnet` (demo always uses testnet) |
| `S4_API_MASTER_KEY` | Yes | Master API key for admin endpoints |
| `OPENAI_API_KEY` | Yes | OpenAI GPT-4o key for AI assistant |
| `ANTHROPIC_API_KEY` | Optional | Claude key (cascade fallback) |

Note: Demo-app does NOT require `SUPABASE_URL` / `SUPABASE_ANON_KEY` (no real backend auth).

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
| Minifier | **esbuild** | Fast minification, strips console/debugger |
| `sourcemap` | `false` | Security — no source maps in production |
| `esbuild.drop` | `['console', 'debugger']` | Strip debug output |
| `target` | `es2020` | Browser compatibility |
| Base path | `/demo-app/dist/` | Matches Vercel rewrite rules |

### Chunk Strategy

```
main.js (entry)
├── engine chunk    (engine.js)           ~505 KB — core logic + demo mode
├── enhancements    (enhancements.js)     ~224 KB — feature modules
├── navigation      (navigation + roles + onboarding) ~52 KB
└── metrics         (metrics + web-vitals) ~49 KB
```

---

## Vercel Routing (vercel.json)

```
/demo-app  → demo-app/dist/index.html
```

Same security headers as prod-app: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=()`.

---

## Troubleshooting

### Build fails with "Cannot find module"
```bash
cd demo-app && rm -rf node_modules && npm install
```

### Preview shows broken CSS/logos
Use `python3 preview_server.py 8080` from workspace root — NOT `npx vite preview`.

### Demo panel not visible
Check that `wallet-toggle.js` is imported in `main.js` and the demo banner HTML exists in `index.html`.

### Anchor button does nothing
Check that `enhancements.js` loaded successfully. The engine should be in `_demoMode` for mock API responses.

### Service Worker caching stale content
Bump the cache name in `sw.js` (e.g., `s4-v343` → `s4-v344`) and rebuild.

### Cross-chunk functions undefined at runtime
Check that `window.*` exports exist in the declaring module. Run the Playwright test to catch missing exports:
```bash
npx playwright test tests/e2e/demo-app-dedicated.spec.js --grep "exports"
```
