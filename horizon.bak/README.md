# HORIZON

> **Program Schedule for PMS 300T** — inside the S4 Systems MANIFEST
> platform. Single-file build. Replit-portable.

```
MANIFEST · HORIZON · INTERNAL · S4 SYSTEMS · OPERATIONAL CONTINUITY
```

---

## What this is

HORIZON is a Program Schedule tool styled to the MANIFEST design
system, scoped to PMS 300T (Auxiliary, Cargo and Sealift Ships) hull
classes: **APL, YRBM, YFB, YTB**.

It is a functional sibling of `/program-schedule/` with the MANIFEST
visual language (IBM Plex stack, warm off-white canvas, deep-teal
accent, navy nav chrome, sharp corners except pills).

## Features in v1.0.0

- **Classification banner** (sticky)
- **Sidebar** — Views (All / APL / YRBM / YFB / YTB), Status filters,
  Tools (Audit Log, AI Assist, Print, Set Baseline, CSV I/O), and a
  save-state indicator
- **Toolbar** — craft filter, FY range (FY24–FY30), milestone toggle
  chips (CA, SOC, LCH, BT, AT, DEL), search box, Acq Events toggle
- **KPI ribbon** — Total Hulls, On Track, At Risk, Delayed
- **Gantt chart** — SVG, frozen left column + scrollable timeline,
  milestone symbols, CA→DEL span bars colored by status, today line,
  FY quarter ticks, zoom +/−, baseline-variance tick marks
- **Spreadsheet** — inline editing, milestone cells open the smart-date
  modal, variance deltas in days against baseline, delete-row,
  right-click context menu
- **Acquisition Events sub-panel** — SRR, PDR, CDR, SDP, IOTE per hull
- **Milestone Edit modal** — smart date parser (`May 2026`, `5/15/26`,
  `2026-05`, `FY26 Q2`, `FY27`, `TBD`)
- **Add Hull modal** and **Add Custom Milestone Type modal**
- **Audit Log drawer** — searchable, CSV-exportable, capped at 800
- **AI Assist drawer** — rule-based local assistant
- **CSV export / import**, **Set Baseline**, **Sample Data**, **Print**
- **localStorage persistence** under key `horizon_v1`

## Replit transfer

Everything HORIZON needs is in this folder. No build step, no backend,
no external runtime deps. Drop the `/horizon/` folder into Replit and
it works.

## Versioning

- **v1.0.0** = initial release. Any change after the user's first
  interaction becomes v1.1, then v1.2, etc.

## Security notes

- HORIZON v1.0.0 is fully client-side. No data leaves the browser.
- All user input is HTML-escaped at render time.
