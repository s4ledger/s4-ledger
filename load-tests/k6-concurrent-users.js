import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * S4 Ledger — Concurrent User Stress Test
 *
 * Simulates realistic multi-user workflows:
 *   - Page load & auth flow
 *   - Record browsing
 *   - Hash verification
 *   - Concurrent anchoring
 *
 * Run:
 *   k6 run load-tests/k6-concurrent-users.js
 *   k6 run -e BASE_URL=http://localhost:8080 load-tests/k6-concurrent-users.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://s4ledger.com';

const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time', true);
const apiCallTime = new Trend('api_call_time', true);
const anchorOps = new Counter('anchor_operations');

export const options = {
  scenarios: {
    // Scenario 1: Steady browsing users
    browsers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '2m',  target: 20 },
        { duration: '30s', target: 0 },
      ],
      exec: 'browsingUser',
    },
    // Scenario 2: Power users doing anchoring
    anchors: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m',  target: 10 },
        { duration: '30s', target: 0 },
      ],
      exec: 'anchoringUser',
    },
    // Scenario 3: Spike test — sudden burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 0 },
        { duration: '10s', target: 100 },   // Spike to 100
        { duration: '30s', target: 100 },   // Sustain
        { duration: '10s', target: 0 },     // Drop
      ],
      startTime: '3m',  // Start after main scenarios
      exec: 'spikeUser',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    errors: ['rate<0.10'],
    page_load_time: ['p(95)<4000'],
    api_call_time: ['p(95)<3000'],
  },
};

// ─── Scenario: Browsing User ────────────────────────────────────────

export function browsingUser() {
  group('Browse Flow', () => {
    // Load landing page
    const pageRes = http.get(`${BASE_URL}/prod-app/dist/index.html`);
    check(pageRes, { 'page loads': (r) => r.status === 200 });
    pageLoadTime.add(pageRes.timings.duration);
    errorRate.add(pageRes.status !== 200);

    sleep(2);

    // Fetch records
    const recordsRes = http.get(`${BASE_URL}/api?action=records`);
    check(recordsRes, { 'records fetched': (r) => r.status === 200 });
    apiCallTime.add(recordsRes.timings.duration);

    sleep(1);

    // Fetch metrics
    const metricsRes = http.get(`${BASE_URL}/api?action=metrics`);
    check(metricsRes, { 'metrics fetched': (r) => r.status === 200 });
    apiCallTime.add(metricsRes.timings.duration);
  });

  sleep(3);
}

// ─── Scenario: Anchoring User ───────────────────────────────────────

export function anchoringUser() {
  group('Anchor Flow', () => {
    // Load page
    const pageRes = http.get(`${BASE_URL}/prod-app/dist/index.html`);
    check(pageRes, { 'page loads': (r) => r.status === 200 });
    errorRate.add(pageRes.status !== 200);

    sleep(1);

    // Anchor a record
    const payload = JSON.stringify({
      action: 'anchor',
      record_type: 'LOAD_TEST_CONCURRENT',
      data: `concurrent-${__VU}-${__ITER}-${Date.now()}`,
    });

    const anchorRes = http.post(`${BASE_URL}/api`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(anchorRes, {
      'anchor accepted': (r) => r.status === 200 || r.status === 201 || r.status === 401,
    });
    apiCallTime.add(anchorRes.timings.duration);
    anchorOps.add(1);

    sleep(2);

    // Verify the record
    const verifyRes = http.get(`${BASE_URL}/api?action=verify&hash=${'b'.repeat(64)}`);
    check(verifyRes, {
      'verify responds': (r) => r.status === 200 || r.status === 404,
    });
    apiCallTime.add(verifyRes.timings.duration);
  });

  sleep(5);
}

// ─── Scenario: Spike User ───────────────────────────────────────────

export function spikeUser() {
  const pageRes = http.get(`${BASE_URL}/prod-app/dist/index.html`);
  check(pageRes, { 'spike: page loads': (r) => r.status === 200 });
  pageLoadTime.add(pageRes.timings.duration);
  errorRate.add(pageRes.status !== 200);
  sleep(0.5);
}
