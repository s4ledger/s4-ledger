# S4 Ledger — Load Testing

## Overview

Load tests validate that the S4 Ledger platform can handle production traffic levels with acceptable latency and error rates. Tests cover static asset delivery, API throughput, and concurrent user workflows.

## Prerequisites

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/):

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Test Scripts

### 1. API Load Test (`k6-api-load.js`)

Ramps from 0 → 50 concurrent users over 5 minutes. Tests:
- Static asset loading (prod-app, demo-app)
- API metrics endpoint
- Records listing
- Hash verification
- Anchor simulation

```bash
# Against production
k6 run load-tests/k6-api-load.js

# Against local server
k6 run -e BASE_URL=http://localhost:8080 load-tests/k6-api-load.js
```

### 2. Concurrent User Stress Test (`k6-concurrent-users.js`)

Three parallel scenarios simulating realistic usage patterns:
- **Browsers (20 VUs):** Page loads + record browsing
- **Anchors (10 VUs):** Record anchoring + verification
- **Spike (100 VUs):** Sudden traffic burst after 3 minutes

```bash
k6 run load-tests/k6-concurrent-users.js
```

## Performance Thresholds

| Metric | Target | Rationale |
|--------|--------|-----------|
| HTTP request duration (p95) | < 3,000 ms | API responsiveness under load |
| HTTP request duration (p99) | < 5,000 ms | Tail latency acceptable |
| Error rate | < 5% | Availability target |
| Page load time (p95) | < 4,000 ms | User experience threshold |

## Interpreting Results

k6 outputs a summary after each run:

```
     ✓ prod-app loads (200)
     ✓ metrics returns 200
     ✓ records returns 200

     checks.........................: 98.5% ✓ 4925  ✗ 75
     data_received..................: 125 MB 420 kB/s
     http_req_duration..............: avg=245ms min=18ms med=180ms max=2.1s p(90)=450ms p(95)=680ms
     http_reqs......................: 5000   16.6/s
     iteration_duration.............: avg=5.2s  min=2.1s med=4.8s  max=12.3s
     vus............................: 50     min=0    max=50
```

Key metrics to watch:
- **p(95) / p(99):** Tail latency — should stay under thresholds
- **http_reqs:** Total throughput (requests/second)
- **checks:** Percentage of passing assertions (target: > 95%)
- **errors:** Custom error rate (target: < 5%)

## CI Integration

Add to GitHub Actions:

```yaml
- name: Load Test
  uses: grafana/k6-action@v0.3.1
  with:
    filename: load-tests/k6-api-load.js
  env:
    BASE_URL: ${{ secrets.PREVIEW_URL }}
```

## Cloud Execution (Optional)

For distributed load testing from multiple regions:

```bash
# Grafana Cloud k6
k6 cloud load-tests/k6-api-load.js

# Or use k6 with InfluxDB + Grafana for local dashboards
k6 run --out influxdb=http://localhost:8086/k6 load-tests/k6-api-load.js
```
