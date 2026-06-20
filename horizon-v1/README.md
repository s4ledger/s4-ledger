# HORIZON v1.0 — Public Read-Only Build

Managed-service production build for HORIZON, served at `/horizon-v1/`.

## What this is
- Single-file static app (`index.html`) plus an external data source (`data.json`).
- Visual replica of HORIZON / MANIFEST design system.
- Public scope only:
  - Schedule & Gantt
  - Data Entry (read-only display of S4-published data)
  - Acquisition Profile
  - Trends & Metrics
  - Command Summary
  - Export CSV
  - Print / PDF

## What is intentionally NOT here
The following are preserved in legacy/reference builds but are deferred from v1
runtime: Brief / Slide Editor, AI Assist, System Health, Set Baseline,
Import CSV, Backup Download, Add Hull, Add Milestone, Planning workspace,
Advanced Command Reports.

## Source of truth
S4 Systems publishes operational data through an external intake (see
`/horizon-intake/`). The intake produces a JSON file (the canonical format),
which is dropped in at `horizon-v1/data.json`. The app reads that file at
startup with no-cache headers and renders read-only.

## Deployment
- Static folder. No backend. No build step.
- Vercel/static host serves `/horizon-v1/`.
- Update content by replacing `data.json` only.

## Preview routing
The website HORIZON button is wired via a single `HORIZON_TARGET` value in
the root `index.html`. Set it to `/horizon-v1/` to point the button at this
build.
