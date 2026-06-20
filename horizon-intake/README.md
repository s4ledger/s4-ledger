# HORIZON Intake — S4 Internal Data Steward Tool

Internal-only single-file app at `/horizon-intake/` for editing the HORIZON
operational dataset that feeds `/horizon-v1/`.

## Purpose
- Author the canonical `data.json` consumed by the public HORIZON v1 build.
- Keep customers out of the editing path while S4 manages data quality.

## Usage
1. Open `/horizon-intake/index.html`.
2. Click **Load from /horizon-v1/data.json** to start from the current published dataset (or **Open JSON…** / **Import CSV…**).
3. Edit hulls inline (designation, type, fleet, status, milestones, acquisition fields).
4. Click **Save data.json** to download the updated file.
5. Replace `/horizon-v1/data.json` in the deployment with the downloaded file.
6. Refresh `/horizon-v1/` — the new content is live for customers.

## Data conventions
- Date format: `YYYY-MM` (or `YYYY-MM-DD`) for milestone/acquisition columns. Empty means "not yet scheduled".
- Status values: `on-track`, `at-risk`, `delayed`, `not-planned`.
- Milestone keys: `CA`, `SOC`, `LCH`, `BT`, `AT`, `DEL`.
- Acquisition keys: `SRR`, `PDR`, `CDR`, `SDP`, `IOTE`.

## CSV import schema (optional)
Columns:
```
designation,type,fleet,status,ms_CA,ms_SOC,ms_LCH,ms_BT,ms_AT,ms_DEL,contract,builder,uic,fy_approp,pm_secnav
```

## Security
- Not linked from the public navigation.
- Marked `noindex,nofollow`.
- No backend; all edits stay in the editor's browser until exported.
- Restrict access at the hosting layer if needed (Vercel password, IP allow-list, or move under a non-public domain).
