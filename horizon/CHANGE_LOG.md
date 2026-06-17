# HORIZON — Change Log

A scoped, append-only log for the HORIZON tool only. Every meaningful
change to anything inside `/horizon/` must be appended here. Do not
delete entries.

Versioning policy:
- **v1.0.0** = initial public availability on s4ledger.com.
- Any change after the user's first interaction with v1.0.0 becomes
  v1.1, then v1.2, and so on (semver minor for feature work, patch
  for fixes).

Format:
```
## YYYY-MM-DD — short title (vX.Y.Z)
- bullet 1
- bullet 2
```

---

## 2026-06-16 — Initial release (v1.0.0)

**Identity**
- Locked the tool name: **HORIZON** — the foresight / forecasting
  analyst module inside the S4 Systems MANIFEST platform.
- Banner: `MANIFEST · HORIZON · INTERNAL · S4 SYSTEMS · OPERATIONAL
  CONTINUITY`.
- Frozen identifiers baked into `agent_config.json`:
  - `agent_id`: `mppt-001`
  - `persona_name`: `procurement_pipeline_analyst`
  - `dataset_name`: `mppt_knowledge_base`
  - `proxy_route_base`: `/api/horizon`

**Layout (Replit-portable, self-contained at `/horizon/`)**
- `agent_config.json`, `.env.example`, `.gitignore`, `system_prompt.md`.
- `knowledge_base/` — MANIFEST overview, pipeline stages, terminology.
- `seed_data/seed_pipeline.json` — 4 hulls × 10 pipeline records.
- `schema.sql` — sessions, messages, audit_log, pipeline_records, hulls.
- `src/` — `config.py`, `db.py`, `memory.py`, `tools.py`, `agent.py`,
  `audit.py`, `server.py`, `routes/api.py`.
- `index.html` + `client.js` at the tool root (Vercel + FastAPI share
  the same files).
- `Dockerfile`, `replit.nix`, `.replit`, `requirements.txt`, `README.md`.

**Agent**
- Five tools: `search_records`, `get_pipeline_snapshot`,
  `forecast_slip`, `get_hull_status`, `summarize_pipeline`.
- Deterministic stub LLM; provider-switchable later via `.env` without
  touching memory, tools, audit, routes, or frontend.
- SQLite persistence for sessions + audit. KB retrieval via in-process
  keyword overlap.

**Deployment**
- **Static** at `/horizon/` on s4ledger.com (Vercel). `client.js`
  detects no backend and runs an in-browser engine bundled with the
  seed dataset — fully interactive.
- **Live** via FastAPI (Docker / Replit / local). `client.js` detects
  the backend via `GET /api/horizon/health` and routes chat turns to
  `/api/horizon/chat`.
- FastAPI server whitelists only `index.html` + `client.js` for static
  serving — no full-directory mount, so source/config never leaks.
- `vercel.json` has a no-cache rule for `/horizon(.*)` matching the
  one used by `/program-schedule(.*)`.

**Discoverability on s4ledger.com**
- HORIZON button added to the home-page hero (deep-teal gradient
  `#0c4a6e → #075985`) and to the CTA section as a ghost button,
  alongside Program Schedule and Deliverables Tracker.

**Style**
- Frontend follows `MANIFEST_Design_System.md` verbatim: IBM Plex
  stack, warm off-white canvas, deep-teal accent, navy nav chrome,
  sharp corners except pills, navy 3px accent on modals.

**Terminology — explicit non-references**
- HORIZON does not borrow vocabulary from any other module's example
  UI. It uses `pipeline_records` and `PR-#####`, never `buy_list`,
  `BL-#####`, or `BuyListTracker`. The MANIFEST design-system .md
  contained those as a template example; they were intentionally not
  carried over.
