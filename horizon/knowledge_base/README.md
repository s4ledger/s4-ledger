# HORIZON — Knowledge Base

This directory is the canonical source of domain knowledge HORIZON
reasons over. Files here are loaded at server startup and indexed for
keyword retrieval (`src/memory.py`). To extend the agent's knowledge:

1. Drop a Markdown (`.md`) or plaintext (`.txt`) file in this folder.
2. Restart the server (or hit `POST /api/horizon/admin/reindex` once
   that endpoint lands).

Do **not** put secrets or PII in here. Anything in `knowledge_base/`
is treated as fair game for retrieval and may be quoted back to users.

The dataset name (`mppt_knowledge_base` in `agent_config.json`) refers
to this folder.
