# Dockerfile for S4 Ledger SDK & Test Runner
FROM python:3.12-slim

# Security: run as non-root
RUN groupadd -r s4 && useradd -r -g s4 -m s4user

WORKDIR /app

# Install dependencies first (for Docker layer caching)
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dev.txt

COPY . .

# Change ownership and switch user
RUN chown -R s4user:s4 /app
USER s4user

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import s4_sdk; print('healthy')" || exit 1

# Default: run test suite
CMD ["pytest", "-v", "--tb=short"]
