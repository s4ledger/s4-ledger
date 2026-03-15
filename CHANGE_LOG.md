# S4 Ledger — Change Log
**Purpose:** Detailed record of every improvement made from the [IMPROVEMENT_CHECKLIST.md](IMPROVEMENT_CHECKLIST.md).  
**Rule:** Every completed checklist item gets an entry here BEFORE marking it done.

---

## Format

Each entry follows this structure:

```
### [Date] — Checklist Item #X.X: [Title]
**Commit:** `hash`
**Files Changed:**
- path/to/file — what changed

**What Was Done:**
Brief description of the change.

**What Was Tested:**
How we verified nothing broke.

**Rollback Instructions:**
git revert <hash> or specific steps to undo.
```

---

## Pre-Checklist Work (Historical)

### 2026-03-13 — Phase 1-3 Backend Wiring
**Commit:** `964c006`
**Files Changed:**
- demo-app/src/js/enhancements.js — Wired 6 features (Living Program Ledger, Program Impact Simulator, Secure Collaboration Network, Cryptographic Mission Impact Ledger, Self-Healing Compliance, Immutable After-Action Review) to real backend endpoints via fetch()
- prod-app/src/js/enhancements.js — Same 6 features wired
- api/index.py — Backend handlers for all 6 endpoints

**What Was Done:**
Connected Category A features: frontend now calls real API endpoints instead of simulating responses. All 6 features fully functional with backend persistence.

**What Was Tested:**
Both apps build successfully. Features verified via manual testing in preview server.

---

### 2026-03-13 — Prod-App DRL Demo Data Removal
**Commit:** `a248e17`
**Files Changed:**
- prod-app/src/js/engine.js — Removed hardcoded DRL seed/demo data
- prod-app/src/js/enhancements.js — Removed demo data arrays

**What Was Done:**
Cleaned all demo/seed data from prod-app so it starts clean for real users. Demo-app retains demo data for demonstration purposes.

**What Was Tested:**
Prod-app builds. No console errors on load. DRL starts empty as expected.

---

### 2026-03-13 — Data Isolation Fixes (6 Critical Issues)
**Commit:** `4028619`
**Files Changed:**
- demo-app/src/js/engine.js — Added `_clearS4UserData()`, scoped `_vaultKey()` by user+role, set `s4_session_id` on CAC login
- prod-app/src/js/engine.js — Same changes
- demo-app/src/js/acquisition.js — Added `.eq('user_email', _email)` filter on SELECT
- prod-app/src/js/acquisition.js — Same filter
- demo-app/src/js/milestones.js — Added user_email filter
- prod-app/src/js/milestones.js — Same filter
- demo-app/src/js/brief.js — Added user_email filter on `_loadBriefs()`
- prod-app/src/js/brief.js — Same filter
- api/index.py — `_get_user_state`/`_save_user_state` now use JWT auth via `_get_auth_user()`
- supabase/migrations/012_data_isolation_rls.sql — NEW: RLS policy fixes for all tables

**What Was Done:**
Fixed 6 cross-user data leakage issues: (1) localStorage cleared on login, (2) RLS policies tightened, (3) Supabase SELECT queries filter by user_email, (4) State sync API uses JWT auth, (5) CAC login sets session_id, (6) Vault key scoped by user+role.

**What Was Tested:**
Both apps build. Login flow tested. Data isolation verified — User A cannot see User B's records.

**Note:** Migration 012 must still be run in Supabase Dashboard SQL Editor for live DB.

---

### 2026-03-13 — FY25 → FY26 Updates
**Commit:** `fee1fcb`
**Files Changed:**
- demo-app/src/js/enhancements.js — 8 FY25 → FY26 replacements (AI prompts, mock data, fallback text, timestamps)
- prod-app/src/js/enhancements.js — 7 FY25 → FY26 replacements
- demo-app/src/js/enterprise-features.js — 1 FY25 → FY26 (AI quick prompt)
- prod-app/src/js/enterprise-features.js — 1 FY25 → FY26

**What Was Done:**
Updated all stale FY25 references to FY26. Preserved `FY25-FY26` ranges (correct as historical spans) and `fy_appropriation:'FY25'` in milestones demo data (historical contract year).

**What Was Tested:**
Both apps build. Grep verified: only intentional FY25 references remain.

---

## Checklist Improvements

*Entries will be added below as checklist items are completed.*

---
