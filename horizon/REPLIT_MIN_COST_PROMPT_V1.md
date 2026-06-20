# Replit Prompt (Minimal Cost) - HORIZON v1.0

Use this as a single prompt in Replit.

Build a new HORIZON Version 1.0 from the ground up, using the current HORIZON app only as a reference for business logic and data fields. Keep architecture simple and deployment-ready.

Requirements:
- No subscription tiers at launch.
- Managed-service model: S4 Systems controls operational data edits.
- Public users are read-only.
- Owner/Admin is internal and not shown as a public role concept.
- Support two public views: Leadership View and Contractor View (both read-only).

Include only these v1 features:
- Schedule and Gantt
- Data Entry workspace (view-only for public users)
- Acquisition Profile (focused)
- Trends and Metrics summary
- Command View summary with upcoming decisions
- Export CSV
- Print/PDF

Exclude and fully disable in runtime:
- Brief Editor
- AI Assist
- System Health
- Set Baseline
- Import CSV
- Backup download
- Add Hull and Add Milestone
- Planning/Scheduling standalone tab
- Advanced command-report modules

Data model and operations:
- Assume an external S4-controlled intake source (spreadsheet or form workflow) is the upstream source of truth.
- App reads published dataset and does not expose public edit paths.
- Add route/action guards so disabled modules cannot execute.

Quality gates:
- No runtime errors during normal v1 navigation.
- Clear, simple UI focused on trust and readability.
- Preserve compatibility with MANIFEST visual language.
- Keep implementation lean and maintainable.

Output required:
- Working app code
- Short README with setup and deployment steps
- Release checklist for v1 smoke testing
