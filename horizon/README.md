# HORIZON

> **Foresight for the MANIFEST pipeline.**
> A self-contained module for S4 Systems' MANIFEST platform.
> Procurement pipeline analyst persona — reads pipeline records,
> surfaces slip risk, recommends next actions.

```
MANIFEST · HORIZON · INTERNAL · S4 SYSTEMS · OPERATIONAL CONTINUITY
```

---

## What this is

HORIZON is the analyst module inside MANIFEST. It exposes:

- A **chat interface** styled exactly to the MANIFEST design system.
- A **FastAPI backend** with proxy routes under `/api/horizon`.
- **Five tools** the agent can invoke: `search_records`,
  `get_pipeline_snapshot`, `forecast_slip`, `get_hull_status`,
  `summarize_pipeline`.
- A **knowledge base** loaded from `knowledge_base/`.
- **SQLite persistence** for sessions, messages, and an audit log.
- An **in-browser fallback engine** in `client.js` that mirrors the
  Python agent so the static page works on Vercel (s4ledger.com)
  without a backend running.

The agent ships with a deterministic **stub LLM** so the entire
pipeline runs end-to-end with zero credentials. Wire OpenAI or
Anthropic via `.env` when you are ready.

## Frozen identity

| Field | Value |
|---|---|
| `agent_id` | `mppt-001` |
| `persona_name` | `procurement_pipeline_analyst` |
| `dataset_name` | `mppt_knowledge_base` |
| `proxy_route_base` | `/api/horizon` |

These come from `agent_config.json` and should not be changed without
coordinating with the MANIFEST platform team.

---

## Repo layout

```
horizon/
├── agent_config.json        # identity + model/route/limits
├── system_prompt.md         # HORIZON's persona instructions
├── schema.sql               # SQLite DDL (sessions, messages, audit, pipeline_records, hulls)
├── requirements.txt
├── Dockerfile               # container build
├── .replit / replit.nix     # Replit configs
├── .env.example             # copy to .env and fill
├── CHANGE_LOG.md            # append-only, tool-scoped log
├── README.md                # this file
│
├── index.html               # MANIFEST-styled chat dashboard (Vercel + FastAPI)
├── client.js                # vanilla JS — backend client + in-browser fallback engine
│
├── knowledge_base/
│   ├── manifest_overview.md
│   ├── pipeline_stages.md
│   └── terminology.md
│
├── seed_data/
│   └── seed_pipeline.json   # demo hulls + pipeline records
│
└── src/
    ├── __init__.py
    ├── config.py            # settings loader (env + agent_config)
    ├── db.py                # sqlite3 wrapper + seeder
    ├── memory.py            # short-term + KB retrieval
    ├── tools.py             # the 5 agent tools
    ├── agent.py             # plan → tool → compose loop
    ├── audit.py             # audit log writer
    ├── server.py            # FastAPI app entry
    └── routes/
        ├── __init__.py
        └── api.py           # routes under /api/horizon
```

Everything HORIZON needs is inside this folder. Nothing imports from
the wider `s4ledger` repo, so the directory can be copied verbatim
into a Replit project.

## Two deployment modes

| Mode | Where | How it talks |
|---|---|---|
| **Static** | s4ledger.com (Vercel) — clickable at `/horizon/` | Page loads, `client.js` pings `/api/horizon/health`, fails to reach it, and runs the in-browser engine over a bundled seed dataset. Fully interactive. |
| **Live**   | Local / Docker / Replit (FastAPI running) | Same page hits `/api/horizon/chat` against the Python backend. Persistence, audit log, swappable LLM all live. |

The same `index.html` and `client.js` serve both modes — HORIZON
detects the runtime at startup.

---

## Quick start (local — live mode)

```bash
cd horizon
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # optional; defaults work for stub mode
uvicorn src.server:app --reload --port 8088
```

Open <http://localhost:8088/horizon>.

API:

- `GET  /api/horizon/health` — liveness + identity
- `GET  /api/horizon/tools`  — tool catalog
- `POST /api/horizon/chat`   — `{ message, session_id?, user_handle? }`
- `GET  /api/horizon/session/{id}` — message history
- `GET  /api/horizon/audit?limit=100` — audit feed
- `POST /api/horizon/admin/reindex` — drop in-process KB cache
- `GET  /api/horizon/docs` — interactive Swagger

Sample chat request:

```bash
curl -s http://localhost:8088/api/horizon/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"forecast PR-00042","user_handle":"demo-pm"}' | jq
```

## Quick start (Docker — live mode)

```bash
cd horizon
docker build -t horizon .
docker run --rm -p 8088:8088 horizon
```

## Quick start (Replit — live mode)

1. Create a new Replit project, language **Python**.
2. Drop the entire `/horizon/` folder into the project root.
3. Replit picks up `.replit` and `replit.nix` automatically.
4. Click Run. The chat UI is served at `/horizon`.

## s4ledger.com — static mode

The Vercel deploy serves `horizon/index.html` at `/horizon/`. The
home-page hero links to it. No backend is required on Vercel; the
in-browser engine handles every chat turn against the bundled seed
dataset.

## Configuration

| Source | Purpose |
|---|---|
| `agent_config.json` | identity, model, tools, memory caps, limits |
| `.env`              | mode, host/port, CORS, DB URL, LLM keys, auth |

The most important flag is `HORIZON_MODE`:

- `stub` — deterministic agent, no external calls. Default.
- `dev`  — LLM provider may be wired; auth is open.
- `prod` — LLM wired; clients must send `X-Horizon-Token` header.

## Wiring a real LLM later

1. Fill `OPENAI_API_KEY` (and/or `ANTHROPIC_API_KEY`) in `.env`.
2. Flip `HORIZON_MODE=dev`.
3. Replace the `LLM` adapter in `src/agent.py` with provider-backed
   `plan()` and `compose()` methods.

Everything else — memory, tools, audit, routing, frontend — is
unchanged.

## Logging

- **`CHANGE_LOG.md`** — human-curated, append-only, scoped to this
  tool. Update on every non-trivial change.
- **`audit_log` table** — every chat turn and tool call (live mode).
  Inspect via `GET /api/horizon/audit`.

## Design system

The frontend follows `MANIFEST_Design_System.md` verbatim: IBM Plex
font stack, warm off-white canvas (`#fafaf9`), deep-teal accent
(`#0c4a6e`), navy nav chrome (`#001f3f`), sharp corners with rounded
pills, navy 3px accent on modals, mono for everything identifying.

## Security notes

- `.env` is git-ignored. Never commit secrets.
- SQLite is local-only — for production, swap to managed Postgres and
  update `HORIZON_DB_URL`.
- Prod mode requires a shared-secret header (`X-Horizon-Token`). For
  real deployments, replace with proper auth (Supabase, OIDC).
- Tools are read-only by design; do not add mutating tools without an
  audit + auth review.
- The FastAPI server explicitly whitelists frontend assets it will
  serve (`index.html`, `client.js`); it never exposes the rest of the
  HORIZON tree.
