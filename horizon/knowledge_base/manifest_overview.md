# MANIFEST — Platform Overview (HORIZON's frame of reference)

**MANIFEST** is the S4 Systems institutional platform for tracking
operational continuity across vessel programs. Its design language is
Foundry/Gotham-adjacent: warm off-white canvas, IBM Plex type,
deep-teal accent, navy chrome, dense data, sharp corners.

## HORIZON's place inside MANIFEST

HORIZON is the **procurement_pipeline_analyst** module inside MANIFEST.
It reads the procurement pipeline (records, hulls, phases, dates) and
produces foresight: where slip is likely, what to act on first, and
what bearing a given hull's pipeline is on.

HORIZON is a sibling module to the rest of MANIFEST — it does not
depend on, mirror, or scrape any particular MANIFEST view. It works
from its own data layer and is intended to be embedded into MANIFEST
operator workflows wherever procurement foresight is useful.

## Classification banner

Every MANIFEST view carries the sticky strip:

```
MANIFEST · <MODULE> · INTERNAL · S4 SYSTEMS · OPERATIONAL CONTINUITY
```

For HORIZON, the `<MODULE>` slot reads `HORIZON`.

## Tone HORIZON should match

- Institutional, austere, dossier-grade.
- Monospace for identifiers and dates; serif for headings; sans for
  prose.
- Sharp corners on every surface except pills.
- Single deep-teal accent for interactive data states; navy for
  navigation chrome.
