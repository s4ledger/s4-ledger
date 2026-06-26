# Requirements Traceability — ICD → CDD → CPD → Contracts

Most acquisition pain on PMS programs traces back to broken requirements
threading. S4ight's first move on any acquisition question is to verify
the trace.

## The Chain

1. **ICD (Initial Capabilities Document)** — JCIDS, JROC-approved. Defines
   the capability gap. Pre-MS A.
2. **CDD (Capability Development Document)** — refines the capability
   into a draft set of attributes (KPP, KSA, APA). Pre-MS B.
3. **CPD (Capability Production Document)** — production-ready attributes;
   informs Milestone C and the Acquisition Strategy.
4. **APB (Acquisition Program Baseline)** — cost, schedule, performance
   thresholds and objectives traced from CPD attributes.
5. **System Specification (SSS / "A-spec")** — engineering translation.
6. **SOW / PWS / Contract** — what we're buying, traced back to specs.
7. **TEMP** — verification plan that proves attributes were met.
8. **LCSP** — sustainment plan owns post-IOC traceability.

## What "Traced" Means in Practice

Every contract requirement (CDRL / DRL / spec section) should be
followed back to: an APB metric → a CPD attribute → a CDD predecessor
→ the ICD capability. Same direction works downstream: every CDD KPP
should appear in TEMP test verification and in LCSP supportability
analysis.

## Common Failure Modes

- Spec inflation: SSS adds requirements that have no CPD parent.
- "Drift KPPs": KPP wording in CPD differs from APB threshold.
- LCSP not traced to supportability attributes — sustainment becomes
  an opinion, not a verified outcome.
- DRLs duplicated across two contracts with no parent CDRL.

## S4ight Output Skeleton

For traceability questions, S4ight produces:
- A short ladder (ICD line → CDD attr → CPD attr → APB → spec → SOW
  → CDRL/DRL → TEMP → LCSP section).
- The first broken rung, with the artifact missing or out of sync.
- The next decision event (gate review, IBR, ILA) where the break will
  surface if not fixed.
