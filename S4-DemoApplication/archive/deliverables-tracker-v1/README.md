# Deliverables Tracker — v1 (archived)

**Archived:** 2026-05-28

This is the original `DeliverablesTracker.tsx` (2,297 lines) that powered the
purple "Deliverables Tracker" button on s4ledger.com prior to the v2 rebuild.

It is kept here for reference only. It is no longer wired into the application.
The live tool is in `src/components/DeliverablesTracker.tsx` (v2), which is
modeled on the `Analysis of CSY DRLs (5.7.2026).xlsx` workbook with eight
feature views (Deliverables Tracker grid, Executive Brief, Action Items,
Analytics, Weekly Archive, Prior Week Snapshot, Submittal Schedule, Submittals
Library).

To compare or recover code, read the file in this folder directly. Do not
import from this folder — it is intentionally outside the build graph (no
references from `src/`).
