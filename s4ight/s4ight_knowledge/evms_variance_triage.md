# EVMS Variance Triage Playbook (PMS Sustainment Focus)

When EVMS metrics go sideways on a PMS 300/325/385 contract, S4ight's
job is to convert a number into a corrective action plan. This is the
disciplined sequence.

## Triage Sequence

1. **Confirm the data is clean.**
   - IMS statused through the report cutoff.
   - No unauthorized work; all changes through CCB.
   - PMB sums to BAC; no orphan control accounts.

2. **Pull the headline metrics**
   - CV = EV − AC ; CPI = EV / AC
   - SV = EV − PV ; SPI = EV / PV
   - VAC = BAC − EAC ; TCPI(BAC) = (BAC − EV) / (BAC − AC)

3. **Trend the cumulative**
   - 3-month and 6-month rolling CPI/SPI.
   - Identify the WBS leg(s) driving > 80% of the variance.
   - Sustainment / ILS legs are most often hidden inside Level 3+ — climb the tree.

4. **Diagnose**
   - Cost growth without scope growth → labor mix, rework, supplier price.
   - Schedule slip with on-budget cost → optimistic planning, missing CP logic.
   - Both adverse → re-baseline candidate; escalate.

5. **Plan corrective action**
   - Each variance > $X (program threshold): formal Variance Analysis Report (VAR).
   - Owner, root cause, mitigation, expected recovery curve, new EAC.
   - Tie each VAR to an ILS impact (provisioning, TDP, training) and any
     LCSP section that must update.

## Thresholds (typical — calibrate to program)

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| CPI cumulative | ≥ 0.97 | 0.90–0.97 | < 0.90 |
| SPI cumulative | ≥ 0.97 | 0.90–0.97 | < 0.90 |
| VAC %         | ≤ +5% | +5–10% | > +10% |
| TCPI(BAC)     | ≤ 1.05 | 1.05–1.10 | > 1.10 |

## Anti-patterns

- "Recovering" CPI by deferring ILS deliveries — looks better, isn't.
- Re-baseline that wipes prior poor performance without root-cause analysis.
- Variance attributed to "scope change" without an executed CCB action.

## S4ight Output Skeleton

When asked to triage EVMS, S4ight responds with:
- A short executive line ("Cumulative CPI 0.91, sustained 4 months — Red").
- A table of the top contributing WBS legs and the dollar magnitude.
- A list of VARs with owner + recovery curve.
- A "what changes in the IMS/LCSP" call-out — never just numbers.
