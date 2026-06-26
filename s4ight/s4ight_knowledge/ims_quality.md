# Integrated Master Schedule (IMS)

## Purpose
The IMS is the time-phased, networked schedule that captures all program work,
its dependencies, and the critical path. It is the schedule half of the
EVMS PMB and the primary tool for cause-and-effect schedule analysis.

## Quality Attributes (DCMA 14-point checks, summarized)
1. Logic — every task has predecessors/successors (except start/finish).
2. Leads — minimize negative lags.
3. Lags — minimize positive lags; justify when used.
4. Relationship types — FS preferred; minimize SS/FF/SF.
5. Hard constraints — minimize MFO/MSO; justify each.
6. High float — flag and analyze tasks with >44 working days float.
7. Negative float — investigate and fix every instance.
8. High duration — break long tasks into ≤44-day chunks.
9. Invalid dates — no actuals in the future or forecasts in the past.
10. Resources — assigned and leveled where required.
11. Missed tasks — measure baseline-vs-actual slippage rate.
12. Critical path test — pulse the longest path; ensure it is the true CP.
13. CPLI — Critical Path Length Index ≥ 0.95 is healthy.
14. BEI — Baseline Execution Index ≥ 0.95 is healthy.

## ILS Hooks
- ILS deliverables (LCSP updates, ILA milestones, provisioning gates,
  training products, TDP releases) **must** appear in the IMS.
- Each ILS milestone needs a single accountable owner and at least one
  predecessor/successor tying it to the technical baseline.

## S4ight Guidance
- For any schedule question, ask: which IMS revision? What is the current
  CPLI and BEI?
- Recommend visualizing ILS-element milestones as a swimlane in the IMS
  and reporting them monthly.
