# Deployment Guide: S4 Ledger

## Production Deployment (Vercel)

S4 Ledger is deployed on **Vercel** with a Python serverless API and static frontend.

### Architecture
- **Frontend:** `demo-app/index.html` — Single-page application (Bootstrap 5, Chart.js, custom JS)
- **API:** `api/index.py` — Python serverless function (BaseHTTPRequestHandler, 65 endpoints)
- **Config:** `vercel.json` — Route rewrites (65 API routes), security headers (CSP, HSTS, X-Frame-Options)
- **SDK:** `s4_sdk.py` — Python SDK (37 functions)

### Quick Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables (Vercel Dashboard → Settings → Environment Variables)

| Variable | Required | Description |
|---|---|---|
| `XRPL_SEED` | Yes | XRPL wallet seed for anchoring (secp256k1) |
| `S4_API_MASTER_KEY` | Yes | Master API key for admin access |
| `OPENAI_API_KEY` | Recommended | OpenAI API key for AI assistant |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key (fallback) |
| `AZURE_OPENAI_ENDPOINT` | Optional | Azure OpenAI endpoint |
| `AZURE_OPENAI_KEY` | Optional | Azure OpenAI key |
| `AZURE_OPENAI_DEPLOYMENT` | Optional | Azure OpenAI deployment name |
| `SUPABASE_URL` | Optional | Supabase project URL (for persistence) |
| `SUPABASE_ANON_KEY` | Optional | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | Optional | Supabase service key (server-side) |
| `S4_MODE` | Optional | Set to `offline` for air-gapped mode |

### Security Headers (configured in vercel.json)

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy` — Restricts scripts, styles, fonts, images, and connections
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self)`

### Route Rewrites

All 65 API routes in `vercel.json` rewrite to the single `/api` Python function. See [vercel.json](vercel.json) for the complete list.

---

## Local Development

```bash
# Clone the repo
git clone https://github.com/s4ledger/s4-ledger.git
cd s4-ledger

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# Local server (Vercel dev)
vercel dev
```

### Docker

```bash
docker build -t s4-ledger-sdk .
docker run -p 3000:3000 s4-ledger-sdk
```

---

## Offline / On-Prem Deployment

For air-gapped, SCIF, or shipboard environments:

1. Deploy the application on an internal server (Docker or bare metal)
2. Set `S4_MODE=offline` environment variable
3. Hashes are queued locally (client-side: localStorage, server-side: in-memory)
4. When connectivity is restored, run `POST /api/offline/sync` to batch-anchor all queued hashes
5. Monitor queue status via `GET /api/offline/queue`

---

## Partner Integration
- See [PARTNER_ONBOARDING.md](PARTNER_ONBOARDING.md) for step-by-step integration
- See [api_examples.md](api_examples.md) for API usage examples
- See [INTEGRATIONS.md](INTEGRATIONS.md) for supported system integrations
- Contact info@s4ledger.com for onboarding

## Troubleshooting
- See [README.md](README.md) for common issues and solutions
- Check `/api/health` for API status
- Check `/api/xrpl-status` for XRPL connectivity
- Check `/api/security/dependency-audit` for package security

---

## Kubernetes Deployment (Production)

For production-scale deployments, S4 Ledger includes Kubernetes manifests in the `k8s/` directory:

### Files
| File | Purpose |
|------|---------|
| `k8s/deployment.yaml` | Deployment (3 replicas), HPA (3-25 pods), Redis, ServiceMonitor |
| `k8s/prometheus.yaml` | Prometheus scrape configuration |
| `k8s/alerts.yaml` | Alert rules: availability, XRPL health, queue depth, SLOs |
| `k8s/grafana-dashboard.yaml` | Pre-built Grafana dashboard ConfigMap |

### Quick Start
```bash
kubectl create namespace s4-ledger
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/prometheus.yaml
kubectl apply -f k8s/alerts.yaml
kubectl apply -f k8s/grafana-dashboard.yaml
```

### Monitoring
- **Prometheus** scrapes `/api/metrics/prometheus` on port 8000
- **Grafana** dashboard auto-provisions via ConfigMap
- **Alerts** fire to AlertManager for email/Slack/PagerDuty routing

### Scaling
- HPA scales from 3 to 25 pods based on CPU, memory, and custom `s4_anchor_queue_depth` metric
- Redis sidecar provides queue persistence and caching
- Scale-up: 50% increase per 60s. Scale-down: 25% decrease per 120s.

### Backend Modules
New production-ready Python modules available:

| Module | Purpose |
|--------|---------|
| `ai/` | Intent detection, entity extraction, anomaly detection, federated learning stubs |
| `monitoring/` | Prometheus metrics, XRPL health monitor, alert manager |
| `resilience/` | Circuit breakers, persistent queue (SQLite), WebSocket health, data caps |
| `interop/` | OpenAPI 3.1 spec, gRPC proto, MIL-STD XML parsing, ERP adapters |
| `security/` | Enhanced ZKP (Pedersen), HSM stubs, RBAC enforcer, dependency auditor, OWASP headers |

### gRPC
Proto definitions available at `interop/s4_ledger.proto` for high-performance system-to-system integration.


---

## v12 Deployment Notes (2026-02-22)
- New SBOM panel requires no additional dependencies (uses built-in component database)
- AI Threat Scoring auto-activates when Risk Engine loads
- Failure Timeline requires Chart.js (already included)
- Zero-Trust Watermark automatically wraps all CSV exports
- 21 new Navy programs add ~200 lines to PROGS object
- Collaboration indicators are simulation-only in demo mode
