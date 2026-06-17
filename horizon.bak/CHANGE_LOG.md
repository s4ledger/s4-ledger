# HORIZON — Change Log

Append-only log scoped to the HORIZON tool. Do not delete entries.

Versioning policy:
- **v1.0.0** = initial public availability on s4ledger.com.
- Any change after the user's first interaction becomes v1.1, then
  v1.2, etc.

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
