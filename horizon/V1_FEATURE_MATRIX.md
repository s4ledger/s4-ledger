# HORIZON v1.0 Feature Matrix

Date: 2026-06-19

## Keep in v1.0 (Public)
- Schedule and Gantt
- Data Entry (view-only)
- Acquisition Profile
- Trends and Metrics
- Command View (summary level)
- Export CSV
- Print/PDF

## Internal S4 Only (Not Public)
- Operational data edit controls
- Controlled publish pipeline
- Intake validation and data governance checks

## Defer to Later Versions
- Brief Editor
- AI Assist
- System Health
- Set Baseline
- Import CSV
- Backup download
- Add Hull
- Add Milestone
- Planning/Scheduling standalone view
- Advanced command report pack

## Permissions by Audience

### Leadership View
- Read schedule: Yes
- Read data entry tables: Yes
- Edit operational rows: No
- Export CSV: Yes
- Print/PDF: Yes

### Contractor View
- Read scoped schedule/data: Yes
- Edit operational rows: No
- Export CSV: Optional by program policy
- Print/PDF: Optional by program policy

### S4 Data Steward/Admin (Internal)
- Edit operational rows: Yes
- Publish changes to production: Yes
- Run governance checks: Yes
- Access deferred modules in v1 runtime: No (unless explicitly enabled in future release branch)

## Runtime Safety Gates
- Deferred modules disabled at menu layer.
- Deferred modules disabled at route/action layer.
- Guard checks prevent accidental invocation.
- Error telemetry must remain clean in normal v1 navigation.
