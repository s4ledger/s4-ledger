# DCMA 14-Point Schedule Assessment — Playbook for ILS-Heavy IMS

The DCMA 14-point assessment is the de facto health check for an
Integrated Master Schedule (IMS). For PMS 300/325/385 programs where
ILS milestones must thread through the schedule, S4ight uses the points
below as the standard triage protocol.

## The 14 Points (with PMS context)

| # | Check | What "good" looks like | ILS implication |
|---|-------|------------------------|------------------|
| 1 | Logic | Every task has predecessors & successors (except start/finish). | ILS gates (LCSP, ILA, provisioning) must be linked to the technical baseline. |
| 2 | Leads | Negative lags ≤ 5% of activities. | Negative lags on supply-support deliveries usually mask reality. |
| 3 | Lags | Positive lags ≤ 5%, each justified. | Justify lags driven by depot turnaround or shipyard windows. |
| 4 | Relationship Types | FS dominant; SS/FF/SF ≤ 10% combined. | Provisioning → training → fielding is naturally FS; avoid SS shortcuts. |
| 5 | Hard Constraints | MFO / MSO ≤ 5%. | Don't constrain ILA dates with hard constraints; use deadlines + logic. |
| 6 | High Float | Tasks with float > 44 working days flagged. | High-float ILS tasks often hide a missing successor. |
| 7 | Negative Float | Zero negative float on baseline, every instance investigated. | Negative float on sustainment tasks = imminent ILS slip. |
| 8 | High Duration | Tasks > 44 wd broken into smaller chunks. | Provisioning campaigns get split by lot / hull / availability. |
| 9 | Invalid Dates | No future actuals, no past forecasts. | Common with quarterly status churn — discipline statusing weekly. |
| 10 | Resources | Assigned & leveled when required by contract. | ILS resources often missing in RAM — fix before EVMS reporting. |
| 11 | Missed Tasks | Track the rolling miss rate. | A creeping miss rate on ILS tasks predicts the next ILA red. |
| 12 | Critical Path Test | The CP is the *longest* path; pulse-test it. | Many PMS schedules show a fictional CP that bypasses ILS. |
| 13 | CPLI | Critical Path Length Index ≥ 0.95. | < 0.95 → real schedule pressure, escalate to PM. |
| 14 | BEI | Baseline Execution Index ≥ 0.95. | Sustained < 0.95 → re-baseline candidate. |

## S4ight Triage Procedure

1. Ask which IMS revision and reporting month are in scope.
2. Walk the 14 points; capture any failing check with a one-line cause.
3. For each failing check, propose: owner, fix, and the ILS impact.
4. End with the top 3 changes that move the most ILS milestones onto
   the critical path (i.e., make them visible, not buried).

## Anti-patterns We See Often

- **"Phantom" critical path** that runs through a non-sustainment leg —
  ILS slips silently because they're never on CP.
- **Plug duration** for ILA prep (often 30 days) that is never decomposed.
- **No level-of-effort split** for sustaining engineering activities,
  so they look done at month-end no matter the burn.
