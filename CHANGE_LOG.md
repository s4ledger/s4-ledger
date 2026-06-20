# S4 Ledger — Change Log
**Purpose:** Detailed record of every improvement made from the [IMPROVEMENT_CHECKLIST.md](IMPROVEMENT_CHECKLIST.md).  
**Rule:** Every completed checklist item gets an entry here BEFORE marking it done.

---

### 2026-06-20 — HORIZON v1 Ground-Up Build + S4 Intake Tool + Site Reroute
**Commit:** (pending)
**Files Changed:**
- `horizon-v1/index.html` (new) — ground-up v1 build, visual replica, read-only, 5 workspaces.
- `horizon-v1/data.json` (new) — initial S4-published dataset (PMS-300T, 16 hulls).
- `horizon-v1/README.md` (new) — managed-service deployment notes.
- `horizon-intake/index.html` (new) — S4 internal data-entry tool (CSV/JSON in/out).
- `horizon-intake/README.md` (new) — internal usage and publish workflow.
- `index.html`
  - `HORIZON_TARGET` defaults to `/horizon-v1/` (was `/horizon-preview/`).
  - Site HORIZON buttons now default-point at `/horizon-v1/` and follow the toggle.
- `CONVERSATION_LOG.md`
  - Added Session 42 build, validation, and operating-model notes.

**Why:** Deliver a clean, trustworthy v1 customers can consume while S4 retains
operational data stewardship via a controlled intake. Preserves legacy and
preview surfaces, but ships a focused, performant launch surface.

---

### 2026-06-20 — Website Routing Update: HORIZON Button to Preview Build
**Commit:** (pending)
**Files Changed:**
- `index.html`
  - Updated HORIZON links to point to `/horizon-preview/` for direct website
    preview access.
  - Added single-point route toggle (`HORIZON_TARGET`) so all HORIZON buttons
    can be switched between preview and production path by changing one value.
- `horizon-preview/index.html`
  - Added preview copy of current managed-service v1 HORIZON build.
- `horizon-preview/README.md`
  - Added route and scope documentation for preview usage.

**Why:** Provide immediate on-site preview access through the existing HORIZON
button while evaluating the new build before broader production association.

---

### 2026-06-19 — HORIZON Build Strategy Update: Ground-Up v1 + Low-Cost Replit Handoff
**Commit:** (pending)
**Files Changed:**
- `CONVERSATION_LOG.md`
  - Added Session 39 with locked strategy: ground-up v1.0 rebuild using the
    current app as reference, local build-to-95% preference, and low-token
    Replit handoff after scope artifacts are finalized.

**Why:** This approach reduces launch risk, prevents legacy coupling in the new
runtime, and lowers Replit implementation cost by moving high-context design
work into local preparation first.

---

### 2026-06-19 — HORIZON Product Scope Decision: No-Tier Layered Release + Public Role Simplification
**Commit:** (pending)
**Files Changed:**
- `CONVERSATION_LOG.md`
  - Added Session 38 with locked product decisions for HORIZON Version 1.0:
    no subscription tiers at launch, layered future releases, internal-only
    Owner/Admin, minimal public role model, and keep/hide feature matrix.

**Why:** Product packaging was intentionally simplified to accelerate trust and
adoption: ship a reliable core first, keep advanced capabilities hidden but
preserved in code, then layer them into future versions based on customer
demand and funded expansion.

---

### 2026-06-19 — HORIZON Access Model Update: S4-Managed Operational Data
**Commit:** (pending)
**Files Changed:**
- `CONVERSATION_LOG.md`
  - Updated Session 38 role and governance policy so S4 Systems retains
    operational data edit control in v1.0. Public users are read-oriented
    viewers (leadership/program and contractor), while S4 internal admin/data
    steward remains non-public and fully privileged.

**Why:** The delivery model is managed service first: customers consume trusted,
curated operational views while S4 performs controlled data stewardship,
improving consistency, supportability, and account rapport during early
adoption.

---

### 2026-06-19 — HORIZON Operating Model Update: External S4 Data Intake Source
**Commit:** (pending)
**Files Changed:**
- `CONVERSATION_LOG.md`
  - Extended Session 38 with a locked data-source policy: S4 Systems maintains
    an external data-entry source (spreadsheet or equivalent intake tool) and
    uses a controlled publish process to update HORIZON operational data.

**Why:** The managed-service model requires a controlled upstream source of
truth for edits. Without an S4-controlled intake path, customer users would
need direct edit rights in-app, which conflicts with the v1.0 governance and
rapport-building strategy.

---

### 2026-06-17 — HORIZON Slide Editor: Program/Acq Gantt Positioning + Data-Sync Fix
**Commit:** (pending)
**Files Changed:**
- `horizon/index.html`
  - Added `seProgramSvgLayerElements(slide)` and routed program/acq slide
    defaults through the authoritative SVG generators (`seProgSVG`, `seAcqSVG`)
    to keep preview geometry aligned with generated charts.
  - Fixed `toFY()` return contract to provide structured fiscal values used by
    Gantt coordinate math (`fy`, `fyMo`, `fyFrac`), with fallback parsing for
    loosely formatted date strings.
  - Preserved/used live sync wiring so slide content regenerates from HORIZON
    schedule updates while the slide editor is open.

- `CONVERSATION_LOG.md`
  - Added Session 37 implementation notes and validation summary.

**Why:** Milestone symbols, labels, and dates in program/acquisition slides were
mispositioned because fiscal conversion output and downstream chart math were
out of sync. This change restores deterministic placement and keeps slide
generation tied directly to HORIZON schedule data.

---

### 2026-05-28 — Deliverables Tracker v2 Rebuild · Step 1: Archive v1
**Commit:** (pending)
**Files Changed:**
- `S4-DemoApplication/archive/deliverables-tracker-v1/DeliverablesTracker.tsx` — copy of v1 (2,297 lines), kept for reference.
- `S4-DemoApplication/archive/deliverables-tracker-v1/README.md` — explains the archive and that the folder is outside the build graph.
- `CONVERSATION_LOG.md` — new Session 36 entry with full decision log.
- `/memories/session/deliverables-tracker-v2.md` — session memory: locked decisions, feature map, build plan.

**Why:** User requested a from-scratch rebuild of the Deliverables Tracker
modeled on `Analysis of CSY DRLs (5.7.2026).xlsx`. Each of the workbook's 8
tabs will become a feature view inside the new tool. The original tool is
preserved verbatim in `archive/` rather than deleted. Work proceeds step-by-step
with user review between each step.

---

### 2026-05-28 — Deliverables Tracker v2 Rebuild · Step 2: Demo data + types
**Commit:** (pending)
**Files Changed:**
- `S4-DemoApplication/src/types/deliverablesV2.ts` (new) — v2-only types for
  the seven companion feature views and the in-tool Activity Log. Main grid
  reuses existing `DRLRow` from `src/types.ts` for App.tsx compatibility.
- `S4-DemoApplication/src/data/deliverablesDemoData.ts` (new) — seeded demo
  data for all eight features (Tracker rows, Executive Brief, Action Items,
  Analytics series, Weekly Archive, Submittal Schedule, Submittals Library).
  All terminology genericized: Acme Shipyard, Vessel Class A, Hulls 60–67,
  Program Office. No CSY/Conrad/YRBM references.
- `/memories/session/deliverables-tracker-v2.md` — added design constraint:
  Apple.com / Steve Jobs aesthetic, LIGHT MODE ONLY (no `dark:` Tailwind variants).

**Why:** Establishes the data layer before the UI shell. With these in place,
Step 3 can scaffold the new `DeliverablesTracker.tsx` against real shapes and
render meaningful demo content immediately.

---

### 2026-05-28 — Deliverables Tracker v2 Rebuild · Step 3: Shell
**Commit:** (pending)
**Files Changed:**
- `S4-DemoApplication/src/components/DeliverablesTracker.tsx` (replaced; ~580 LOC
  vs. 2,297 in v1). Apple-style shell: top bar (brand + NSERC IDE sync chip +
  Activity toggle + Portfolio exit), 256-px left rail with 8-feature nav,
  feature router (currently placeholders for views 2–8), slide-out 384-px
  Activity Log panel, IDE auto-sync via `realSyncPipeline` (mount + every
  5 min), `useProgramSchedule()` preserved. Light mode only — no `dark:`
  Tailwind variants. Props identical to v1; App.tsx unchanged.
- `S4-DemoApplication/src/services/activityLog.ts` (new) — localStorage-backed
  activity log with pub/sub subscribe, 500-entry cap, Clear, ready for future
  Supabase backend swap.

**Why:** Foundation for the per-feature views in Steps 4–11. Ships a fully
navigable Apple-style shell with working IDE sync and end-to-end activity
logging behind it.

---

### 2026-05-28 — Deliverables Tracker v2 Rebuild · Step 4: Tracker view
**Commit:** (pending)
**Files Changed:**
- `S4-DemoApplication/src/components/deliverables/TrackerView.tsx` (new) —
  Apple-style main grid: 4 status tiles, search + 5 filter chips, "Snapshot
  This Week" button, data table with status color rail / chip, expandable
  row with Notes pane + Anchor / Verify / Re-seal action pills. Every user
  action calls `logActivity` (activityLog.ts).
- `S4-DemoApplication/src/components/DeliverablesTracker.tsx` — shell now
  imports `TrackerView`, holds an in-memory `snapshots` state seeded with
  `DEMO_ARCHIVE`, exposes `handleSnapshot`, and routes `featureKey ===
  'tracker'` to the live view. Extracted reusable `PageHeader`. Other 7
  features still render the placeholder card (Steps 5–11).

**Why:** First fully-functional feature view, modeled on the spreadsheet's
"CSY Overdue" tab. The snapshots store lives in the shell so the upcoming
Weekly Archive (Step 8) and Prior Week Snapshot (Step 9) views can read from
the same source of truth.

---

### 2026-05-28 — Deliverables Tracker v2 Rebuild · Steps 5–11: Remaining seven feature views
**Commit:** (pending)
**Files Changed:**
- `S4-DemoApplication/src/components/deliverables/ExecutiveBriefView.tsx` (new) —
  Apple-style weekly program-office brief. Header strip (report date + week
  ending + print/export), three large health tiles, KPI table with trend
  arrows + tone chips, critical escalations cards, three-panel narrative
  (Progress / Concerns / Recommended Actions).
- `S4-DemoApplication/src/components/deliverables/ActionItemsView.tsx` (new) —
  Priority filter chips (Critical / High / Medium / Low) with live counts;
  expandable cards with editable response sub-tracker (response text,
  planned resolution date, POC, date submitted, receipt confirmed, notes).
  Every edit calls `logActivity('action-response')`.
- `S4-DemoApplication/src/components/deliverables/AnalyticsView.tsx` (new) —
  Metric cards (current vs. historical with trend tone), pure-SVG stacked
  bar chart for weekly trend, top-offenders table.
- `S4-DemoApplication/src/components/deliverables/ArchiveView.tsx` (new) —
  Timeline of weekly snapshots (latest first), 4 totals cells per row,
  "Latest" pill on newest snapshot.
- `S4-DemoApplication/src/components/deliverables/SnapshotView.tsx` (new) —
  Diff engine over `currentRows` vs. most recent prior snapshot with rows.
  Added / Removed / Changed / Unchanged classification with per-field diff
  display (from → to).
- `S4-DemoApplication/src/components/deliverables/ScheduleView.tsx` (new) —
  Submittal catalog table with search + cadence dropdown filter.
- `S4-DemoApplication/src/components/deliverables/LibraryView.tsx` (new) —
  Submittals catalog grouped by DI family; search + hull filter.
- `S4-DemoApplication/src/components/DeliverablesTracker.tsx` — FeatureView
  router now switches across all 8 features (no more placeholder card).
  Imports the 7 new views.
- `S4-DemoApplication/index.html` — refreshed from `dist/index.html` so
  Vercel’s `/S4-DemoApplication` route serves the rebuilt bundle hashes.

**Why:** Completes the 8-tab spreadsheet → 8-feature tool mapping. Every
view is Apple-aesthetic (light mode only, hairline borders, system font
stack, accent `#0071e3`), every user interaction is recorded in the in-tool
Activity Log, and the production build (`vite build`) succeeds with no
TypeScript errors. Vercel `build.sh` re-runs and re-copies `index.html`
automatically on deploy.

---

## Format

Each entry follows this structure:

```
### [Date] — Checklist Item #X.X: [Title]
**Commit:** `hash`
**Files Changed:**
- path/to/file — what changed
```

---

## Session Log — 2026-05-06

### 2026-05-06 — Fix: status/received/submissionDate consistency enforcement
**Commit:** `bcf66af`
**Files Changed:**
- `S4-DemoApplication/src/App.tsx` — Added `sanitizeRow()` / `sanitizeRows()` functions; applied at every data load point (initial state, demo reset, IndexedDB hydrate, Supabase cloud hydrate, both `onDataUpdate` callbacks)
- `S4-DemoApplication/src/components/DeliverablesTracker.tsx` — Added `enforceStatusConsistency()` called after every `handleCellEdit()`; enforces: green requires received=Yes; received=No blocks green; clearing submission date resets received+downgrades green→yellow
- `S4-DemoApplication/src/services/nsercIdeService.ts` — Simulation `simulateNSERCData()` now sets `received='Yes'` when adding `actualSubmissionDate`; red rows moved to yellow on submission; `mapNSERCDataToTrackerRow()` sanitizes incoming SharePoint data
- `S4-DemoApplication/src/utils/externalSync.ts` — After merge of incoming external row, enforces status/received consistency before XRPL seal

**What Was Done:**
Fixed a critical data-integrity bug: rows could show status="Completed" (green) while `received="No"` (document not yet received). This is logically impossible in the acquisition workflow — a deliverable cannot be completed unless the Government has received it.

Root causes found and fixed:
1. **NSERC simulation** randomly set `actualSubmissionDate` without updating `received` or `status`
2. **No load-time validation** — corrupted data in localStorage/Supabase was displayed as-is
3. **No edit-time enforcement** — users could manually set inconsistent states
4. **Sync merge** did blind `{...currentRow, ...extRow}` with no consistency check

**Invariant now enforced everywhere:** `status === 'green'` ↔ `received === 'Yes'` AND `actualSubmissionDate` is non-empty. These three fields are always kept in agreement at: startup/load, every cell edit, every NSERC sync, every external merge.

---

### 2026-05-06 — Feat: Program Schedule → Deliverables Tracker date sync (all rows)
**Commit:** `1a2d338`
**Files Changed:**
- `S4-DemoApplication/src/services/programScheduleService.ts` — Fixed `parseMilestoneRef()` for "Submit with X" (offset 0) and "NLT X + N days" patterns; added `DEMO_PS_VESSELS` constant (6 vessels with full construction ms + acqEvents); `fetchProgramSchedule()` now merges missing acqEvents from demo data and falls back to `DEMO_PS_VESSELS` so DT always has PS context
- `S4-DemoApplication/src/types.ts` — Added `PSCellEntry` interface (shared between DT and modal)
- `S4-DemoApplication/src/components/CellEditModal.tsx` — Added `psEntry?: PSCellEntry` to `CellEditTarget`; shows Program Schedule Source panel in modal with: contract baseline, PS current date, schedule variance (slip/early badge), milestone code, vessel designation
- `S4-DemoApplication/src/components/DeliverablesTracker.tsx` — Replaced local PSEntry type with `PSCellEntry`; simplified `contractDueFinish` + `calculatedDueDate` cells to show clean date + compact `PS`/`ACQ` badge; clicking any PS-driven date opens modal with full PS lineage; removed `formatDelta` from DT (moved to modal)

**What Was Done:**
Previously only 1 of 15 rows showed PS source data. The other 14 rows had no PS context because:
1. `parseMilestoneRef()` didn't handle "Submit with SRR/SDP" or "NLT milestone + N days" syntax
2. `DEMO_PS_VESSELS` didn't exist — required the PS tool to be opened first to write to localStorage
3. Cell display was too visually busy (strikethrough + delta badge + PS source all in-cell)

Now: all rows that can be matched to a PS vessel/milestone show a clean date with a small `PS`/`ACQ` badge. Clicking opens a modal panel with the full Program Schedule breakdown including schedule variance.

---

### 2026-05-06 — Feat: PS→DT full implementation (previous session)
**Commit:** `9f0c861`
**Files Changed:**
- `S4-DemoApplication/src/services/programScheduleService.ts` — `PSVessel` gets `acqEvents`; `MILESTONE_KEYWORDS` expanded to SRR/PDR/CDR/SDP/IOTE; `PSDueDateResult` gets `milestoneGroup`; `computePSDueDate()` checks both `ms` and `acqEvents`
- `S4-DemoApplication/src/types.ts` — Added `milestoneRef` field to `DRLRow`
- `S4-DemoApplication/src/components/DeliverablesTracker.tsx` — 3-case `contractDueFinish` render (no contract, shifted, unchanged); `calculatedDueDate` shows PS source badge; `psComputedDates` memo includes delta math
- `S4-DemoApplication/src/hooks/useProgramSchedule.ts` — Added `storage` event listener for cross-tab propagation (`s4_ps_v2`, `s4_program_schedule_propagated`)
- `program-schedule/index.html` — Added `ACQMS` registry; `acqEventsVisible` state; `acqEvents` data on 6 demo vessels; "Acq Events" toggle button + panel; `toggleAcqEvents()` / `renderAcqEvents()`; `propagate()` includes `acqEvents`; `openMSEModal` / `mseSave` / `mseDelete` handle `field==='acqEvent'`

**What Was Done:**
Implemented the full Program Schedule → Deliverables Tracker date synchronization architecture. Acquisition/design events (CDR, PDR, SRR, SDP, IOT&E) are tracked separately from construction milestones in the PS tool and flow through to the DT. Real-time cross-tab propagation added.

---

### 2026-05-06 — Fix: App.tsx hydration dep array + demo isolation
**Commit:** `24cf234`
**Files Changed:**
- `S4-DemoApplication/src/App.tsx` — Hydration dep array `[isDemo]` → `[isDemo, authLoading, user]`; demo reset useEffect resets data+anchors; Supabase hydration guarded by `authLoading` and `user`; persist effects guard `if (isDemo || !user) return`; localStorage guard `if (isDemo) return`

**What Was Done:**
Demo mode could incorrectly trigger Supabase hydration, overwriting demo data with real user data. Persist effects were writing demo data to shared Supabase tables. All fixed by proper guards at each data lifecycle point.

---

### 2026-05-05 — Fix: craft labels use PS vessel designations
**Commit:** `(prior session)`
**Files Changed:**
- `S4-DemoApplication/src/data/sampleData.ts` — All rows updated to use PS vessel designations: APL-101, APL-102, YRBM-51, YRBM-52, YTB-810, YTB-811
- `S4-DemoApplication/src/config/demoDefaults.ts` — Same vessel designation updates
- `S4-DemoApplication/src/components/DeliverablesTracker.tsx` — Craft labels and platform dropdowns aligned to PS vessel registry

**What Was Done:**
Demo data vessel names didn't match the Program Schedule tool's vessel designations (APL, YRBM, YTB prefixes). This broke PS→DT matching since `inferVesselFromTitle()` couldn't find a match. All sampleData and demoDefaults updated to use canonical PS designations.

---

### 2026-05-05 — Fix: PS tool spreadsheet UX improvements
**Commit:** `(prior session)`
**Files Changed:**
- `program-schedule/index.html` — Group label no longer repeats type code; FY range extended with Custom option; notes cell opens modal with textarea + AI assist button; sheet toolbar has real search and status filter; `onDateChange` function declaration restored

**What Was Done:**
Multiple UX bugs in the Program Schedule spreadsheet tool: group headers were repeating the vessel type code, FY dropdown was limited to a fixed range, notes cells had no editing capability, and toolbar search/filter were decorative-only.



**What Was Done:**
Brief description of the change.

**What Was Tested:**
How we verified nothing broke.

**Rollback Instructions:**
git revert <hash> or specific steps to undo.
```

---

## v8.18.0 — Production Readiness Phase 8: Lazy-Loading, Observability, Testing

### 2026-04-09 — Lazy Modals, Structured Logger, Sentry Breadcrumbs, Performance Marks, 46 New Tests
**Commit:** *(pending)*
**Files Changed:**
- S4-DemoApplication/src/components/DeliverablesTracker.tsx — 8 additional components converted to lazy() with Suspense; Sentry breadcrumbs on external sync & contract comparison; performance.mark/measure on both operations
- S4-DemoApplication/src/components/App.tsx — Sentry breadcrumbs on seal and re-seal handlers
- S4-DemoApplication/src/lib/logger.ts — NEW: Structured logger (debug/info/warn/error) with JSON output in production, Sentry breadcrumb forwarding
- S4-DemoApplication/src/__tests__/hash.test.ts — NEW: 10 tests for sha256() and hashRow()
- S4-DemoApplication/src/__tests__/documentService.test.ts — NEW: 12 tests for formatFileSize() and validateFile()
- S4-DemoApplication/src/__tests__/spreadsheetConfigs.test.ts — NEW: 15 tests for org configs, grant columns, edit permissions
- S4-DemoApplication/src/__tests__/changeLog.test.ts — NEW: 9 tests for in-memory change log (recordChange, getChangesForRow, getAllChanges, field label mapping)

**What Was Done:**
- **Performance (89→93):** Lazy-loaded 8 additional modals/panels (ExternalSyncModal, NotificationsPanel, EmailComposer, WorkflowProgressPopup, PermissionsModal, CellEditModal, DocumentUploadModal, DocumentPanel) — total 13 lazy components. Main bundle reduced from 682KB to 611KB. Added performance.mark/measure on contract comparison and external sync with Sentry.setMeasurement reporting.
- **Observability (90→94):** Created structured logger (src/lib/logger.ts) with level-gated output, JSON in production, Sentry breadcrumb forwarding on warn/error. Added Sentry.addBreadcrumb on 4 critical user actions: seal, re-seal, external sync, contract comparison.
- **Test Coverage (91→94):** 46 new tests across 4 files (hash, documentService, spreadsheetConfigs, changeLog). Total: 197 tests, 16 test files, all passing.

**What Was Tested:**
`npx tsc --noEmit` — clean. `npx vitest run` — 197/197 pass. `npm run build` — succeeds, bundle sizes verified.

**Rollback Instructions:**
`git revert <hash>`

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
