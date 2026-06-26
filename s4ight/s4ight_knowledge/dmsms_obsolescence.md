# DMSMS / Obsolescence Management

Diminishing Manufacturing Sources and Material Shortages (DMSMS) is one
of the largest single drivers of sustainment cost and risk on auxiliary
and surface fleet platforms managed by PMS 300/325/385.

## Definitions

- **DMSMS** — loss or impending loss of original suppliers / manufacturers
  for an item required to operate, maintain, or sustain the system.
- **Obsolescence** — supplier-driven discontinuation; usually announced.
- **Diminishment** — slow erosion (capacity, capability) without a hard EOL.

## Program-Level Process (typical)

1. **Identify** — component baseline → predictive analytics + supplier
   notices (EOL, PCN, PDN) → candidate parts list.
2. **Assess** — system criticality, repair cycle impact, alternate sources,
   form/fit/function reuse opportunities.
3. **Resolve** — pick a treatment:
   - Last-Time-Buy (LTB) with storage strategy.
   - Approved alternate / substitute.
   - Aftermarket source / authorized distributor.
   - Redesign (form, fit, function, or technology refresh).
   - Reverse engineering (with TDP rebuild).
4. **Implement** — configuration management approval (CCB), TDP updates,
   provisioning data refresh, ECP if required.
5. **Track** — case backlog, mean resolution time, cost avoidance.

## Key Documents / Hooks

- **DMSMS Management Plan (DMP)** — companion to the LCSP.
- **MIL-HDBK-512** — Parts Management.
- **SD-19, SD-22** (Defense Standardization Program) — supplier guidance.
- **Item Reduction Studies** for fleet-wide parts rationalization.

## Common Failure Modes

- DMSMS owner unfunded or unidentified.
- TDP rebuild lag prevents alternate qualification.
- LTB inventory not stored to MIL-spec → loss on the shelf.
- ECP backlog grows when CCB cadence slips.

## S4ight Guidance

- For any DMSMS query, ask: which item or NSN, criticality, lead time,
  and the current treatment plan (LTB / alt / redesign).
- Always tie a DMSMS case to the ILS Supply Support and Technical Data
  elements, and to a specific risk in the program register.
- Recommend a "case bucket" report monthly: open count by criticality,
  median age, cost avoidance YTD.
