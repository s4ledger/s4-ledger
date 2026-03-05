# S4 Ledger Prod-App — Developer Guide

**Version:** 5.12.0  
**Last Updated:** March 5, 2026

---

## Local Development Setup

### Prerequisites

- **Node.js** >= 18.x (LTS recommended)
- **npm** >= 9.x
- **Python 3** (for preview server)
- **Playwright** (for E2E tests — `npx playwright install`)

### Getting Started

```bash
# 1. Clone the repo and install
cd prod-app
npm install

# 2. Start dev server (HMR, port 3000, auto-opens browser)
npm run dev

# 3. Production build
npm run build

# 4. Preview production build (from workspace root)
cd ..
python3 preview_server.py 8080
# Visit http://localhost:8080
```

---

## Source File Structure

```
prod-app/src/
├── index.html          # 3,942 lines — SPA entry, all panels/modals/inline scripts
├── main.js             # Vite entry — imports all modules in correct load order
├── js/
│   ├── sanitize.js     # DOMPurify wrapper (window.s4Sanitize)
│   ├── supabase-init.js# Supabase client initialization
│   ├── registry.js     # Module registry & health checks (S4.register)
│   ├── session-init.js # Session ID + timestamp bootstrap
│   ├── engine.js       # Core platform — records, anchoring, ILS tools, auth (~8,873 lines)
│   ├── scroll.js       # Scroll progress, wallet balance, SLS purchase
│   ├── onboarding.js   # 5-step guided onboarding wizard
│   ├── metrics.js      # Charts, lifecycle calculator, offline queue
│   ├── navigation.js   # Hub navigation, drag-reorder
│   ├── roles.js        # RBAC role system (6 presets)
│   ├── enhancements.js # Tool managers, competitive features, boot sequence (~7,331 lines)
│   └── web-vitals.js   # LCP, FID, CLS, INP, TTFB observers
└── styles/
    └── main.css        # Dark-first theme, light mode, responsive, print (1,369 lines)
```

### Module Load Order (in main.js)

Modules are imported sequentially. Order matters because later modules depend on `window.*` exports from earlier ones:

1. `sanitize.js` → `window.s4Sanitize`
2. `supabase-init.js` → Supabase client
3. `registry.js` → `S4.register`, `S4.modules`
4. `session-init.js` → Session ID
5. `engine.js` → **182 window exports** (core ILS logic, anchoring, auth)
6. `scroll.js` → Scroll effects, wallet
7. `onboarding.js` → Onboarding overlay
8. `metrics.js` → Charts, lifecycle, offline queue
9. `navigation.js` → Hub card grid, drag-reorder
10. `roles.js` → Role selector, Chart.js configs
11. `enhancements.js` → **38 window exports** (features, boot IIFE)
12. `web-vitals.js` → Core Web Vitals

---

## Architecture: Cross-Chunk Window Exports

This is the most important architectural concept to understand. Vite splits the codebase into 5 chunks. Because each chunk has its own module scope, **all cross-chunk communication uses `window.*` exports**.

```
engine.js       → window.anchorRecord, window.verifyRecord, window.sha256, etc. (182 exports)
enhancements.js → window.showTeamPanel, window.s4SBOMManager, etc. (38 exports)
navigation.js   → window.showSection, window.openILSTool, etc. (9 exports)
roles.js        → window.showRoleSelector, window.applyRole, etc. (9 exports)
```

The HTML's inline `onclick` handlers call these window functions directly:

```html
<button onclick="anchorRecord()">Anchor</button>
<!-- This calls window.anchorRecord() at runtime -->
```

### Why This Pattern Exists

ES module `import/export` only works within a single chunk. When Vite splits code across chunks, imported references break. The `window.*` pattern is the only reliable cross-chunk communication mechanism that also supports inline `onclick` handlers.

---

## Inline Scripts in index.html

The HTML contains 5 inline `<script>` blocks. Each exists for a specific reason — do not remove them.

| # | Purpose | Location | Why Inline? |
|---|---------|----------|-------------|
| 1 | Theme restore | ~line 72 | Must run before module load to prevent FOUC |
| 2 | Error monitor | ~line 3242 | Captures errors before any module loads |
| 3 | Failsafe nav + delegated handler | ~line 3275 | CSP compatibility, session restore, standalone nav |
| 4 | Bootstrap bundle | ~line 3209 | External CDN |
| 5 | Module entry | ~line 3239 | `<script type="module" src="/main.js">` |

Script #3 is the largest — it contains:
- **CSP Detection:** Tests if inline `onclick` works (`window.__s4InlineOK`)
- **Session Restore:** If `s4_entered === '1'`, skips auth flow
- **Standalone Navigation:** Failsafe `showSection`, `showHub`, `openILSTool` before modules load
- **Universal Delegated Handler:** Parses `onclick` attributes when CSP blocks inline handlers

---

## Critical Rules

### 1. NEVER add addEventListener('click') to elements with inline onclick

This caused the Session 15 + 16 double-fire bugs. Elements with `onclick="fn()"` already fire via:
- The inline handler (when CSP allows), OR
- The universal delegated handler in inline script #3 (when CSP blocks it)

Adding `addEventListener('click')` causes functions to fire **twice**, which for toggle functions means nothing visually changes (hidden → visible → hidden).

### 2. Minifier MUST be terser, not esbuild

`vite.config.js` uses `minify: 'terser'` with `dead_code: false` and `unused: false`. esbuild's tree-shaking removes `window.*` exports because they look like side effects, breaking all cross-chunk communication.

### 3. treeshake must be false

`rollupOptions.treeshake: false` is required. All functions are called via `window.*` and `onclick` handlers, which Rollup can't statically analyze.

### 4. DOMPurify ADD_URI_SAFE_ATTR

`sanitize.js` configures DOMPurify with `ADD_URI_SAFE_ATTR: ['onclick', 'onchange']`. Without this, DOMPurify strips event handler attributes from dynamically-generated HTML, breaking inline handlers.

### 5. Source maps disabled in production

`sourcemap: false` — security requirement for DoD applications.

### 6. All innerHTML must use _s4Safe()

Every `.innerHTML` assignment must be wrapped: `el.innerHTML = _s4Safe(htmlString)`. This passes through DOMPurify to prevent XSS.

---

## Build System

### Vite Configuration (vite.config.js)

| Setting | Value | Reason |
|---------|-------|--------|
| Bundler | Vite 6.x | Fast builds, ES module output |
| Minifier | **terser** | Preserves `window.*` exports |
| Target | ES2020 | DoD uses Edge/Chrome on Flankspeed |
| Source maps | Disabled | Security |
| Tree-shaking | Disabled | Required for `window.*` pattern |
| Console/debugger | Stripped | `drop_console: true`, `drop_debugger: true` |
| Base path | `/prod-app/dist/` | Matches Vercel rewrite rules |
| Dev port | 3000 | Auto-opens browser |

### Chunk Strategy (5 chunks)

| Chunk | Contents | ~Size |
|-------|----------|-------|
| `engine` | engine.js | 503 KB |
| `enhancements` | enhancements.js | 237 KB |
| `navigation` | navigation.js + roles.js + onboarding.js | 51 KB |
| `metrics` | metrics.js + web-vitals.js | 49 KB |
| `core` (index) | main.js, sanitize.js, supabase-init.js, etc. | 43 KB |

### Build Commands

```bash
# Development (HMR)
npm run dev

# Production build
npm run build
# Equivalent to: npx vite build

# Preview built output
npm run preview
```

---

## Auth Flow

```
Landing page
  → "Enter Platform" button
    → DoD Consent Banner (z-index 99999)
      → CAC/PIV Login OR Email/Password (z-index 99998)
        → 5-Step Onboarding Wizard
          → Role Selector (z-index 10000)
            → Workspace visible, AI agent shown
```

### Session Persistence

When a user completes auth, `sessionStorage.setItem('s4_entered', '1')` is set. On page reload, inline script #3 detects this and skips the auth flow, going straight to the workspace.

---

## Role System (6 presets)

| Role | Visible Tools |
|------|--------------|
| ILS Manager | All 20 |
| DMSMS Analyst | 7 |
| Auditor / Compliance | 6 |
| Contract Specialist | 8 |
| Supply Chain | 7 |
| Full Access Admin | All 20 |

Roles control which ILS hub tool cards are visible. The role selector modal is in `roles.js`.

---

## ILS Hub Tools (20)

| # | Panel ID | Tool |
|---|----------|------|
| 1 | `hub-analysis` | Gap Analysis |
| 2 | `hub-dmsms` | DMSMS Tracker |
| 3 | `hub-readiness` | Readiness Calculator |
| 4 | `hub-compliance` | Compliance Scorecard |
| 5 | `hub-risk` | Supply Chain Risk |
| 6 | `hub-actions` | Action Items |
| 7 | `hub-predictive` | Predictive Maintenance |
| 8 | `hub-lifecycle` | Lifecycle Cost Estimator |
| 9 | `hub-roi` | ROI Calculator |
| 10 | `hub-vault` | Audit Vault |
| 11 | `hub-docs` | Document Library |
| 12 | `hub-reports` | Report Generator |
| 13 | `hub-submissions` | Submissions & PTD |
| 14 | `hub-sbom` | SBOM Viewer |
| 15 | `hub-gfp` | GFP Tracker |
| 16 | `hub-cdrl` | CDRL Validator |
| 17 | `hub-contract` | Contract Extractor |
| 18 | `hub-provenance` | Provenance Chain |
| 19 | `hub-analytics` | Cross-Program Analytics |
| 20 | `hub-team` | Team Management |

---

## Testing

### Unit Tests (Vitest)

```bash
# From workspace root
npx vitest run                       # All tests (1582+)
npx vitest run --coverage            # With coverage report
npx vitest run tests/prod-*.test.js  # Prod-specific tests only
```

Coverage thresholds enforced: **60% statements, 50% branches, 50% functions, 60% lines**.

### E2E Tests (Playwright)

```bash
# Start a preview server first
npx serve -l 9999 -s . &
# OR
python3 preview_server.py 8080 &

# Run prod-app E2E suite
npx playwright test tests/e2e/prod-app-smoke.spec.js
npx playwright test tests/e2e/prod-anchor-flow.spec.js

# Run all E2E tests
npx playwright test

# Run accessibility tests
npx playwright test tests/e2e/a11y.spec.js
```

### Key Test Files

| File | Tests | Purpose |
|------|------:|---------|
| `tests/e2e/prod-app-smoke.spec.js` | 22 | Comprehensive smoke tests (auth, tools, AI, nav, theme, security) |
| `tests/e2e/prod-anchor-flow.spec.js` | 5 | Anchor lifecycle (credits, vault, verify, multi-anchor) |
| `tests/e2e/a11y.spec.js` | 6 | axe-core accessibility scans |
| `tests/e2e/smoke.spec.js` | — | Basic smoke tests for both apps |
| `tests/prod-app.test.js` | — | Unit tests |

---

## Service Worker

- **File:** `public/sw.js`
- **Cache name pattern:** `s4-prod-vNNN` (bump on every release)
- Caches static assets for offline PWA functionality
- Records queued to IndexedDB when offline, synced on reconnect

### Bumping the Version

Edit `public/sw.js` and change the cache name:

```js
const CACHE = 's4-prod-v714'; // ← increment this
```

Then rebuild: `npm run build`

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| CSP | Meta tag in index.html — `connect-src` restricted to 4 domains |
| DOMPurify | 77 innerHTML wraps via `_s4Safe()` in sanitize.js |
| ITAR Banner | Persistent CUI/ITAR warning strip |
| DoD Consent | EULA-style consent gate before workspace access |
| Session Lock | Auto-lock on inactivity (`s4SessionLockOverlay`) |
| HSTS / X-Frame-Options | Headers in vercel.json |
| No source maps | `sourcemap: false` in vite.config.js |
| No console.log | `drop_console: true` in terser config |
| Audit Watermark | `_s4AuditWatermark()` stamps exports with user/timestamp |

---

## Common Debugging Scenarios

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Button click does nothing (toggle) | Double-fire from duplicate `addEventListener` | Remove the extra listener — see Critical Rule #1 |
| `window.someFunction is not a function` | Module hasn't loaded yet, or export missing | Check the function's module exports it to `window` |
| Theme doesn't apply on load | Inline script blocked by CSP | Check inline script #1 and CSP meta tag |
| Role selector doesn't appear | `showRoleSelector` not exported | Verify `roles.js` has `window.showRoleSelector = showRoleSelector` |
| Charts don't render | Panel not visible when chart init runs | MutationObserver in `roles.js` handles delayed rendering |
| Build strips functions | Using esbuild instead of terser | Change `vite.config.js` to `minify: 'terser'` |
| DOMPurify strips onclick | Missing `ADD_URI_SAFE_ATTR` | Verify `sanitize.js` includes `['onclick', 'onchange']` |
| Stale content after deploy | Service Worker cache | Bump cache version in `public/sw.js` and rebuild |
| Preview shows broken CSS | Wrong preview server | Use `python3 preview_server.py` from workspace root |

---

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `XRPL_WALLET_SEED` | Yes | XRPL wallet seed for anchoring |
| `XRPL_TREASURY_SEED` | Yes | Treasury wallet seed for fee collection |
| `XRPL_NETWORK` | Yes | `mainnet` or `testnet` |
| `S4_API_MASTER_KEY` | Yes | Master API key for admin endpoints |
| `OPENAI_API_KEY` | Yes | OpenAI GPT-4o key for AI assistant |
| `ANTHROPIC_API_KEY` | Optional | Claude key (cascade fallback) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `STRIPE_SECRET_KEY` | Optional | Stripe key for billing |

---

## Related Documentation

- [README.md](README.md) — Project overview and quick reference
- [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) — Step-by-step deployment guide
- [TEST_REPORT.md](TEST_REPORT.md) — Formal test results and QA verification
- [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) — Full architecture guide
- [../CONVERSATION_LOG.md](../CONVERSATION_LOG.md) — Session-by-session fix tracker
