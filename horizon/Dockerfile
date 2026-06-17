# HORIZON — container image
# Multi-stage kept simple on purpose. Replit lift-and-shift won't use
# this; it's for direct Docker/Cloud Run/Fly deploys.

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HORIZON_MODE=dev \
    HORIZON_HOST=0.0.0.0 \
    HORIZON_PORT=8088

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the whole HORIZON tree
COPY . /app

EXPOSE 8088

# Honor HORIZON_PORT at runtime
CMD ["sh", "-c", "uvicorn src.server:app --host ${HORIZON_HOST} --port ${HORIZON_PORT}"]
