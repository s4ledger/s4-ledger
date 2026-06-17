# HORIZON — Pipeline Stages

A pipeline record moves through five named phases. Each phase has its
own color in the MANIFEST design system (see Phase Palette).

| # | Phase         | Short | Meaning                                                                     |
|---|---------------|-------|-----------------------------------------------------------------------------|
| 1 | Definition    | DEF   | Requirement is being scoped. Specs, quantities, and justification drafted.  |
| 2 | Procurement   | PRO   | Solicitation / contracting in motion. RFQs, RFPs, market research.          |
| 3 | Shipbuilder   | SHP   | Shipbuilder / vendor engaged; item being produced or sourced.               |
| 4 | Review        | REV   | Inspection, acceptance, technical sign-off.                                 |
| 5 | Award         | AWD   | Final award / contract action and disposition recorded.                     |

A pipeline record may also carry a **status chip**:

- **On Track** (green) — current step ahead of or on its baseline date.
- **At Risk** (amber) — slipping but recoverable within phase budget.
- **Overdue** (red) — past its baseline date with no recovery plan.
- **Complete** (teal) — Award phase finished and recorded.

## Stage gates (what unblocks the next phase)

- DEF → PRO: approved requirements package + funding line confirmed.
- PRO → SHP: contract awarded or PO issued.
- SHP → REV: vendor delivers acceptance package.
- REV → AWD: technical and contracts officers both sign off.
- AWD → done: final disposition entered.

## RIY (Risk-Index Yield)

RIY is the composite slip-risk score HORIZON shows per record.

- 0–24: nominal
- 25–59: elevated
- 60–100: critical (typically paired with At Risk or Overdue status)
