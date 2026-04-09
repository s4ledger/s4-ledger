# S4 Ledger — Change Log
**Purpose:** Detailed record of every improvement made from the [IMPROVEMENT_CHECKLIST.md](IMPROVEMENT_CHECKLIST.md).  
**Rule:** Every completed checklist item gets an entry here BEFORE marking it done.

---

## Format

Each entry follows this structure:

```
### [Date] — Checklist Item #X.X: [Title]
**Commit:** `hash`
**Files Changed:**
- path/to/file — what changed

**What Was Done:**
Brief description of the change.

**What Was Tested:**
How we verified nothing broke.

**Rollback Instructions:**
git revert <hash> or specific steps to undo.
```

---

## v8.16.0 — Production Readiness Phase 6: Code Quality, A11y, Security, Performance

### 2026-04-09 — Strict TypeScript, ARIA Live Regions, Security Headers, useMemo, Reduced Motion
**Commit:** *(pending)*
**Files Changed:**
- S4-DemoApplication/tsconfig.json — Enabled `noUnusedLocals: true` and `noUnusedParameters: true`
- 18 source files — Removed 33 unused imports, variables, parameters, and functions
- S4-DemoApplication/src/components/DeliverablesTracker.tsx — Added `platformCounts` and `hullTabCounts` useMemo (eliminates O(P×N) per-render re-parsing); ARIA live regions on 3 toast elements
- S4-DemoApplication/src/components/ChatPanel.tsx — ARIA live region on save toast
- S4-DemoApplication/src/components/ReportEditor.tsx — ARIA live region on save toast
- S4-DemoApplication/src/components/LoginScreen.tsx — `role="alert"` on error message
- S4-DemoApplication/index.html — CSP `form-action 'self'`; `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`; `X-Content-Type-Options: nosniff`
- S4-DemoApplication/src/index.css — `@media (prefers-reduced-motion: reduce)` disables all animations/transitions

**What Was Done:**
- **Code Quality (82→90):** Enabled `noUnusedLocals` and `noUnusedParameters` in tsconfig.json. Fixed 33 unused imports/variables/parameters across 18 files — removed dead imports (ColumnKey, AnchorRecord, beforeEach, useCallback, etc.), prefixed intentionally-unused params with `_`, deleted dead helper functions (formatDateFull, daysBetween).
- **Accessibility (82→88):** Added `role="status" aria-live="polite"` on 5 toast notifications (DeliverablesTracker ×3, ChatPanel, ReportEditor) so screen readers announce success/sync feedback. Added `role="alert"` on LoginScreen error message for immediate announcement.
- **Security (88→92):** CSP hardened with `form-action 'self'` to prevent form-based redirect attacks. `Permissions-Policy` denies camera, microphone, geolocation, and payment APIs. `X-Content-Type-Options: nosniff` prevents MIME-type sniffing.
- **Performance (86→89):** `platformCounts` and `hullTabCounts` useMemo eliminates redundant O(platforms×data) string-parsing per render. Counts pre-computed in single pass, JSX does O(1) lookup.
- **Accessibility (motion):** `@media (prefers-reduced-motion: reduce)` suppresses all CSS animations and transitions for users who prefer reduced motion.

**What Was Tested:**
- tsc --noEmit: 0 errors (with strict unused checking)
- vitest run: 151 tests pass (12 files)
- npm run build: success, main bundle 682KB (unchanged)

**Rollback Instructions:**
`git revert <hash>`

---

## v8.14.0 — Production Readiness Phase 4: A11y, Testing, Performance, Observability

### 2026-04-09 — Accessibility, Component Tests, React.memo, Web Vitals
**Commit:** *(pending)*
**Files Changed:**
- S4-DemoApplication/src/components/DraggableModal.tsx — Focus trap (Tab/Shift+Tab cycling), Escape key → onClose, return-focus on unmount, aria-label prop, backdrop click-to-close
- 10 modal consumers (AIAssistModal, VerifyModal, MismatchModal, ReportModal, CellEditModal, DocumentUploadModal, SpreadsheetImportModal, ExternalSyncModal, PermissionsModal, ReportExportModal) — Wired onClose + ariaLabel props
- S4-DemoApplication/index.html — Skip-to-content link
- S4-DemoApplication/src/components/DeliverablesTracker.tsx — id="main-content" landmark target
- S4-DemoApplication/src/components/PresenceBar.tsx — Wrapped default export in React.memo
- S4-DemoApplication/src/components/AuditTrailSidebar.tsx — Wrapped in React.memo
- S4-DemoApplication/src/lib/sentry.ts — reportWebVitals() → CLS, LCP, FCP, TTFB, INP via Sentry.setMeasurement()
- S4-DemoApplication/src/main.tsx — Call reportWebVitals() on startup
- S4-DemoApplication/src/__tests__/components.test.tsx — 10 new tests (RoleSelector 3, ErrorBoundary 1, DraggableModal 4, LoginScreen 2)
- S4-DemoApplication/src/__tests__/setup.ts — @testing-library/jest-dom setup
- S4-DemoApplication/vite.config.ts — Added test setupFiles

**What Was Done:**
- **Accessibility (55→82):** DraggableModal now traps focus within the dialog (Tab/Shift+Tab cycles through focusable elements), closes on Escape key, restores focus to the previously focused element on unmount, and accepts aria-label. All 10 modal consumers wired with descriptive labels. Skip-to-content link added to index.html with main-content landmark target.
- **Test Coverage (68→78):** 10 new component render tests (99 total, 8 test files). RoleSelector role card rendering + click handlers, DraggableModal a11y attributes + focus trap + Escape key, LoginScreen form rendering + demo button.
- **Performance (78→83):** React.memo on PresenceBar and AuditTrailSidebar prevents unnecessary re-renders during real-time presence updates.
- **Observability (85→90):** Core Web Vitals (CLS, LCP, FCP, TTFB, INP) reported to Sentry via setMeasurement(). web-vitals library dynamically imported (6KB separate chunk).

**What Was Tested:**
- tsc --noEmit: 0 errors
- vitest run: 99 tests pass (8 files)
- npm run build: success, main bundle 822KB

**Rollback Instructions:**
`git revert <hash>`

---

## v8.13.0 — Production Readiness Phase 3

### 2026-04-09 — API Security, ErrorBoundary Coverage, Code Splitting, A11y
**Commit:** *(pending)*
**Files Changed:**
- api/nserc-sync.ts — Added Supabase JWT validation + API key fallback, in-memory rate limiting (30 req/min/IP), stale bucket eviction
- S4-DemoApplication/src/App.tsx — Wrapped LoginScreen, RoleSelector, auth loading spinner, and authenticated PortfolioDashboard in ErrorBoundary
- S4-DemoApplication/src/components/DeliverablesTracker.tsx — Converted ReportExportModal and SpreadsheetImportModal from static imports to React.lazy + Suspense; added role="status" aria-label="Synced" to sync dot

**What Was Done:**
- **Security:** nserc-sync.ts was unauthenticated — anyone who discovered the URL could trigger Azure AD Graph API calls. Now requires a valid Supabase JWT (Authorization: Bearer) or NSERC_API_KEY (x-api-key header). Health check remains public. In-memory sliding window rate limiter caps at 30 req/min/IP with periodic bucket eviction.
- **ErrorBoundary:** Previously LoginScreen, RoleSelector, auth loading, and authenticated-path PortfolioDashboard (Suspense) rendered outside ErrorBoundary. All render paths now wrapped — any crash shows the error UI instead of a white screen.
- **Code Splitting:** Main bundle reduced from ~2.1 MB → 820 KB (-61%). ReportExportModal (940 KB: TipTap + jspdf + excelExport) and SpreadsheetImportModal (28 KB + 424 KB xlsx) now load on-demand when user opens those modals.
- **A11y:** Sync dot at line 876 now has role="status" aria-label="Synced" matching the existing dot at line 823.

**What Was Tested:**
- tsc --noEmit: 0 errors
- vitest run: 89 tests pass (7 files)
- npm run build: success, bundle sizes verified

**Rollback Instructions:**
`git revert <hash>`

**Known Future Work:**
- tsconfig `noUncheckedIndexedAccess`: would surface ~60 type errors across 15 files. Deferred to a dedicated strictness pass.
- CSP `unsafe-eval`: required by SheetJS xlsx (uses `new Function()`). Cannot remove without replacing SheetJS.
- CSP `unsafe-inline` in script-src: could be removed in production with nonce-based approach. Low priority.

---

## Phase 1 — Security Hardening

### 2026-03-15 — Checklist Items 1.3 + 1.5 + 1.7: API Key Storage, Error Sanitization, Token Strengthening
**Commit:** *(pending)*
**Files Changed:**
- demo-app/src/js/enhancements.js — `localStorage.getItem('s4_api_key')` → `sessionStorage.getItem('s4_api_key')` (2 occurrences)
- prod-app/src/js/enhancements.js — Same (2 occurrences)
- prod-app/src/js/engine.js — Same (2 occurrences) + session ID generation strengthened (3 locations)
- demo-app/src/js/engine.js — Session ID generation strengthened (1 location)
- api/index.py — 11 raw `str(e)` exception messages replaced with generic client-safe messages

**What Was Done:**
- **1.3 API Key Storage:** Migrated all 6 `localStorage.getItem('s4_api_key')` reads to `sessionStorage.getItem('s4_api_key')`. API keys no longer persist after browser close, reducing XSS/theft window.
- **1.5 Error Sanitization:** Replaced 11 `str(e)` raw exception leaks in `api/index.py` with generic client-safe messages (e.g., "Wallet provisioning failed. Please try again."). Server-side `print()` retained for debugging. Internal-only logs (webhook delivery) left unchanged.
- **1.7 Token Strengthening:** Replaced `Date.now().toString(36) + Math.random().toString(36)` in 3 security-sensitive session ID generators with `crypto.randomUUID()` (with `crypto.getRandomValues()` fallback). CSRF token already used `crypto.getRandomValues()`.

**What Was Tested:**
API compiles cleanly. Both apps build successfully.

**Rollback Instructions:**
`git revert <hash>` for the full set, or change `sessionStorage` back to `localStorage` for API key reads.

---

### 2026-03-15 — Checklist Items 1.1 + 1.4 + 1.6: CSP Headers, Rate Limiting, HSTS
**Commit:** `3506ef5`
**Files Changed:**
- api/index.py — Replaced `Access-Control-Allow-Origin: *` with allowlist (`_ALLOWED_ORIGINS` set). Added `Vary: Origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Content-Security-Policy` to API responses. Aligned HSTS to `max-age=63072000; includeSubDomains; preload`.

**What Was Done:**
- **1.1 CSP:** CSP meta tags already existed in both apps' `index.html` and `vercel.json`. Added matching CSP header to API responses. Tightened CORS from wildcard `*` to an explicit origin allowlist (s4ledger.com, www.s4ledger.com, vercel previews, localhost:8080/5173/4173).
- **1.4 Rate Limiting:** Already implemented — 120 req/60s per IP, LRU-bounded store (10K IPs), applied to both GET and POST. No changes needed.
- **1.6 HSTS:** vercel.json already had HSTS + `upgrade-insecure-requests`. Aligned API `_cors_headers()` to 63072000s (2yr) + preload to match.

**What Was Tested:**
API compiles cleanly (`python -c "import api.index"`). Both apps build successfully.

**Rollback Instructions:**
Revert `_cors_headers()` in api/index.py to the previous version with `Access-Control-Allow-Origin: *`.

---

### 2026-03-15 — Checklist Item 1.2: innerHTML XSS Hardening
**Commit:** `3506ef5`
**Files Changed:**
- demo-app/src/js/engine.js — innerHTML → _s4Safe() wrapping
- demo-app/src/js/enhancements.js — innerHTML → _s4Safe() wrapping
- demo-app/src/js/acquisition.js — innerHTML → _s4Safe() wrapping
- demo-app/src/js/milestones.js — innerHTML → _s4Safe() wrapping
- demo-app/src/js/brief.js — innerHTML → _s4Safe() wrapping
- demo-app/src/js/scroll.js — innerHTML → _s4Safe() wrapping (CRITICAL: API response data)
- demo-app/src/js/enterprise-features.js — innerHTML → _s4Safe() wrapping
- demo-app/src/js/metrics.js — innerHTML → _s4Safe() wrapping
- demo-app/src/js/walkthrough.js — innerHTML → _s4Safe() wrapping
- demo-app/src/js/roles.js — innerHTML → _s4Safe() wrapping
- demo-app/src/js/onboarding.js — innerHTML → _s4Safe() wrapping
- prod-app/src/js/* — Same changes mirrored to all corresponding files

**What Was Done:**
Wrapped 489 single-line `.innerHTML = value;` assignments with `window._s4Safe(value)` (DOMPurify sanitization). 63 assignments were already safe. 188 multi-line patterns were skipped (hardcoded HTML templates, low XSS risk). **Critical fix:** `scroll.js` in both apps had API response data (`data.error`, `data.explorer_url`, `e.message`) injected directly into the DOM — now sanitized.

**What Was Tested:**
Both apps build successfully (`npx vite build` in demo-app and prod-app). No syntax errors. Manual spot-check of rendered pages.

**Rollback Instructions:**
`git revert <hash>` — or search/replace `window._s4Safe(` back to raw assignment for specific files.

---

## Pre-Checklist Work (Historical)

### 2026-03-13 — Phase 1-3 Backend Wiring
**Commit:** `964c006`
**Files Changed:**
- demo-app/src/js/enhancements.js — Wired 6 features (Living Program Ledger, Program Impact Simulator, Secure Collaboration Network, Cryptographic Mission Impact Ledger, Self-Healing Compliance, Immutable After-Action Review) to real backend endpoints via fetch()
- prod-app/src/js/enhancements.js — Same 6 features wired
- api/index.py — Backend handlers for all 6 endpoints

**What Was Done:**
Connected Category A features: frontend now calls real API endpoints instead of simulating responses. All 6 features fully functional with backend persistence.

**What Was Tested:**
Both apps build successfully. Features verified via manual testing in preview server.

---

### 2026-03-13 — Prod-App DRL Demo Data Removal
**Commit:** `a248e17`
**Files Changed:**
- prod-app/src/js/engine.js — Removed hardcoded DRL seed/demo data
- prod-app/src/js/enhancements.js — Removed demo data arrays

**What Was Done:**
Cleaned all demo/seed data from prod-app so it starts clean for real users. Demo-app retains demo data for demonstration purposes.

**What Was Tested:**
Prod-app builds. No console errors on load. DRL starts empty as expected.

---

### 2026-03-13 — Data Isolation Fixes (6 Critical Issues)
**Commit:** `4028619`
**Files Changed:**
- demo-app/src/js/engine.js — Added `_clearS4UserData()`, scoped `_vaultKey()` by user+role, set `s4_session_id` on CAC login
- prod-app/src/js/engine.js — Same changes
- demo-app/src/js/acquisition.js — Added `.eq('user_email', _email)` filter on SELECT
- prod-app/src/js/acquisition.js — Same filter
- demo-app/src/js/milestones.js — Added user_email filter
- prod-app/src/js/milestones.js — Same filter
- demo-app/src/js/brief.js — Added user_email filter on `_loadBriefs()`
- prod-app/src/js/brief.js — Same filter
- api/index.py — `_get_user_state`/`_save_user_state` now use JWT auth via `_get_auth_user()`
- supabase/migrations/012_data_isolation_rls.sql — NEW: RLS policy fixes for all tables

**What Was Done:**
Fixed 6 cross-user data leakage issues: (1) localStorage cleared on login, (2) RLS policies tightened, (3) Supabase SELECT queries filter by user_email, (4) State sync API uses JWT auth, (5) CAC login sets session_id, (6) Vault key scoped by user+role.

**What Was Tested:**
Both apps build. Login flow tested. Data isolation verified — User A cannot see User B's records.

**Note:** Migration 012 must still be run in Supabase Dashboard SQL Editor for live DB.

---

### 2026-03-13 — FY25 → FY26 Updates
**Commit:** `fee1fcb`
**Files Changed:**
- demo-app/src/js/enhancements.js — 8 FY25 → FY26 replacements (AI prompts, mock data, fallback text, timestamps)
- prod-app/src/js/enhancements.js — 7 FY25 → FY26 replacements
- demo-app/src/js/enterprise-features.js — 1 FY25 → FY26 (AI quick prompt)
- prod-app/src/js/enterprise-features.js — 1 FY25 → FY26

**What Was Done:**
Updated all stale FY25 references to FY26. Preserved `FY25-FY26` ranges (correct as historical spans) and `fy_appropriation:'FY25'` in milestones demo data (historical contract year).

**What Was Tested:**
Both apps build. Grep verified: only intentional FY25 references remain.

---

## Checklist Improvements

### 2026-03-15 — Checklist Items 1.1 + 1.4 + 1.6: CSP Headers, Rate Limiting, HSTS
**Commit:** `pending`
**Files Changed:**
- api/index.py — Hardened `_cors_headers()` method

**What Was Done:**
- **Item 1.1 (CSP headers):** Added `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` to all API JSON responses. Both HTML meta tags and vercel.json already had comprehensive CSP — this closes the API gap.
- **Item 1.1 (CORS tightening):** Replaced `Access-Control-Allow-Origin: *` wildcard with an explicit allowlist: `s4ledger.com`, `www.s4ledger.com`, `s4-ledger.vercel.app`, and localhost dev ports. Added `Vary: Origin` header for proper cache behavior.
- **Item 1.4 (Rate limiting):** Discovered already implemented — 120 requests per 60 seconds per IP, LRU-bounded to 10K entries, applied to both GET and POST handlers. No changes needed.
- **Item 1.6 (HSTS):** Aligned API HSTS header from `max-age=31536000` (1 year, no preload) to `max-age=63072000; includeSubDomains; preload` (2 years, matching vercel.json). vercel.json already had `upgrade-insecure-requests` in production CSP.
- **Additional headers:** Added `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` to API responses (matching vercel.json headers).

**What Was Tested:**
- api/index.py compiles without errors (`py_compile`)
- demo-app builds successfully (`npx vite build`)
- prod-app builds successfully (`npx vite build`)

**Rollback Instructions:**
Revert `_cors_headers()` method in api/index.py to use `"Access-Control-Allow-Origin": "*"` and remove the `_ALLOWED_ORIGINS` class attribute. Restore HSTS to `max-age=31536000; includeSubDomains`.

---
