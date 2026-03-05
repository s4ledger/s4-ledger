import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * S4 Ledger — API Load Test
 *
 * Tests the serverless API under concurrent load.
 * Validates response times, error rates, and throughput.
 *
 * Prerequisites:
 *   brew install k6   (macOS)
 *   # or: https://grafana.com/docs/k6/latest/set-up/install-k6/
 *
 * Run locally (against Vercel preview or production):
 *   k6 run load-tests/k6-api-load.js
 *
 * Run against local dev server:
 *   k6 run -e BASE_URL=http://localhost:8080 load-tests/k6-api-load.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://s4ledger.com';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency', true);

// ─── Test Stages ────────────────────────────────────────────────────
// Ramp up to 50 concurrent users, sustain, then ramp down.
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm-up: 0 → 10 users
    { duration: '1m',  target: 25 },   // Ramp: 10 → 25 users
    { duration: '2m',  target: 50 },   // Sustained: 50 concurrent users
    { duration: '1m',  target: 25 },   // Cool-down: 50 → 25
    { duration: '30s', target: 0 },    // Drain: 25 → 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95th percentile < 3s
    errors: ['rate<0.05'],              // Error rate < 5%
    api_latency: ['p(99)<5000'],        // 99th percentile < 5s
  },
};

// ─── Test Scenarios ─────────────────────────────────────────────────

export default function () {
  group('Static Assets', () => {
    // Prod-app landing page
    const prodRes = http.get(`${BASE_URL}/prod-app/dist/index.html`);
    check(prodRes, {
      'prod-app loads (200)': (r) => r.status === 200,
      'prod-app has content': (r) => r.body.length > 1000,
    });
    errorRate.add(prodRes.status !== 200);
    apiLatency.add(prodRes.timings.duration);

    // Demo-app landing page
    const demoRes = http.get(`${BASE_URL}/demo-app/dist/index.html`);
    check(demoRes, {
      'demo-app loads (200)': (r) => r.status === 200,
    });
    errorRate.add(demoRes.status !== 200);
  });

  sleep(0.5);

  group('API Endpoints', () => {
    // Health check / metrics
    const metricsRes = http.get(`${BASE_URL}/api?action=metrics`);
    check(metricsRes, {
      'metrics returns 200': (r) => r.status === 200,
      'metrics has JSON body': (r) => {
        try { JSON.parse(r.body); return true; } catch { return false; }
      },
    });
    errorRate.add(metricsRes.status !== 200);
    apiLatency.add(metricsRes.timings.duration);

    sleep(0.3);

    // Records list
    const recordsRes = http.get(`${BASE_URL}/api?action=records`);
    check(recordsRes, {
      'records returns 200': (r) => r.status === 200,
    });
    errorRate.add(recordsRes.status !== 200);
    apiLatency.add(recordsRes.timings.duration);

    sleep(0.3);

    // Verify endpoint (with a sample hash)
    const sampleHash = 'a'.repeat(64);
    const verifyRes = http.get(`${BASE_URL}/api?action=verify&hash=${sampleHash}`);
    check(verifyRes, {
      'verify returns response': (r) => r.status === 200 || r.status === 404,
    });
    apiLatency.add(verifyRes.timings.duration);
  });

  sleep(0.5);

  group('Anchor Simulation', () => {
    // Simulate anchor request (POST)
    const payload = JSON.stringify({
      action: 'anchor',
      record_type: 'LOAD_TEST',
      data: `load-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });

    const anchorRes = http.post(`${BASE_URL}/api`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(anchorRes, {
      'anchor returns valid response': (r) => r.status === 200 || r.status === 201 || r.status === 401,
    });
    apiLatency.add(anchorRes.timings.duration);
  });

  sleep(1);
}
