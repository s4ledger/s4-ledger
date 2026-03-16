# S4 Ledger — Final Sprint: Remaining Improvements & Baseline State

**Created:** March 15, 2026  
**Author:** AI Engineering Assessment (Steve Jobs Roleplay Context)  
**Baseline Commit:** `40fc07a` (Phase 7 complete, 51/57 = 89%)  

---

## PART 1 — REASSESSMENT: WHERE S4 LEDGER STANDS NOW

### What Changed Today (Phases 1–7 Completed)

Over the course of 7 systematic phases, S4 Ledger underwent a fundamental engineering transformation. Here's the honest reassessment through Steve Jobs' lens:

**Earlier today, the honest assessment had real teeth.** The platform had:
- Silent `catch(function(){})` blocks swallowing errors
- Raw `str(e)` exceptions leaking to clients  
- `print()` statements instead of structured logging
- Wildcard CORS (`*`)
- API keys in `localStorage` persisting forever
- No health check that actually checked anything
- 50+ fetch calls with zero user feedback on failure
- No developer onboarding documentation
- The OpenAPI spec covered less than half the routes

**That version of S4 was a prototype wearing a suit.**

### What We Fixed

**Security** went from "good intentions" to hardened — CSP headers enforced, 489 innerHTML assignments sanitized, API keys moved to sessionStorage, CORS locked to allowlist, error messages scrubbed, tokens using `crypto.randomUUID()`, rate limiting in place.

**Backend** went from 18 features that faked API responses to 18 features hitting real endpoints with persistence.

**Observability** went from blind to instrumented — structured JSON logging, request IDs on every call, duration tracking, health probes that actually probe, Web Vitals with threshold alerts and beacons, client error reporting flowing to Supabase.

**UX resilience** went from "hope it works" to defensive — `_s4Fetch` with timeouts and auto-retry, `s4ApiGet` with error toasts, empty states for blank containers.

**Documentation** went from scattered to comprehensive — every endpoint documented, developer guide, troubleshooting, demo vs prod guide, README reflecting reality.

### The Honest Jobs Take Now

The platform is genuinely impressive in scope — 105+ API routes, 23 ILS tools, XRPL anchoring, AI/RAG, offline mode, real multi-tenancy — and now the *engineering* behind it matches the ambition. The security posture is defensible. The monitoring is real. A new developer can be productive in a day. The API is documented.

**What would still bother Jobs:**
1. **The two massive files** (enhancements.js at 19,500+ lines, engine.js at 9,500+ lines) — that's not a shipping concern, it's a velocity concern. Every future change in those files is harder than it needs to be.
2. **Test coverage at 43.5%** — passing, but not the 80% threshold originally targeted. The critical paths are covered, but there's a gap.
3. **No E2E validation** running in CI — the 36 specs exist but haven't been exercised with a live server.

**The key shift:** Earlier today, the weaknesses were *foundational* — security, error handling, observability. Those are the kinds of problems that kill products. Now the remaining weaknesses are *engineering velocity* problems — file organization, test coverage depth, E2E infrastructure. Those are the kinds of problems that slow you down but don't kill you.

**S4 went from "not ready for a serious security review" to "ready for a pilot."**

51 of 57 items done. The 6 remaining are real work, but none of them are blockers for getting this in front of a defense program team.

---

## PART 2 — REMAINING IMPROVEMENTS CHECKLIST (6 Items)

### Rules of Engagement

> **These rules are non-negotiable. Reference this section before beginning ANY item.**

1. **Both apps move together.** Every change applies to BOTH `demo-app/` AND `prod-app/` unless the item is explicitly scoped to one app. No exceptions.
2. **Do not break anything.** After completing each item, run `npm run build` and `npm test` to verify both apps build and all 1,732 tests still pass. If anything breaks, stop and fix before moving on.
3. **One item at a time.** Complete an item fully, verify it, log it, then move to the next. No parallel half-finished work.
4. **Verify before logging.** Each item has a verification checklist. All verification steps must pass before marking the item as done.
5. **Checksum comparison.** After each item, run the checksum script from Part 4 to verify no unintended files were modified.
6. **Commit after each item.** Each completed item gets its own git commit with a clear message referencing the item number. Push after each commit.
7. **If in doubt, don't.** If an approach feels risky or unclear, stop, reassess, and find a safer path. There is no deadline worth breaking the platform.

---

### Item 1: Supabase RLS Migration (1.8)

**Priority:** 🔴 CRITICAL  
**Scope:** Database only (no code changes to either app)  
**Estimated Effort:** 5 minutes  

**What to do:**
1. Open the Supabase Dashboard for the S4 Ledger project
2. Navigate to SQL Editor
3. Open and review `supabase/migrations/012_data_isolation_rls.sql`
4. Execute the migration
5. Verify RLS policies are active on the affected tables

**Verification Checklist:**
- [ ] Migration executed without SQL errors
- [ ] RLS policies visible in Supabase Dashboard → Authentication → Policies
- [ ] API still returns data for authenticated requests (test with `GET /api/org/records` + API key)
- [ ] Unauthenticated requests cannot access org-scoped data
- [ ] Both apps build: `npm run build` ✅
- [ ] All tests pass: `npm test` → 28/28 files, 1,732 tests ✅

**Completion Log:**
- Date: ___________
- Verified by: ___________
- Notes: ___________

---

### Item 2: E2E Test Server Infrastructure (4.5)

**Priority:** 🟡 HIGH  
**Scope:** Test infrastructure (`tests/`, `playwright.config.js`, `package.json`)  
**Estimated Effort:** Moderate  
**Depends on:** Nothing (can start immediately)  

**What to do:**
1. Configure `playwright.config.js` to start both app preview servers before tests
2. Use `webServer` config in Playwright to auto-start:
   - `cd demo-app && npx vite preview --port 4173`
   - `cd prod-app && npx vite preview --port 4174`
3. Write E2E smoke tests for critical user journeys:
   - Page load → verify core UI renders (both apps)
   - Navigation between ILS tools
   - Anchor a record (with mock/demo data)
   - Verify a record hash
   - Check that error handling works (fetch failure toast)
4. Ensure `npm run test:e2e` works end-to-end

**Verification Checklist:**
- [ ] `npm run build` succeeds for both apps (dist/ directories exist)
- [ ] `npm run test:e2e` starts servers, runs tests, shuts down cleanly
- [ ] Smoke tests pass on Chromium at minimum
- [ ] No changes to any `src/` files — only `tests/`, config files, and `package.json`
- [ ] `npm test` (unit tests) still pass: 28/28 files, 1,732 tests ✅

**Completion Log:**
- Date: ___________
- Commit: ___________
- Tests added: ___________
- Notes: ___________

---

### Item 3: Accessibility Audit (4.6)

**Priority:** 🟢 MEDIUM  
**Scope:** E2E test files + any a11y fixes needed in both apps  
**Estimated Effort:** Moderate  
**Depends on:** Item 2 (E2E server infrastructure)  

**What to do:**
1. Wire `@axe-core/playwright` into the E2E test suite
2. Add axe-core scans to each major page/tool panel
3. Run the accessibility audit
4. Fix all **critical** and **serious** violations in both apps
5. Document any **moderate** violations that are deferred

**Verification Checklist:**
- [ ] axe-core scans integrated into E2E suite
- [ ] Zero critical a11y violations
- [ ] Zero serious a11y violations
- [ ] Any fixes applied to BOTH demo-app AND prod-app
- [ ] Both apps build: `npm run build` ✅
- [ ] All unit tests pass: `npm test` → 28/28 files, 1,732 tests ✅
- [ ] All E2E tests still pass: `npm run test:e2e` ✅

**Completion Log:**
- Date: ___________
- Commit: ___________
- Violations fixed: ___________
- Violations deferred: ___________
- Notes: ___________

---

### Item 4: Visual Regression Tests (4.7)

**Priority:** 🟢 MEDIUM  
**Scope:** E2E test files + screenshot baselines  
**Estimated Effort:** Moderate  
**Depends on:** Item 2 (E2E server infrastructure)  

**What to do:**
1. Add Playwright screenshot assertions for key screens:
   - Landing/hero page (both apps)
   - ILS workspace with a tool open (e.g., Gap Analysis)
   - Anchor record panel
   - Settings/profile modal
   - Email composer (if visible)
2. Generate initial baseline screenshots
3. Add to CI so future changes can be compared

**Verification Checklist:**
- [ ] Baseline screenshots generated for both apps
- [ ] Screenshot comparison tests pass on clean rebuild
- [ ] No changes to any `src/` files — only `tests/` and config
- [ ] Both apps build: `npm run build` ✅
- [ ] All unit tests pass: `npm test` → 28/28 files, 1,732 tests ✅
- [ ] All E2E tests still pass: `npm run test:e2e` ✅

**Completion Log:**
- Date: ___________
- Commit: ___________
- Screenshots captured: ___________
- Notes: ___________

---

### Item 5: Split enhancements.js into Modules (3.2)

**Priority:** 🟡 HIGH  
**Scope:** `demo-app/src/js/`, `prod-app/src/js/`, `vite.config.js` (both apps)  
**Estimated Effort:** Large (largest remaining task)  
**Depends on:** Items 2+3+4 (E2E coverage must exist before splitting)  

**What to do:**
1. Map all `window.*` exports and cross-function dependencies in `enhancements.js` (19,500+ lines)
2. Identify logical module boundaries:
   - (a) Compliance tools (CMMC, NIST, DFARS)
   - (b) AI/analytics tools (chat, RAG, NLP)
   - (c) Collaboration tools (SCN, sharing, conflict resolution)
   - (d) Supply chain tools (provenance, risk, DMSMS)
   - (e) Reporting tools (audit builder, export, PDF)
   - (f) Core utilities (fetch wrapper, API helpers, empty states)
3. Extract each group into its own file with proper exports
4. Update `vite.config.js` `manualChunks` in both apps
5. Replace `window.*` globals with `import()` calls where safe
6. Ensure all extracted modules work in both demo-app AND prod-app
7. Run full test suite after each extraction (not just at the end)

**⚠️ CRITICAL SAFETY RULES FOR THIS ITEM:**
- Extract ONE module group at a time
- Build + test after EACH extraction
- If any test fails, revert immediately and reassess
- Keep `enhancements.js` as a re-exporting barrel file if needed for backward compatibility
- The file currently has `enhancements.js` shared identically between both apps — this must remain true for all new files

**Verification Checklist:**
- [ ] Each extracted module builds independently
- [ ] Both apps build: `npm run build` ✅
- [ ] All unit tests pass: `npm test` → 28/28 files, 1,732+ tests ✅
- [ ] All E2E tests pass (critical — this catches runtime regressions the unit tests miss)
- [ ] Bundle sizes have not increased (may decrease due to tree-shaking)
- [ ] Shared files are identical between demo-app and prod-app (checksum match)
- [ ] No `window.*` reference errors in browser console (manually check both apps)

**Completion Log:**
- Date: ___________
- Commit(s): ___________
- Modules extracted: ___________
- Final enhancements.js line count: ___________
- Bundle size change: ___________
- Notes: ___________

---

### Item 6: Split engine.js into Modules (3.3)

**Priority:** 🟡 HIGH  
**Scope:** `demo-app/src/js/`, `prod-app/src/js/`, `vite.config.js` (both apps)  
**Estimated Effort:** Large  
**Depends on:** Item 5 (split enhancements.js first — lower risk, establishes pattern)  

**What to do:**
1. Map all `window.*` exports and cross-function dependencies in `engine.js` (~9,500 lines per app)
2. **Note: engine.js is NOT identical between apps** (demo mode vs production). Each app must be split independently but following the same module boundary plan.
3. Identify logical module boundaries:
   - (a) Auth/login (CAC, session, role switching)
   - (b) Anchoring engine (hash, XRPL submit, verify)
   - (c) DRL/ledger (deficiency review log, status tracking)
   - (d) UI utilities (rendering, DOM helpers, formatters)
   - (e) State management (demo session / production state)
4. Extract and test one module at a time
5. Update `vite.config.js` `manualChunks` in both apps

**⚠️ CRITICAL SAFETY RULES FOR THIS ITEM:**
- engine.js is DIFFERENT between demo-app and prod-app — changes must be made in BOTH files carefully
- Extract identical logic first (shared functions), then divergent logic (demo mode vs prod mode)
- Build + test after EACH extraction
- If any test fails, revert immediately
- Demo-specific code (e.g., `_demoMode`, `_demoSession`, mock data) stays in demo-only modules
- Prod-specific code (e.g., real auth, ITAR, role selector) stays in prod-only modules

**Verification Checklist:**
- [ ] Each extracted module builds independently for BOTH apps
- [ ] Both apps build: `npm run build` ✅
- [ ] All unit tests pass: `npm test` → 28/28+ files, 1,732+ tests ✅
- [ ] All E2E tests pass (critical for engine.js changes)
- [ ] Bundle sizes have not increased
- [ ] Demo-app still shows demo banner, mock data, walkthrough
- [ ] Prod-app still shows ITAR banner, CAC login, role selector
- [ ] No `window.*` reference errors in browser console (manually check both apps)
- [ ] Visual regression screenshots match (from Item 4)

**Completion Log:**
- Date: ___________
- Commit(s): ___________
- Modules extracted: ___________
- Final engine.js line count (demo): ___________
- Final engine.js line count (prod): ___________
- Bundle size change: ___________
- Notes: ___________

---

## PART 3 — POST-COMPLETION DEEP AUDIT PLAN

> **After ALL 6 items are complete, run this full audit before declaring the checklist done.**

### 3A — Build & Test Audit

| Check | Expected Result |
|-------|----------------|
| `npm run build` | Both apps build with zero errors |
| `npm test` | 28+ test files pass, 1,732+ tests pass, 0 failures |
| `npm run test:e2e` | All E2E smoke tests pass on Chromium |
| `npm run lint` | Zero warnings, zero errors |
| `npm run build:sizes` | Bundle sizes ≤ baseline (Part 4) or justified increase |
| `python3 -m pytest` | 73+ Python tests pass |

### 3B — Visual Audit (Manual — Both Apps)

**Demo-App (`http://localhost:4173/demo-app/dist/`):**

| Screen | What to Verify |
|--------|---------------|
| Landing page | Hero section renders, "Watch Demo" button visible, DoD consent banner present |
| Demo banner | Credits counter, anchor count, wallet address visible |
| ILS Workspace | All 23 tool tabs render, icons load, tool panels activate on click |
| Gap Analysis | Radar chart renders, scoring form works, save/load functional |
| DMSMS Tracker | Doughnut chart renders, program filter works |
| Readiness Calculator | Gauge chart renders, MTBF/MTTR inputs calculate |
| Anchoring | "Anchor Record" panel loads, can submit and see hash result |
| Verify | Verification panel opens, can paste hash and verify |
| Email Composer | Rich text editor loads, draft save works |
| DRL Tracker | Table renders, status columns update |
| Living Ledger | AI summary generates (or shows loading), track changes togglable |
| Walkthrough | "Quick Tour" triggers step-by-step guide |
| Offline mode | ServiceWorker registered (DevTools → Application), IndexedDB has cache |
| Mobile/responsive | Resize to 375px width — navigation collapses, content readable |
| Toast notifications | Triggering an action shows toast (e.g., save analysis) |

**Prod-App (`http://localhost:4174/prod-app/dist/`):**

| Screen | What to Verify |
|--------|---------------|
| Landing page | ITAR banner visible at top, DoD consent → CAC login flow |
| Role selector | 6 role presets visible in profile popover |
| ILS Workspace | Same 23 tools as demo, all render |
| All tool panels | Same visual checks as demo — charts, forms, inputs |
| Anchoring/Verify | Real API call flow (or graceful error if no keys set) |
| Auth validation | API key entry, role display, session management |
| Email Composer | Same as demo |
| DRL Tracker | Same as demo but no hardcoded demo data |
| Acquisition | Empty state (no mock data — users import their own) |
| Milestones | Empty state (no mock data) |
| ITAR banner | Persistent, not dismissable |
| Keyboard shortcuts | Cmd+K (search), Cmd+1-6 (tabs), Escape (close modals) |
| Toast notifications | Same as demo |

### 3C — Functional Audit (Automated + Manual)

| Test | How |
|------|-----|
| API health | `curl https://s4ledger.com/api/health` → `"healthy"` |
| API status | `curl https://s4ledger.com/api/status` → version, record counts |
| Hash endpoint | `curl -X POST https://s4ledger.com/api/hash -d '{"data":"test"}'` → SHA-256 hash |
| Record types | `curl https://s4ledger.com/api/record-types` → 64+ types |
| Error handling | Invalid request → generic error message, no stack trace |
| Rate limiting | 120+ rapid requests → 429 response |
| CSP headers | Check browser DevTools → Network → Response Headers → `Content-Security-Policy` present |
| CORS | Cross-origin request from non-allowlisted domain → blocked |

### 3D — Checksum Verification

Run the baseline comparison from Part 4. Any file whose checksum changed should be accounted for by the completed items. Unexpected changes = investigate immediately.

---

## PART 4 — BASELINE STATE (March 15, 2026 at commit `40fc07a`)

This is the reference snapshot. If anything breaks during the remaining improvements, compare against this baseline.

### Git State

```
HEAD:    40fc07a (main, origin/main)
Branch:  main
Status:  clean working tree
```

### Recent Commit History

```
40fc07a Phase 7: Documentation & Developer Experience (7.1-7.5)
f00de6f Phase 6: Monitoring — structured JSON logging, request IDs, health checks, vitals alerts
33145c3 Phase 5: UX Polish — _s4Fetch timeout+retry, error toasts, empty states
be6b151 Phase 4: Testing — anchor/auth/API tests, coverage boost 35→43%
e5df9ae Phase 3: Performance — tree-shaking, lazy-load, SW cache limits, bundle tracking
```

### Test Results

```
Vitest:   28 test files passed (28)
          1,732 tests passed | 2 skipped (1,734 total)
          28 post-teardown timer warnings (pre-existing, not failures)

Pytest:   73+ tests (SDK, API, anchoring, verification)
          Note: integration tests may timeout on network calls — this is expected
```

### Source File Checksums

**demo-app/src/js/**

| File | MD5 |
|------|-----|
| acquisition.js | `0b0b831596b3fea8b4f453f2afb951a5` |
| brief.js | `e9cf9db62d11abab4a00c01c2b596eb2` |
| engine.js | `39b2fd4f3f6a67fd461c8300615fe0fb` |
| enhancements.js | `b9013dfb62a0e3d7fa5a026b05b3dd24` |
| enterprise-features.js | `cee91a58f85d59e115d8dc30c821f100` |
| metrics.js | `c79be906d9c446334b14d4007ecf0399` |
| milestones.js | `0932482eef0d221f47ae07e3a2fcdd4f` |
| navigation.js | `c12a83ec6a7467675a48e923a147bf2f` |
| onboarding.js | `b85fd42ce0c07b87bf36bf368438ebd2` |
| registry.js | `0cf52061eaa70863daaf97a6086d6cb3` |
| roles.js | `c0ca6b6c0aa671a5a0e77cb1888c02ad` |
| sanitize.js | `a7efd45facf6a7632d2248ef898bdafd` |
| scroll.js | `1a27b9b3ad7293e84be7f2ea78312842` |
| session-init.js | `186eb499e0553c3cd5096d14eeed56e5` |
| supabase-init.js | `2f6e0636c6557a87f575ae7c6ab8a537` |
| walkthrough.js | `8c01984b16fa2049db396748bc774a9d` |
| wallet-toggle.js | `9252cb7eab514d58bc3698ed7d315d25` |
| web-vitals.js | `538a046d5e7c9eb4bd218a233e25c61c` |

**prod-app/src/js/**

| File | MD5 |
|------|-----|
| acquisition.js | `f4cfc6b81e4572d7d47d61f6cb5aa0d6` |
| brief.js | `e9cf9db62d11abab4a00c01c2b596eb2` |
| engine.js | `d41de0bda1e585a271ccc44048d2d0f4` |
| enhancements.js | `b9013dfb62a0e3d7fa5a026b05b3dd24` |
| enterprise-features.js | `cee91a58f85d59e115d8dc30c821f100` |
| metrics.js | `c79be906d9c446334b14d4007ecf0399` |
| milestones.js | `14fa52f1877a65a52828f447f8a3d8f9` |
| navigation.js | `c12a83ec6a7467675a48e923a147bf2f` |
| onboarding.js | `b85fd42ce0c07b87bf36bf368438ebd2` |
| registry.js | `0cf52061eaa70863daaf97a6086d6cb3` |
| roles.js | `c0ca6b6c0aa671a5a0e77cb1888c02ad` |
| sanitize.js | `a7efd45facf6a7632d2248ef898bdafd` |
| scroll.js | `edcbc3d9ef58e4c8f62029425b3a6c40` |
| session-init.js | `186eb499e0553c3cd5096d14eeed56e5` |
| supabase-init.js | `2f6e0636c6557a87f575ae7c6ab8a537` |
| walkthrough.js | `8c01984b16fa2049db396748bc774a9d` |
| web-vitals.js | `538a046d5e7c9eb4bd218a233e25c61c` |

**Shared files verified identical (MD5 match between demo/prod):**
`brief.js`, `enhancements.js`, `enterprise-features.js`, `metrics.js`, `navigation.js`, `onboarding.js`, `registry.js`, `roles.js`, `sanitize.js`, `session-init.js`, `supabase-init.js`, `walkthrough.js`, `web-vitals.js`

**Known different files (by design):**
`acquisition.js`, `engine.js`, `milestones.js`, `scroll.js` — plus `wallet-toggle.js` exists only in demo-app

**HTML & API Checksums:**

| File | MD5 |
|------|-----|
| demo-app/src/index.html | `055c5c1ea63e90370c0fa155b4b49edd` |
| prod-app/src/index.html | `f52a6732cd80683db55ab86c4ce64554` |
| api/index.py | `7cfdb71f225dcd3a961bbd2c686877af` |
| demo-app/sw.js | `17b68f8fc2fcfde6f42a48e7d691cc60` |
| prod-app/sw.js | `8ca0e71ea156517bdfd072f451573135` |

### Source Line Counts

| File | Lines |
|------|-------|
| demo-app/src/js/ (all JS) | 44,416 |
| prod-app/src/js/ (all JS) | 44,397 |
| demo-app/src/index.html | 4,662 |
| prod-app/src/index.html | 4,665 |
| api/index.py | 7,932 |

### Bundle Sizes (Built)

**prod-app/dist/assets/**

| File | Size |
|------|------|
| enhancements-BKK32zPv.js | 604K |
| engine-B5gJj9P8.js | 512K |
| index-BLCqQ3h4.js | 446K |
| index-BdpZIs4l.css | 404K |
| navigation-ZUqzvPOk.js | 70K |
| metrics-CAoTgYm3.js | 47K |

**demo-app/dist/assets/**

| File | Size |
|------|------|
| enhancements-k0pM607k.js | 606K |
| engine-B5EsgcIr.js | 526K |
| index-C2obDmgC.js | 466K |
| index-BdpZIs4l.css | 404K |
| navigation-JC8Xdoyk.js | 70K |
| metrics-BhA6sN6P.js | 47K |

### Gzip Sizes (from build output)

| Chunk | Demo gzip | Prod gzip |
|-------|-----------|-----------|
| enhancements.js | 167.50 KB | ~165 KB |
| engine.js | 149.24 KB | ~145 KB |
| index.js | 123.71 KB | ~120 KB |
| index.css | 63.90 KB | 63.90 KB |
| navigation.js | 19.44 KB | ~19 KB |
| metrics.js | 13.90 KB | ~14 KB |

### Improvement Checklist Progress

```
Phase 1 — Security:        7/8  (87%)  — 1.8 (Supabase RLS) remaining
Phase 2 — Backend Wiring: 18/18 (100%) ✅
Phase 3 — Performance:     5/7  (71%)  — 3.2, 3.3 remaining
Phase 4 — Testing:         4/7  (57%)  — 4.5, 4.6, 4.7 remaining
Phase 5 — UX Polish:       7/7  (100%) ✅
Phase 6 — Monitoring:      5/5  (100%) ✅
Phase 7 — Documentation:   5/5  (100%) ✅
────────────────────────────────────────
TOTAL:                     51/57 (89%)
```

---

## PART 5 — CHECKSUM VERIFICATION SCRIPT

Run this after each item to verify only expected files changed:

```bash
# Save this as verify_baseline.sh in the workspace root
echo "=== DEMO-APP JS CHECKSUMS ==="
for f in demo-app/src/js/*.js; do
  printf "%-40s %s\n" "$(basename $f)" "$(md5 -q $f)"
done
echo ""
echo "=== PROD-APP JS CHECKSUMS ==="
for f in prod-app/src/js/*.js; do
  printf "%-40s %s\n" "$(basename $f)" "$(md5 -q $f)"
done
echo ""
echo "=== CORE FILES ==="
printf "demo index.html   %s\n" "$(md5 -q demo-app/src/index.html)"
printf "prod index.html   %s\n" "$(md5 -q prod-app/src/index.html)"
printf "api/index.py      %s\n" "$(md5 -q api/index.py)"
printf "demo sw.js        %s\n" "$(md5 -q demo-app/sw.js)"
printf "prod sw.js        %s\n" "$(md5 -q prod-app/sw.js)"
echo ""
echo "=== TEST STATUS ==="
npx vitest run 2>&1 | grep -E 'Test Files|Tests '
echo ""
echo "=== BUILD STATUS ==="
npm run build 2>&1 | grep -E '✓ built|error'
```

Compare output against Part 4 checksums. Any mismatch = investigate.

---

*"Real artists ship. But they ship things that work." — Steve Jobs (adapted)*
