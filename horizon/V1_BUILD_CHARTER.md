# HORIZON v1.0 Build Charter

Date: 2026-06-19
Owner: S4 Systems

## Objective
Build a new HORIZON Version 1.0 from the ground up as a clean, stable core product, using the current HORIZON implementation only as a reference source.

## Product Strategy
- No subscription tiers at launch.
- Managed-service operating model.
- S4 Systems controls operational data edits.
- Public users are read-oriented in v1.0.
- Advanced modules are staged for later version layers.

## Non-Negotiables
- Owner/Admin is internal only and not visible as a public role concept.
- Public role surface stays minimal.
- Data Entry in customer-facing app is read-only in v1.0.
- External S4-controlled intake source is required for production updates.
- Hidden/deferred features must not execute accidentally in v1 runtime.

## Public Access Model (v1.0)
- Leadership View: read-only dashboards and reporting.
- Contractor View: read-only scoped visibility.

## Internal Access Model (S4 only)
- Data Steward/Admin: full operational edit authority.
- Internal tooling for controlled publish into HORIZON.

## Scope In
- Schedule and Gantt
- Data Entry workspace (read-only for customer users)
- Acquisition Profile (focused)
- Trends and Metrics (executive summary)
- Command View (summary and upcoming decisions)
- Export CSV
- Print/PDF

## Scope Out (defer to later versions)
- Brief Editor
- AI Assist
- System Health panel
- Set Baseline
- Import CSV
- Backup download
- Add Hull and Add Milestone
- Planning/Scheduling standalone workspace
- Advanced command-report modules

## Bug Policy
- Fix now if issue affects visible v1 path.
- Fix now if hidden module errors leak into global runtime/performance.
- Defer only when defect is fully isolated behind disabled module paths.

## Build Approach
1. Build local v1 core first (target 95 percent readiness).
2. Validate with S4-managed-service workflows.
3. Transfer to Replit for final integration and deployment.
4. Use low-token prompts only for tightly scoped implementation chunks.

## Data Operations
- Source of truth for edits: external S4 intake workflow (spreadsheet/form).
- Controlled publish process updates HORIZON dataset.
- Maintain change-control and audit trail before publish.

## Success Criteria
- Public users cannot edit operational records.
- S4 can update operational data through controlled upstream process.
- No deferred feature can trigger runtime errors in v1 flows.
- App is simple, stable, and credible for first customer adoption.
