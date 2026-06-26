#!/usr/bin/env bash
# Convenience launcher for S4ight.
# Usage:  ./run.sh   (from inside the s4ight/ folder)

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/backend"

# Auto-load .env if present (without requiring python-dotenv).
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Use the project venv if it exists.
if [[ -x "$HERE/.venv/bin/python" ]]; then
  PY="$HERE/.venv/bin/python"
else
  PY="$(command -v python3 || command -v python)"
fi

echo "Starting S4ight on http://localhost:${S4IGHT_API_PORT:-8000}"
exec "$PY" main.py
