# HORIZON — Change Log

Append-only log scoped to the HORIZON tool. Do not delete entries.

Versioning policy:
- **v1.0.0** = initial public availability on s4ledger.com.
- Any change after the user's first interaction becomes v1.1, then
  v1.2, etc.

---

## 2026-06-20 — Website Preview Surface via `/horizon-preview/`

Enabled a dedicated website preview path for the current managed-service v1
build without changing the established MANIFEST visual language.

Files changed:
- `index.html` (site root)
  - Repointed HORIZON button links to `/horizon-preview/`.
  - Added single-point `HORIZON_TARGET` toggle and data-attribute wiring so
    all HORIZON CTAs can switch routes from one config value.
- `horizon-preview/index.html` (new preview surface copy)
- `horizon-preview/README.md`
  - Added preview route/scope notes and deferred-feature summary.

Rationale:
- Allow direct website-based preview for stakeholder review.
- Keep a clearly separated preview surface while iterating.

---

## 2026-06-19 — Visual-Replica Public v1 Gating (managed-service mode)

Implemented public v1 behavior directly in the existing single-file UI so the
look and feel remains consistent with current HORIZON while deferred tools are
removed from runtime use.

Files changed:
- `horizon/index.html`
  - Added `V1_PUBLIC_READONLY` and `V1_DEFERRED_FEATURES` config flags.
  - Added centralized gate helpers (`isEditableSession`, `isFeatureEnabled`,
    `requireEditable`, `requireFeature`) and startup UI gating
    (`applyV1PublicModeUI`).
  - Hid deferred controls without redesigning layout language:
    Add Hull, Add Milestone, AI Assist, Set Baseline, Import CSV,
    Slide Editor, Sample Data.
  - Kept visual style/format/colors intact while enforcing public read-only
    behavior for sheet/acquisition editing interactions.
  - Added runtime guards to block edit/deferred paths even if triggered
    programmatically.
  - Updated footer marker to reflect managed-service operation by S4.

Rationale:
- Preserve current visual identity for continuity.
- Enforce S4-controlled operational data model.
- Remove advanced/deferred features from v1 runtime path safely.

---

## 2026-06-19 — v1.0 Ground-Up Planning Artifacts (managed-service model)

Created methodical build and handoff artifacts to support a clean v1 rebuild
with minimal Replit cost and staged future layering.

Files added:
- `horizon/V1_BUILD_CHARTER.md`
  - Ground-up v1 objective, non-negotiables, scope in/out, bug policy,
    managed-service data operations, and success criteria.
- `horizon/V1_FEATURE_MATRIX.md`
  - Keep/defer matrix and audience permissions (Leadership View,
    Contractor View, internal S4 Data Steward/Admin).
- `horizon/REPLIT_MIN_COST_PROMPT_V1.md`
  - Low-token, single-pass Replit prompt aligned to locked strategy and
    MANIFEST-compatible v1 deliverable.

Rationale:
- Reduce feature creep and launch risk.
- Keep v1 stable and read-oriented for customers.
- Preserve S4-controlled operational data governance.
- Minimize Replit token/iteration cost through high-context local prep.

---

## 2026-06-16 — Initial release (v1.0.0)

**Re-scoped to a true Program Schedule sibling**

Prior scaffolds (Python agent backend, SQLite, chat-only UI, "buy
list" template terminology) were the wrong target. HORIZON is now a
Program Schedule tool for PMS 300T styled to the MANIFEST design
system. Single-file delivery: `horizon/index.html` + `horizon/client.js`.

**Identity & data**
- Banner: `MANIFEST · HORIZON · INTERNAL · S4 SYSTEMS · OPERATIONAL
  CONTINUITY`.
- Hull classes: APL, YRBM, YFB, YTB. 16 seeded hulls across PACFLT and
  USFF.
- Milestones: CA, SOC, LCH, BT, AT, DEL.
- Acquisition events: SRR, PDR, CDR, SDP, IOTE.
- Status chips: On Track, At Risk, Delayed, Not Planned.

**UI**
- Classification banner, sidebar (Views / Status / Tools / Footer),
  toolbar (craft filter, FY range, milestone chips, search, Acq
  toggle), KPI ribbon, Gantt card, Spreadsheet card, Acq Events card.

**Gantt**
- SVG. Frozen left column with hull/fleet, scrollable right timeline.
- Milestone symbols (star/triangle/diamonds/circle).
- CA→DEL span colored by status. Today line. FY column shading +
  quarter ticks. Baseline variance grey ticks. Zoom +/− (50%–200%).

**Spreadsheet**
- Inline edit: designation, fleet, status, builder, contract, UIC.
- Milestone cells open Modal. Variance deltas in days against
  baseline. Per-row delete. Right-click context menu (edit / toggle
  complete / clear / cycle status / delete hull).

**Modals**
- Milestone Edit (smart date parser + day + complete + note).
- Add Hull. Add Custom Milestone Type. Confirm dialog.

**Drawer**
- Audit Log (searchable, capped at 800, CSV export).
- AI Assist (rule-based, local). Understands hull lookups,
  `pipeline snapshot`, `at risk`, `delayed`, `next deliveries`, `help`.

**I/O**
- CSV export/import of the schedule.
- Set Baseline snapshot for variance tracking.
- Print / PDF via browser print stylesheet.
- Sample Data action.

**Persistence**
- localStorage key `horizon_v1` with auto-save (700 ms debounce).

**Deployment**
- Static at `/horizon/` on s4ledger.com. No backend required.
- Replit-portable: `/horizon/` folder is the entire deliverable.

**Style**
- IBM Plex Sans/Serif/Mono. Warm off-white canvas. Deep-teal accent.
  Navy nav chrome. Sharp corners except pills. Navy 3px modal accent.
  Verbatim per `MANIFEST_Design_System.md`.

**Terminology**
- No references to BuyListTracker or buy-list vocabulary anywhere.
