# S4ight v1.0

Specialized agentic AI for S4 Systems, LLC — focused on **ILS, Acquisition Management, and Programmatic Support** for US Navy **PMS 300 / 325 / 385**.

This package is a **complete local-first stack**:

- FastAPI backend with grounded RAG over `s4ight_knowledge/`
- Specialized agents (ILS / Acquisition / Programmatic) with tool calls
- Real LLM via local **Ollama** (default model: `llama3.1`)
- Single-page HTML frontend that calls the live `/chat` API
- Easy to expand with more knowledge docs, tools, and agents
- Built so it can later move to AWS GovCloud / Azure Government for IL4 / IL5

---

## Folder Layout

```
s4ight/
├── index.html                  # Live UI (served at s4ledger.com/s4ight/ and locally)
├── backend/
│   ├── main.py                 # FastAPI app (chat, tools, health, frontend)
│   ├── agents.py               # ILS / Acquisition / Programmatic agents + router
│   ├── tools.py                # Structured artifact generators
│   ├── retriever.py            # Keyword RAG over the knowledge base
│   ├── memory.py               # Per-session conversation memory
│   ├── llm_providers.py        # OpenAI + Ollama abstraction (swap-friendly)
│   ├── ollama_integration.py   # Legacy direct Ollama client (kept for tests)
│   ├── config.py               # Centralized config (env-overridable)
│   ├── requirements.txt
│   └── .env.example
├── s4ight_knowledge/           # Markdown knowledge base (drop more .md files here)
│   └── *.md
├── run.sh
└── README.md

# Deployed alongside on the s4ledger.com Vercel project:
api/s4ight.py                   # Serverless function: /api/s4ight/{chat,health,tool/...}
```

---

## Prerequisites

- **Python 3.10+**
- One LLM provider:
  - **Local dev:** [Ollama](https://ollama.com)
  - **Production / Vercel:** OpenAI API key (recommended `gpt-4o-mini`)

---

## Live Preview on s4ledger.com

S4ight ships as part of this monorepo and deploys to Vercel alongside the rest
of s4ledger.com. URLs after deploy:

- UI: `https://s4ledger.com/s4ight/`
- API: `https://s4ledger.com/api/s4ight/health`

### One-time setup in Vercel

1. Get an API key at <https://platform.openai.com/api-keys>.
2. Vercel dashboard → Project → **Settings → Environment Variables** → add:
   - `OPENAI_API_KEY` = your key (Production + Preview).
   - `S4IGHT_LLM_PROVIDER` = `openai` (already the default; explicit is fine).
   - (Optional) `OPENAI_MODEL` = `gpt-4o-mini` (default).
3. Redeploy (or push to `main` — `git push` re-deploys automatically).

That's it. Visit `https://s4ledger.com/s4ight/` — the sidebar status panel
will show "LLM: openai · gpt-4o-mini · ready" once the env var is live.

---

## Run Locally (with Ollama, no API key needed)

```bash
# 1. Pull a local model (one-time)
ollama pull llama3.1
# (faster option for older machines)
# ollama pull llama3.1:8b

# 2. From the s4ight folder, create a venv and install deps
cd s4ight
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# 3. Tell S4ight to use the local provider, then run
export S4IGHT_LLM_PROVIDER=ollama
./run.sh
# …or manually:  S4IGHT_LLM_PROVIDER=ollama python backend/main.py
```

Then open **<http://localhost:8000>** in your browser. The frontend at `s4ight/index.html`
is served at `/` and auto-detects the local API base, so no CORS issues.

Health check: <http://localhost:8000/health>
Knowledge listing: <http://localhost:8000/knowledge>

---

## Choosing a Different Model

```bash
# Pull whichever model you want
ollama pull mistral

# Then run S4ight pointed at it
OLLAMA_MODEL=mistral python backend/main.py
```

Any model exposed by `ollama list` works. Common picks:

- `llama3.1` (default, balanced)
- `llama3.1:8b` (smaller / faster)
- `mistral`, `qwen2.5`, `phi3` — all fine for this domain

---

## API Surface

### `POST /chat`
```json
{
  "message": "Build a Supply Support checklist for T-AO 205.",
  "program": "PMS 325",
  "session_id": "optional-uuid"
}
```
Returns the assistant response, sources, which agent answered, which engine
(`ollama` or `retrieval-fallback`), elapsed ms, and any structured `tool_result`.

### `POST /tool/{name}`
Direct tool invocation. Available tools:
- `generate_ils_checklist` — params: `element`, `platform`
- `generate_acquisition_outline` — params: `milestone`, `program`
- `generate_risk_register` — params: `program`, `count`

### `POST /session/{session_id}/clear`
Reset the conversation memory for a session.

### `GET /health`
Backend + Ollama + knowledge-base status. The frontend uses this for the status panel.

### `GET /knowledge`
Lists every markdown doc currently indexed.

---

## Adding Knowledge

Drop more `.md` files into `s4ight_knowledge/`. The retriever auto-detects new
files within ~30s (cache TTL) — no restart required. Best practices:

- One topic per file.
- Use headings (`#`, `##`) so chunks remain coherent.
- Repeat domain terms (`ILS`, `LCSP`, `EVMS`, etc.) — keyword scoring uses them.
- Keep files under ~50 KB for predictable retrieval quality.

---

## Adding a Tool

1. Add the function to `backend/tools.py` and register it in `AVAILABLE_TOOLS`.
2. Wire any trigger phrases in `backend/agents.py` → `ARTIFACT_TRIGGERS`.
3. (Optional) Restrict which agents auto-fire it via the `_tool_for` override.

It is now callable via `/tool/{name}` and from agents during `/chat`.

---

## Adding an Agent

1. Subclass `BaseAgent` in `backend/agents.py`, set `name` and `focus`.
2. Override `_tool_for` if it should only fire certain tools.
3. Add keyword cues to `Orchestrator._pick` so the router can route to it.

---

## Security Notes (and the IL4/IL5 path)

This local-first build is intentionally minimal but written so it tightens up cleanly:

- Input length capped (`S4IGHT_MAX_MESSAGE_CHARS`).
- CORS allowlist configurable via env (`S4IGHT_CORS_ORIGINS`); default
  permissive **only for localhost**.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`) on every response.
- No authentication yet — add an auth proxy (OIDC, mTLS) before exposing
  beyond `localhost`.
- No PII / classified data should be put in `s4ight_knowledge/` until the
  deployment is accredited.
- For GovCloud / IL4 / IL5:
  - Run behind an authenticated reverse proxy (AWS ALB + Cognito, or
    Azure App Gateway + Entra).
  - Replace Ollama with a hosted LLM that has the right ATO (Bedrock,
    Azure OpenAI Gov, etc.).
  - Swap the retriever for an embeddings-based store (OpenSearch / pgvector)
    with classification-tagged metadata.
  - Add full audit logging (request, retrieved chunks, model response).
  - Apply DoD RMF controls, CMMC 2.0, and STIG hardening to the image.

---

## Recommended Next Improvements

- **Embeddings + vector store** (BGE, e5, Cohere) in place of keyword scoring.
- **LangGraph / CrewAI** orchestration once routing complexity grows.
- **Document ingestion pipeline** — accept PDF/DOCX/XLSX, chunk, tag with
  classification, and persist embeddings.
- **Citations** linking back to specific files + offsets in the UI.
- **Eval harness** — golden-question set with regression checks per agent.
- **Audit logging** — append-only JSONL of every request/response.
- **Multi-user auth + RBAC** scoped to program (300 / 325 / 385).
- **Hardened CORS + CSRF** before any non-local deployment.

S4 Systems, LLC — Building the future of ILS and program support with secure, grounded AI.
