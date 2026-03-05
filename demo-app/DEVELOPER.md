# S4 Ledger Demo-App — Developer Guide

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
cd demo-app
npm install

# 2. Start dev server (HMR, port 3001, auto-opens browser)
npm run dev

# 3. Production build
npm run build

# 4. Preview production build (from workspace root)
cd ..
python3 preview_server.py 8080
# Visit http://localhost:8080/demo-app/dist/index.html
```

---

## How Demo Differs from Prod

The demo-app shares ~95% identical architecture with prod-app. Key differences:

| Feature | Demo-App | Prod-App |
|---------|----------|----------|
| Minifier | **esbuild** | **terser** |
| Demo banner & panel | Yes — walkthrough, credit visualizer | Not present |
| Role selector | Not present | 6 role presets |
| Supabase auth | Not present | Real backend auth via `supabase-init.js` |
| ITAR banner | Not present | Persistent CUI/ITAR strip |
| Wallet toggle | Standalone `wallet-toggle.js` | Integrated into navigation |
| Dev port | 3001 | 3000 |
| Base path | `/demo-app/dist/` | `/prod-app/dist/` |
| Demo mode | `_demoMode` — mock API, suppressed errors | Real API calls |

---

## Source File Structure

```
demo-app/src/
├── index.html          # 3,293 lines — SPA entry, all panels/modals/inline scripts
├── main.js             # Vite entry — imports all modules in correct load order
├── js/
│   ├── sanitize.js     # DOMPurify wrapper (window.s4Sanitize)
│   ├── registry.js     # Module registry & health checks (S4.register)
│   ├── session-init.js # Session ID + timestamp bootstrap
│   ├── wallet-toggle.js# Demo-only wallet tab toggle (23 lines)
│   ├── engine.js       # Core platform — records, anchoring, ILS tools, auth (~8,880 lines)
│   ├── scroll.js       # Scroll progress, wallet balance, SLS purchase
│   ├── onboarding.js   # 5-step guided onboarding wizard
│   ├── metrics.js      # Charts, lifecycle calculator, offline queue
│   ├── navigation.js   # Hub navigation, drag-reorder
│   ├── roles.js        # RBAC role system
│   ├── enhancements.js # Tool managers, competitive features, boot sequence (~7,435 lines)
│   └── web-vitals.js   # LCP, FID, CLS, INP, TTFB observers
└── styles/
    └── main.css        # Dark-first theme, light mode, responsive, print (1,332 lines)
```

### Module Load Order (in main.js)

Order matters — later modules depend on `window.*` exports from earlier ones:

1. `sanitize.js` → `window.s4Sanitize`
2. `registry.js` → `S4.register`, `S4.modules`
3. `session-init.js` → Session ID
4. `wallet-toggle.js` → Demo wallet tab toggle *(demo-only)*
5. `engine.js` → **~285 window exports** (core ILS logic, anchoring, auth, demo mode)
6. `scroll.js` → Scroll effects, wallet
7. `onboarding.js` → Onboarding overlay
8. `metrics.js` → Charts, lifecycle, offline queue
9. `navigation.js` → Hub card grid, drag-reorder
10. `roles.js` → Role system, Chart.js configs
11. `enhancements.js` → Feature managers, boot sequence
12. `web-vitals.js` → Core Web Vitals

Note: Demo-app does NOT import `supabase-init.js` (no real backend auth).

---

## Architecture: Cross-Chunk Window Exports

Same pattern as prod-app. Vite splits the codebase into 4 chunks, and **all cross-chunk communication uses `window.*` exports**.

```
engine.js       → window.anchorRecord, window.verifyRecord, window.sha256, etc.
enhancements.js → window.showTeamPanel, window.s4SBOMManager, etc.
navigation.js   → window.showSection, window.openILSTool, etc.
roles.js        → window.showRoleSelector, window.applyRole, etc.
```

The HTML's inline `onclick` handlers call these window functions:

```html
<button onclick="anchorRecord()">Anchor</button>
```

### Why This Pattern Exists

ES module `import/export` only works within a single chunk. When Vite splits code across chunks, imported references break. The `window.*` pattern is the only reliable cross-chunk communication mechanism that also supports inline `onclick` handlers.

---

## Inline Scripts in index.html

Same structure as prod-app — 5 inline `<script>` blocks:

| # | Purpose | Why Inline? |
|---|---------|-------------|
| 1 | Theme restore | Prevents FOUC (runs before modules) |
| 2 | Error monitor | Captures errors before modules load |
| 3 | Failsafe nav + delegated handler | CSP compatibility, session restore |
| 4 | Bootstrap bundle | External CDN |
| 5 | Module entry | `<script type="module" src="/main.js">` |

See [prod-app DEVELOPER.md](../prod-app/DEVELOPER.md#inline-scripts-in-indexhtml) for detailed documentation of each script block.

---

## Demo-Specific Features

### Demo Banner & Panel

The demo-app includes a persistent banner and panel providing:
- Step indicators (1–4) for the demo walkthrough
- Demo session info display
- Demo wallet address/seed/explorer links
- Credit economic flow visualizer (4-step provisioning walkthrough)
- Plan selector for tier switching

### Demo Mode (`_demoMode`)

The engine runs in demo mode which:
- Uses mock API responses for anchor/verify operations
- Suppresses anchor/fee error notifications
- Provides pre-configured wallet state
- Allows full feature exploration without real XRPL transactions

### wallet-toggle.js

A 23-line standalone module that manages the demo panel's wallet tab visibility toggle. This file does NOT exist in the prod-app.

---

## Critical Rules

### 1. NEVER add addEventListener('click') to elements with inline onclick

Causes double-fire bugs. See [prod-app DEVELOPER.md — Critical Rule #1](../prod-app/DEVELOPER.md#critical-rules).

### 2. Minifier: esbuild (not terser)

Unlike prod-app, demo uses `esbuild` for faster builds. This works because demo-app's `treeshake` is not explicitly set (Rollup defaults apply), and the `window.*` exports survive esbuild's minification.

### 3. DOMPurify ADD_URI_SAFE_ATTR

Same as prod-app — `sanitize.js` must have `ADD_URI_SAFE_ATTR: ['onclick', 'onchange']`.

### 4. All innerHTML must use _s4Safe()

Every `.innerHTML` assignment must be wrapped via DOMPurify to prevent XSS.

### 5. Source maps disabled in production

`sourcemap: false` — security requirement.

---

## Build System

### Vite Configuration (vite.config.js)

| Setting | Value | Reason |
|---------|-------|--------|
| Bundler | Vite 6.x | Fast builds, ES module output |
| Minifier | **esbuild** | Fast, strips console/debugger |
| Target | ES2020 | Browser compatibility |
| Source maps | Disabled | Security |
| Console/debugger | Stripped | `esbuild.drop: ['console', 'debugger']` |
| Base path | `/demo-app/dist/` | Matches Vercel rewrite rules |
| Dev port | 3001 | Avoids conflict with prod-app on 3000 |

### Chunk Strategy (4 chunks)

| Chunk | Contents | ~Size |
|-------|----------|-------|
| `engine` | engine.js | 505 KB |
| `enhancements` | enhancements.js | 224 KB |
| `navigation` | navigation.js + roles.js + onboarding.js | 52 KB |
| `metrics` | metrics.js + web-vitals.js | 49 KB |

### Build Commands

```bash
# Development (HMR)
npm run dev

# Production build
npm run build

# Preview built output
npm run preview
```

---

## Auth Flow

```
Landing page
  → "Enter Platform" button
    → DoD Consent Banner
      → CAC/PIV Login
        → 5-Step Onboarding Wizard
          → Workspace visible, AI agent shown
```

Note: Demo-app does NOT have the role selector overlay — users go directly to workspace after onboarding.

---

## ILS Hub Tools (20)

Same 20 tools as prod-app: Gap Analysis, DMSMS Tracker, Readiness Calculator, Compliance Scorecard, Supply Chain Risk, Action Items, Predictive Maintenance, Lifecycle Cost Estimator, ROI Calculator, Audit Vault, Document Library, Report Generator, Submissions & PTD, SBOM Viewer, GFP Tracker, CDRL Validator, Contract Extractor, Provenance Chain, Cross-Program Analytics, Team Management.

See [prod-app DEVELOPER.md — ILS Hub Tools](../prod-app/DEVELOPER.md#ils-hub-tools-20) for panel IDs.

---

## Testing

### Unit Tests (Vitest)

```bash
# From workspace root
npx vitest run                       # All tests (1582+)
npx vitest run --coverage            # With coverage report
npx vitest run tests/demo-*.test.js  # Demo-specific tests only
```

### E2E Tests (Playwright)

```bash
# Start a preview server first
npx serve -l 9999 -s . &
# OR
python3 preview_server.py 8080 &

# Run demo-app E2E suites
npx playwright test tests/e2e/demo-app-dedicated.spec.js
npx playwright test tests/e2e/smoke.spec.js

# Run accessibility tests
npx playwright test tests/e2e/a11y.spec.js

# Run all E2E tests
npx playwright test
```

### Key Test Files

| File | Tests | Purpose |
|------|------:|---------|
| `tests/e2e/demo-app-dedicated.spec.js` | 10 | Demo features, anchor flow, theme, tiers, exports, logout |
| `tests/e2e/smoke.spec.js` | — | Basic smoke tests for both apps |
| `tests/e2e/a11y.spec.js` | 6 | axe-core accessibility scans |
| `tests/demo-app.test.js` | — | Unit tests |

### QA Documentation

| Document | Purpose |
|----------|---------|
| [TEST_REPORT.md](TEST_REPORT.md) | Comprehensive test results and pass/fail matrix |
| [QUALITY_AUDIT.md](QUALITY_AUDIT.md) | Code quality audit and recommendations |

---

## Service Worker

- **File:** `public/sw.js` (copied to root on build)
- **Cache name pattern:** `s4-vNNN` (bump on every release)
- Caches static assets for offline PWA functionality

### Bumping the Version

Edit `sw.js` and change the cache name:

```js
const CACHE = 's4-v344'; // ← increment this
```

Then rebuild: `npm run build`

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| CSP | Meta tag in index.html |
| DOMPurify | All innerHTML wraps via `_s4Safe()` |
| DoD Consent | Consent gate before workspace access |
| Session Lock | Auto-lock on inactivity |
| No source maps | `sourcemap: false` |
| No console.log | `esbuild.drop: ['console']` |

---

## Common Debugging Scenarios

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Button click does nothing (toggle) | Double-fire from duplicate `addEventListener` | Remove the extra listener |
| `window.someFunction is not a function` | Module hasn't loaded yet, or export missing | Check the function's module exports it to `window` |
| Theme doesn't apply on load | Inline script blocked by CSP | Check inline script #1 |
| Charts don't render | Panel not visible when chart init runs | MutationObserver handles delayed rendering |
| DOMPurify strips onclick | Missing `ADD_URI_SAFE_ATTR` | Verify `sanitize.js` includes `['onclick', 'onchange']` |
| Stale content after deploy | Service Worker cache | Bump cache version in `sw.js` and rebuild |
| Preview shows broken CSS | Wrong preview server | Use `python3 preview_server.py` from workspace root |
| Demo wallet not showing | `wallet-toggle.js` not loaded | Check `main.js` imports it |

---

## Related Documentation

- [README.md](README.md) — Project overview and quick reference
- [TEST_REPORT.md](TEST_REPORT.md) — Formal test results
- [QUALITY_AUDIT.md](QUALITY_AUDIT.md) — Code quality audit
- [../prod-app/DEVELOPER.md](../prod-app/DEVELOPER.md) — Prod-app developer guide
- [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) — Full architecture guide
- [../CONVERSATION_LOG.md](../CONVERSATION_LOG.md) — Session-by-session fix tracker
