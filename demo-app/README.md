# S4 Ledger — Demo Application

> **Version:** 5.12.0  
> **Last Verified:** March 4, 2026 (Commit 1ec3377)  
> **Status:** All features working — see [CONVERSATION_LOG.md](../CONVERSATION_LOG.md) for known correct state

---

## Quick Start

```bash
# Install dependencies
cd demo-app
npm install

# Development server (port 3000, auto-opens browser)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Architecture

```
demo-app/
├── src/
│   ├── index.html          # 3,293 lines — main SPA entry, all panels/modals/inline scripts
│   ├── main.js             # Vite entry point — imports all modules
│   ├── js/
│   │   ├── engine.js       # 8,880 lines — core ILS analysis engine, anchor/verify
│   │   ├── enhancements.js # 7,435 lines — feature modules, competitive suite
│   │   ├── navigation.js   # 755 lines — section/panel navigation, hub card drag reorder
│   │   ├── roles.js        # 564 lines — role presets, Chart.js configs
│   │   ├── metrics.js      # 1,624 lines — Web Vitals, performance metrics
│   │   ├── onboarding.js   # 276 lines — 5-step onboarding wizard
│   │   ├── registry.js     # 247 lines — S4 module registry
│   │   ├── sanitize.js     # 45 lines — DOMPurify wrapper
│   │   ├── scroll.js       # 248 lines — smooth scroll utilities
│   │   ├── session-init.js # 10 lines — session initialization
│   │   ├── wallet-toggle.js# 23 lines — standalone wallet tab toggle
│   │   └── web-vitals.js   # 111 lines — LCP, FID, CLS, INP, TTFB
│   └── styles/
│       └── main.css        # 1,332 lines — dark-first theme, light mode, responsive, print
├── public/
│   └── sw.js               # Service Worker (s4-v339)
├── dist/                   # Production build output (generated)
├── vite.config.js          # Vite + esbuild build config
├── package.json
├── TEST_REPORT.md          # Formal QA test results
└── QUALITY_AUDIT.md        # Quality audit report
```

**Total source lines:** ~33,913

## How Demo Differs from Prod

The demo-app shares **~95% identical architecture** with the prod-app. Key differences:

| Feature | Demo-App | Prod-App |
|---------|----------|----------|
| Demo UX | `demoBanner`, `demoPanel`, credit flow visualizer | Not present |
| Role Selector | Not present | Full role selector overlay (6 presets) |
| Supabase Auth | Not present | Real backend auth via `supabase-init.js` |
| ITAR Banner | Not present | Persistent CUI/ITAR warning strip |
| Wallet Toggle | Standalone `wallet-toggle.js` (23 lines) | Integrated into navigation |
| Minifier | **esbuild** (faster, strips console/debugger) | **terser** (preserves `window.*` exports) |
| QA Docs | TEST_REPORT.md + QUALITY_AUDIT.md | — |
| Login Feedback | Basic | Enhanced (`loginAuthError`, `btnAccountLogin`) |
| Tool Stats | Basic | Richer per-tool stats (CDRL, GFP, Contract, Provenance) |

### What's Shared (identical in both apps)
- All 20 ILS hub tools
- AI floating agent with context-aware responses
- Auth flow (DoD consent → CAC/PIV → onboarding → workspace)
- PWA/offline support (Service Worker + IndexedDB + offline queue)
- DOMPurify sanitization (77 innerHTML wraps)
- CSP + security headers
- 5-chunk Vite build strategy
- Chart.js integration (8 chart configs)
- Keyboard shortcuts + command palette
- Hub card drag-and-drop reorder

## Build System

| Setting | Value |
|---------|-------|
| Bundler | Vite 6.x |
| Minifier | **esbuild** (drops console + debugger) |
| Target | ES2020 |
| Source Maps | Disabled |
| Base Path | `/demo-app/dist/` |

### Chunk Strategy (4 chunks)

| Chunk | Contents | ~Size |
|-------|----------|-------|
| `engine` | engine.js | 505 KB |
| `enhancements` | enhancements.js | 224 KB |
| `navigation` | navigation.js + roles.js + onboarding.js | 52 KB |
| `metrics` | metrics.js + web-vitals.js | 49 KB |

## Cross-Module Communication

Same `window.*` pattern as prod-app — all cross-chunk function calls use window exports. See [prod-app README](../prod-app/README.md#cross-module-communication) for details.

Total window exports: **~285** across all modules.

## ILS Hub Tools (20)

Same 20 tools as prod-app: Gap Analysis, DMSMS Tracker, Readiness Calculator, Compliance Scorecard, Supply Chain Risk, Action Items, Predictive Maintenance, Lifecycle Cost Estimator, ROI Calculator, Audit Vault, Document Library, Report Generator, Submissions & PTD, SBOM Viewer, GFP Tracker, CDRL Validator, Contract Extractor, Provenance Chain, Cross-Program Analytics, Team Management.

## Auth Flow

```
User arrives
  → Enter Platform button
    → DoD Consent Banner (dodConsentBanner)
      → CAC/PIV Login (cacLoginModal)
        → 5-Step Onboarding Wizard (onboardOverlay)
          → Workspace visible, AI agent shown
```

Note: Demo-app does NOT have the role selector overlay — users go directly to workspace after onboarding.

## Demo-Specific Features

### Demo Banner & Panel
The demo-app includes a persistent demo banner and demo panel providing:
- Step indicators (1–4) for the demo walkthrough
- Demo session info display
- Demo wallet address/seed/explorer links
- Credit economic flow visualizer (4-step provisioning walkthrough)
- Plan selector for tier switching

### Demo Mode
The engine runs in `_demoMode` which:
- Uses mock API responses for anchor/verify operations
- Suppresses anchor/fee error notifications
- Provides pre-configured wallet state

## Deployment

The demo-app is deployed via Vercel alongside the prod-app:

```bash
# Build
cd demo-app && npm run build

# Vercel serves /demo-app → demo-app/dist/index.html (via vercel.json rewrites)
```

### Local Preview

```bash
# From workspace root
python3 preview_server.py 8080
# Then visit http://localhost:8080/demo-app/dist/index.html
```

## Testing

```bash
# From workspace root

# Unit tests (Vitest)
npx vitest run

# E2E tests (Playwright)
npx playwright test tests/e2e/smoke.spec.js
npx playwright test tests/e2e/debug-anchor.spec.js

# View formal test results
cat demo-app/TEST_REPORT.md
cat demo-app/QUALITY_AUDIT.md
```

### QA Documentation

| Document | Lines | Contents |
|----------|------:|---------|
| [TEST_REPORT.md](TEST_REPORT.md) | 621 | Comprehensive test results, pass/fail matrix |
| [QUALITY_AUDIT.md](QUALITY_AUDIT.md) | 252 | Code quality audit, recommendations |

## Security

Same security posture as prod-app:
- Content Security Policy (CSP) meta tag
- DOMPurify sanitization
- DoD Consent Banner
- Session lock on inactivity
- No source maps in production
- Console/debugger stripped in production

## Critical Rules

**Same rules as prod-app apply:**

1. **NEVER** add `addEventListener('click')` to elements with inline `onclick` — causes double-fire
2. **DO NOT** refactor `window.*` exports to ES module imports without restructuring chunks
3. DOMPurify must have `ADD_URI_SAFE_ATTR: ['onclick', 'onchange']`

See [prod-app README — Critical Rules](../prod-app/README.md#critical-rules) for full details.

## Troubleshooting

See [prod-app README — Troubleshooting](../prod-app/README.md#troubleshooting) — same patterns apply.
