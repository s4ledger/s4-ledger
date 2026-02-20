# Deployment Guide: S4 Ledger

## Production Deployment (Vercel)

S4 Ledger is deployed on **Vercel** with a Python serverless API and static frontend.

### Architecture
- **Frontend:** `demo-app/index.html` — Single-page application (Bootstrap 5, Chart.js, custom JS)
- **API:** `api/index.py` — Python serverless function (BaseHTTPRequestHandler, 63 endpoints)
- **Config:** `vercel.json` — Route rewrites (63 API routes), security headers (CSP, HSTS, X-Frame-Options)
- **SDK:** `s4_sdk.py` — Python SDK (38+ functions)

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

All 63 API routes in `vercel.json` rewrite to the single `/api` Python function. See [vercel.json](vercel.json) for the complete list.

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