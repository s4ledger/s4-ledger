# S4 Ledger — Production Application

> **Version:** 5.12.0  
> **Last Verified:** March 4, 2026 (Commit 1ec3377)  
> **Status:** All features working — see [CONVERSATION_LOG.md](../CONVERSATION_LOG.md) for known correct state

---

## Quick Start

```bash
# Install dependencies
cd prod-app
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
prod-app/
├── src/
│   ├── index.html          # 3,942 lines — main SPA entry, all panels/modals/inline scripts
│   ├── main.js             # Vite entry point — imports all modules
│   ├── js/
│   │   ├── engine.js       # 8,873 lines — core ILS analysis engine, anchor/verify, 182 window exports
│   │   ├── enhancements.js # 7,331 lines — feature modules, competitive suite, 38 window exports
│   │   ├── navigation.js   # 709 lines — section/panel navigation, hub card drag reorder
│   │   ├── roles.js        # 735 lines — 6 role presets, role selector modal, Chart.js configs
│   │   ├── metrics.js      # 1,572 lines — Web Vitals, performance metrics
│   │   ├── onboarding.js   # 252 lines — 5-step onboarding wizard
│   │   ├── registry.js     # 438 lines — S4 module registry (11 modules)
│   │   ├── sanitize.js     # 45 lines — DOMPurify wrapper
│   │   ├── scroll.js       # 246 lines — smooth scroll utilities
│   │   ├── session-init.js # 12 lines — session initialization
│   │   ├── supabase-init.js# 5 lines — Supabase client init
│   │   └── web-vitals.js   # 111 lines — LCP, FID, CLS, INP, TTFB
│   └── styles/
│       └── main.css        # 1,369 lines — dark-first theme, light mode, responsive, print
├── public/
│   └── sw.js               # Service Worker (s4-prod-v709)
├── dist/                   # Production build output (generated)
├── vite.config.js          # 86 lines — Vite + terser build config
└── package.json
```

**Total source lines:** ~25,640

## Build System

| Setting | Value |
|---------|-------|
| Bundler | Vite 6.x |
| Minifier | **terser** (not esbuild — preserves `window.*` exports) |
| Target | ES2020 |
| Source Maps | Disabled (security) |
| Tree-shaking | Disabled (`treeshake: false` — required for cross-chunk `window.*` pattern) |
| Console/Debugger | Stripped in production |

### Chunk Strategy (5 chunks)

| Chunk | Contents | ~Size |
|-------|----------|-------|
| `engine` | engine.js | 503 KB |
| `enhancements` | enhancements.js | 237 KB |
| `navigation` | navigation.js + roles.js + onboarding.js | 51 KB |
| `metrics` | metrics.js + web-vitals.js | 49 KB |
| `core` (index) | main.js, sanitize.js, etc. | 43 KB |

## Cross-Module Communication

All cross-chunk function calls use `window.*` exports. This is **intentional** — Vite's code-splitting means each chunk has its own module scope. The `window.*` pattern is the only reliable way to share functions across chunks at runtime.

**Critical:** Do NOT refactor `window.*` exports to ES module imports unless you also restructure the chunk strategy.

```
engine.js  ──► window.anchorRecord, window.verifyRecord, window.sha256, etc. (182 exports)
enhancements.js ──► window.showTeamPanel, window.s4SBOMManager, etc. (38 exports)
navigation.js ──► window.showSection, window.openILSTool, etc. (9 exports)
roles.js ──► window.showRoleSelector, window.applyRole, etc. (9 exports)
```

## ILS Hub Tools (20)

| # | Panel ID | Tool Name |
|---|----------|-----------|
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

## Auth Flow

```
User arrives
  → Enter Platform button
    → DoD Consent Banner (dodConsentBanner, z-index 99999)
      → CAC/PIV Login OR Email/Password (cacLoginModal, z-index 99998)
        → 5-Step Onboarding Wizard (onboardOverlay)
          → Role Selector (roleModal, z-index 10000)
            → Workspace visible, AI agent shown
```

## Role System (6 presets)

| Role | Visible Tools |
|------|--------------|
| ILS Manager | All 20 |
| DMSMS Analyst | 7 (dmsms, risk, lifecycle, actions, vault, docs, reports) |
| Auditor / Compliance | 6 (compliance, vault, actions, docs, reports, submissions) |
| Contract Specialist | 8 (roi, vault, docs, reports, submissions, actions, cdrl, contract) |
| Supply Chain | 7 (readiness, risk, lifecycle, actions, vault, docs, submissions) |
| Full Access Admin | All 20 |

## Inline Scripts Architecture

The `index.html` contains 5 inline `<script>` blocks. These exist for **specific reasons** — do not remove without understanding the chain:

1. **Early theme restore** (line ~72) — Runs before module load to prevent FOUC (flash of unstyled content). Reads `localStorage('s4-theme')` and applies light mode immediately.

2. **Error monitoring** (line ~3242) — Global `window.onerror` + `unhandledrejection` capture. Stores up to 50 errors in `window._s4Errors`. Exposes `S4.errorMonitor` API.

3. **Failsafe navigation + universal delegated handler** (line ~3275) — Large IIFE with 4 subsections:
   - **Section 0: CSP Detection** — Tests if inline `onclick` works (`window.__s4InlineOK`)
   - **Section 1: Session Restore** — If `s4_entered === '1'` in sessionStorage, immediately shows workspace (skip auth)
   - **Section 2: Standalone Navigation** — Defines `showSection`, `showHub`, `openILSTool`, etc. as failsafes before modules load
   - **Section 4: Universal Delegated Handler** — `document.addEventListener('click')` parses `onclick` attributes when CSP blocks inline handlers (VS Code Simple Browser compatibility)

4. **Bootstrap bundle** (line ~3209) — External CDN

5. **Module entry** (line ~3239) — `<script type="module" src="/main.js">`

## Critical Rules

### NEVER add `addEventListener('click')` to elements with inline `onclick`

This caused the Session 15 + 16 double-fire bugs. Elements with `onclick="someFunction()"` already fire via:
1. The inline `onclick` attribute (when CSP allows it)
2. The universal delegated handler in Section 4 (when CSP blocks it)

Adding a third listener via `addEventListener` causes the function to fire **twice** per click, which for toggle functions means: hidden → visible → hidden (net effect = nothing happens).

### terser, not esbuild

The minifier MUST be `terser` with `dead_code: false` and `unused: false`. esbuild will tree-shake `window.*` exports because they look like side effects, breaking cross-chunk communication.

### DOMPurify `ADD_URI_SAFE_ATTR`

The sanitizer config includes `ADD_URI_SAFE_ATTR: ['onclick', 'onchange']`. This is required because DOMPurify strips event handler attributes by default, which would break dynamically-generated HTML that relies on inline handlers.

## Security Features

| Feature | Status |
|---------|--------|
| Content Security Policy (CSP) | Meta tag in HTML |
| DOMPurify sanitization | 77 innerHTML wraps via sanitize.js |
| ITAR Banner | Persistent CUI/ITAR warning strip |
| DoD Consent Banner | EULA-style consent gate |
| Session Lock | Auto-lock on inactivity (s4SessionLockOverlay) |
| HSTS / X-Frame-Options | Headers in vercel.json |
| No source maps in production | `sourcemap: false` |
| No console.log in production | `drop_console: true` in terser |

## Deployment

The prod-app is deployed via Vercel:

```bash
# Build
cd prod-app && npm run build

# The build output goes to prod-app/dist/
# Vercel serves / → prod-app/dist/index.html (via vercel.json rewrites)
```

### Environment Variables (Vercel Dashboard)

| Variable | Required | Purpose |
|----------|----------|---------|
| `XRPL_SEED` | Yes | XRPL wallet seed for anchoring |
| `S4_API_MASTER_KEY` | Yes | Master API key for admin access |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI assistant |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key (cascade fallback) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |

### Local Preview

```bash
# From workspace root (not prod-app/)
python3 preview_server.py 8080
# Opens http://localhost:8080 → serves prod-app/dist with Vercel-like rewrites
```

## Testing

```bash
# From workspace root

# Unit tests (Vitest)
npx vitest run

# E2E tests (Playwright) — requires preview server running
python3 preview_server.py 8080 &
npx playwright test tests/e2e/prod-app-smoke.spec.js

# Full E2E suite
npx playwright test
```

### Key Test Files

| File | Purpose |
|------|---------|
| `tests/e2e/prod-app-smoke.spec.js` | Comprehensive prod-app E2E smoke tests |
| `tests/e2e/smoke.spec.js` | Basic smoke tests for both apps |
| `tests/e2e/debug-anchor.spec.js` | Anchor flow deep trace |
| `tests/e2e/prod-fix-verify.spec.js` | Targeted fix verification (auth + tools) |
| `tests/prod-app.test.js` | Unit tests |

## PWA / Offline Support

- **Service Worker:** `public/sw.js` (cache name: `s4-prod-v709`)
- **Offline Queue:** Records queued in IndexedDB when offline, synced on reconnect
- **Manifest:** `manifest.json` for installable PWA

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Functions fire but nothing visible changes | Double-fire from duplicate addEventListener | Remove the duplicate listener — see "Critical Rules" above |
| `window.someFunction is not a function` | Module hasn't loaded yet, or export missing | Check that the function is in the correct chunk's window exports |
| Theme doesn't apply on load | Inline script blocked by CSP | The failsafe in Section 2 handles this; check CSP policy |
| Role selector doesn't appear | `showRoleSelector` not on window | Verify roles.js exports it: `window.showRoleSelector = showRoleSelector` |
| Charts don't render | Panel not visible when chart init runs | The MutationObserver in roles.js handles delayed rendering |
| Build strips necessary functions | Using esbuild instead of terser | Ensure `vite.config.js` uses `minify: 'terser'` with `dead_code: false` |
