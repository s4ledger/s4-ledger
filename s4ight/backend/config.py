"""
S4ight Configuration
Centralized config so paths, models, and behavior are not hard-coded.
Environment variables override defaults (production-friendly).
"""

import os
from pathlib import Path

# --- Paths ---
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
KNOWLEDGE_DIR = Path(
    os.getenv("S4IGHT_KNOWLEDGE_DIR", PROJECT_ROOT / "s4ight_knowledge")
)
# Default to the s4ight/ folder itself so a single index.html serves both
# the local FastAPI server (`python main.py`) and the Vercel deploy.
FRONTEND_DIR = Path(os.getenv("S4IGHT_FRONTEND_DIR", PROJECT_ROOT))

# --- LLM provider selection ---
# "openai" (hosted, used for production / Vercel)  |  "ollama" (local)
LLM_PROVIDER = os.getenv("S4IGHT_LLM_PROVIDER", "openai").lower().strip()

# --- OpenAI ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_TIMEOUT_S = float(os.getenv("OPENAI_TIMEOUT_S", "60"))
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.2"))
# Optional override (e.g., Azure OpenAI, OpenRouter). Leave blank for default.
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "").strip()

# --- Ollama / local LLM ---
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
OLLAMA_TIMEOUT_S = float(os.getenv("OLLAMA_TIMEOUT_S", "120"))
OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))

# Whether to require the LLM. If False, falls back to agentic responses
# when the LLM is unreachable (good for demos, dev).
REQUIRE_LLM = os.getenv("S4IGHT_REQUIRE_LLM", "false").lower() == "true"

# --- API ---
API_HOST = os.getenv("S4IGHT_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("S4IGHT_API_PORT", "8000"))

# CORS — keep tight for prod. Default permissive for local dev only.
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "S4IGHT_CORS_ORIGINS",
        "http://localhost,http://127.0.0.1,http://localhost:8000,http://127.0.0.1:8000,http://localhost:5173,https://s4ledger.com,https://www.s4ledger.com,null",
    ).split(",")
    if o.strip()
]

# --- Safety / limits ---
MAX_MESSAGE_CHARS = int(os.getenv("S4IGHT_MAX_MESSAGE_CHARS", "8000"))
MAX_CONTEXT_CHARS = int(os.getenv("S4IGHT_MAX_CONTEXT_CHARS", "8000"))
MAX_HISTORY_TURNS = int(os.getenv("S4IGHT_MAX_HISTORY_TURNS", "6"))

# Supported programs (used for routing + validation)
SUPPORTED_PROGRAMS = ["PMS 300", "PMS 325", "PMS 385"]
