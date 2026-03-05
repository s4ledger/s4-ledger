# S4 Ledger — Architecture Guide

> **Version:** 6.0 (Session 6)
> **Updated:** 2026-02-26
> **Maintainer:** Nick Frankfort

## Overview

S4 Ledger is a blockchain-anchored logistics record-keeping platform for
U.S. Department of Defense (DoD) supply-chain and Integrated Logistics
Support (ILS). It anchors SHA-256 hashes of records to the XRP Ledger,
providing immutable, auditable provenance for maintenance, supply-chain,
ordnance, custody-transfer, and predictive-maintenance events.

The monorepo contains two web applications (**prod-app** and **demo-app**)
that share identical JavaScript source with minor environment-specific
differences.

---

## Repository Layout

```
s4ledger/
├── prod-app/               # Production PWA
│   ├── src/
│   │   ├── js/
│   │   │   ├── engine.js        # Core platform (~8500 lines)
│   │   │   ├── enhancements.js  # Tool managers, boot, features (~7300 lines)
│   │   │   ├── metrics.js       # Charts, lifecycle, offline queue (~1600 lines)
│   │   │   ├── navigation.js    # Hub navigation, drag-reorder (~700 lines)
│   │   │   ├── onboarding.js    # Guided onboarding flow (~270 lines)
│   │   │   ├── roles.js         # RBAC role system (~550 lines)
│   │   │   ├── scroll.js        # Scroll effects, wallet, buy SLS (~250 lines)
│   │   │   ├── sanitize.js      # DOMPurify wrapper (~15 lines)
│   │   │   ├── registry.js      # Module registry & health (~240 lines)
│   │   │   ├── session-init.js  # Session bootstrap (~15 lines)
│   │   │   └── web-vitals.js    # Core Web Vitals reporting (~90 lines)
│   │   └── main.js              # Vite entry point
│   └── dist/                    # Production build output
├── demo-app/                # Demo/evaluation PWA (same JS + wallet-toggle.js)
│   └── src/js/
├── tests/                   # Vitest test suite (24 files, 1582 tests)
│   ├── setup.js             # Global stubs (jsdom, indexedDB, fetch, etc.)
│   ├── prod-*.test.js       # Prod-app test files
│   └── demo-*.test.js       # Demo-app test files
├── docs/                    # Documentation
├── api/                     # Serverless API (Vercel)
├── sdk/                     # Python SDK
├── supabase/                # Supabase edge functions & migrations
├── k8s/                     # Kubernetes manifests
├── monitoring/              # Prometheus + Grafana configs
├── vitest.config.js         # Test configuration
├── vite.config.js           # Build configuration (prod-app)
└── pyproject.toml           # Python SDK packaging
```

---

## JavaScript Module Architecture

### Module Load Order

Modules are loaded sequentially via ESM `<script type="module">` in the
HTML entry point. The canonical order is:

1. **sanitize.js** — DOMPurify wrapper (`window.s4Sanitize`)
2. **registry.js** — Module registry, health checks
3. **session-init.js** — Session ID + timestamp bootstrap
4. **engine.js** — Core platform: record types, anchoring, ILS tools, auth
5. **onboarding.js** — Guided tour overlay
6. **navigation.js** — Hub card grid, drag-reorder (IIFE), wallet sidebar
7. **roles.js** — Role-based access control (PM, Engineer, QA, etc.)
8. **metrics.js** — Chart renderers, lifecycle calculator, offline queue
9. **enhancements.js** — Tool managers, competitive features, boot sequence
10. **web-vitals.js** — CLS/FID/LCP/FCP/TTFB observers
11. **scroll.js** — Scroll progress, wallet balance, SLS purchase
12. **wallet-toggle.js** *(demo-app only)* — Demo panel visibility toggle

### `window.S4` Namespace

All shared utilities live on the `S4` global:

| Sub-module  | Purpose |
|-------------|---------|
| `S4.debounce(key, fn, delay)` | Named debounce (fire-and-forget, no return) |
| `S4.LRUCache(maxSize)` | In-memory cache (`.get`, `.set`, `.clear`, `.size`) |
| `S4.Blockchain` | XRP Ledger helpers |
| `S4.AI` | AI agent panel logic |
| `S4.Testing` | Canary + regression utilities |
| `S4.Integrity` | Module integrity validator |
| `S4.Sync` | Supabase state sync engine |

### Window Exports

engine.js exports **~151 functions** to `window.*` for use by inline
`onclick` handlers in the HTML. Key exports include:

| Function | Module | Purpose |
|----------|--------|---------|
| `anchorRecord()` | engine | Core SHA-256 anchoring to XRPL |
| `openILSTool(toolId)` | engine | Open an ILS hub tool panel |
| `switchHubTab(panelId, btn)` | engine | Switch between hub tab panels |
| `renderTypeGrid()` | engine | Render record-type selection grid |
| `runFullILSAnalysis()` | engine | Run comprehensive ILS gap analysis |
| `loadSBOMData(prog, sub)` | enhancements | Load SBOM inventory data |
| `toggleTheme()` | enhancements | Dark/light theme toggle |
| `renderReadinessCharts()` | metrics | Render readiness gauge + bar chart |
| `loadPerformanceMetrics()` | metrics | Fetch & display performance data |
| `changeCalMonth(delta)` | metrics | Calendar navigation |

---

## Data Flow

### Anchoring Flow

```
User Input → SHA-256 Hash → _anchorToXRPL(payload)
  → XRP Ledger Memo (testnet/mainnet)
  → Save to localStorage + IndexedDB
  → Update SLS balance ($SLS deducted)
  → Refresh charts & transaction log
```

### Offline-First Architecture

- **IndexedDB** stores records, vault items, SBOM data, and analytics
- **Offline Queue** captures failed anchors and replays on reconnect
- `window.addEventListener('online', offlineSyncAll)` triggers replay
- **Service Worker** (production only) caches static assets

### State Management

| Store | Backend | Purpose |
|-------|---------|---------|
| `localStorage` | Browser | Session, preferences, tier allocation, wallet |
| `IndexedDB` | Browser | Records, vault, SBOM, GFP, CDRL, analytics |
| `sessionStorage` | Browser | Transient UI state |
| `window._s4Stats` | Memory | Running session statistics |
| `Supabase` | Cloud | Cross-device sync, auth, realtime |

---

## Build & Deploy

### Build Pipeline

```bash
# Development
npm run dev          # Vite dev server (HMR)

# Production
npm run build        # Vite build → prod-app/dist/

# Testing
npx vitest run                    # All tests
npx vitest run --coverage         # With coverage report
npx vitest run tests/prod-*.js    # Prod tests only
```

### Deployment

- **Frontend:** Vercel (static deploy from `prod-app/dist/`)
- **API:** Vercel serverless functions (`api/index.py`)
- **CDN:** Vercel Edge Network
- **CSP:** `connect-src` restricted to 4 domains (XRPL, Supabase,
  Vercel analytics, self)

### Service Worker Versioning

| App | Current Version | Cache Key Pattern |
|-----|----------------|-------------------|
| prod-app | `s4-prod-v708` | `s4-prod-vNNN` |
| demo-app | `s4-v338` | `s4-vNNN` |

---

## Testing

- **Framework:** Vitest 2.1.9 + @vitest/coverage-v8
- **Environment:** jsdom v24
- **Coverage:** 61%+ statements (enforced via `vitest.config.js` thresholds)
- **Test files:** 24 files, 1582+ tests
- **Setup:** `tests/setup.js` provides global stubs for IndexedDB, fetch,
  `window.crypto`, Chart.js, IntersectionObserver, ResizeObserver, etc.

### Coverage Thresholds (enforced)

```
statements: 60%
branches:   50%
functions:  50%
lines:      60%
```

---

## Security

- **DOMPurify:** All `innerHTML` assignments wrapped via `s4Sanitize()`
- **CSP:** Strict Content-Security-Policy with 4 allowed connect-src domains
- **Classification:** Records tagged with CUI/SECRET/TS per DoD standards
- **RBAC:** Role-based visibility (PM, Engineer, QA, Auditor, Commander, Admin)
- **Audit Watermark:** `_s4AuditWatermark()` stamps exports with user/timestamp
- **Focus Trap:** WCAG 2.1 AA compliant modal focus management

---

## Key Technical Decisions

1. **Monolith-to-modules extraction** — Original 23K-line monolith split into
   11 focused modules with clear responsibilities.
2. **Window exports over ESM** — Inline `onclick` handlers in HTML require
   `window.*` globals; ESM import/export used only for build tooling.
3. **Dual-app monorepo** — prod-app and demo-app share identical JS source;
   demo-app adds `wallet-toggle.js` for evaluation panel toggling.
4. **IndexedDB + localStorage hybrid** — IndexedDB for structured data,
   localStorage for preferences and quick lookups.
5. **Fake-timer boot sequence** — enhancements.js master boot IIFE uses
   3s/5s `setTimeout` to ensure DOM is ready before chart/hook initialization.
