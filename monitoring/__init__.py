"""
S4 Ledger — Metrics & Monitoring Module
Prometheus-compatible metrics export for XRPL anchoring, AI agent,
queue depth, wallet economy, and platform health.

Usage in api/index.py:
    from monitoring.metrics import metrics
    metrics.anchor_started()
    metrics.anchor_completed(duration_seconds=2.3, success=True)
    metrics.ai_query(duration_seconds=1.5, success=True)
    metrics.record_queue_depth(150)
"""

import time
import threading
from collections import defaultdict


class S4Metrics:
    """Thread-safe Prometheus-style metrics collector for S4 Ledger."""

    def __init__(self):
        self._lock = threading.Lock()
        # Counters
        self._counters = defaultdict(float)
        # Gauges
        self._gauges = defaultdict(float)
        # Histograms (store individual observations)
        self._histogram_sums = defaultdict(float)
        self._histogram_counts = defaultdict(int)
        self._histogram_buckets = {}  # metric -> sorted list of bucket boundaries
        self._histogram_bucket_counts = defaultdict(lambda: defaultdict(int))

        # Pre-define histogram buckets
        self._define_histogram("s4_anchor_duration_seconds", [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30])
        self._define_histogram("s4_verify_duration_seconds", [0.01, 0.05, 0.1, 0.25, 0.5, 1, 5])
        self._define_histogram("s4_ai_response_seconds", [0.5, 1, 2.5, 5, 10, 15, 30, 60])
        self._define_histogram("s4_http_request_seconds", [0.01, 0.05, 0.1, 0.25, 0.5, 1, 5, 10])

    def _define_histogram(self, name, buckets):
        self._histogram_buckets[name] = sorted(buckets) + [float("inf")]

    # ── Counter operations ──────────────────────────────────────────

    def inc(self, name, value=1, labels=None):
        key = self._label_key(name, labels)
        with self._lock:
            self._counters[key] += value

    def _label_key(self, name, labels):
        if not labels:
            return name
        parts = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{parts}}}"

    # ── Gauge operations ────────────────────────────────────────────

    def set_gauge(self, name, value, labels=None):
        key = self._label_key(name, labels)
        with self._lock:
            self._gauges[key] = value

    def inc_gauge(self, name, value=1, labels=None):
        key = self._label_key(name, labels)
        with self._lock:
            self._gauges[key] = self._gauges.get(key, 0) + value

    # ── Histogram operations ────────────────────────────────────────

    def observe(self, name, value, labels=None):
        key = self._label_key(name, labels)
        buckets = self._histogram_buckets.get(name, [float("inf")])
        with self._lock:
            self._histogram_sums[key] += value
            self._histogram_counts[key] += 1
            for b in buckets:
                if value <= b:
                    self._histogram_bucket_counts[key][b] += 1

    # ── High-level convenience methods ──────────────────────────────

    def anchor_started(self):
        self.inc("s4_anchors_total")
        self.inc_gauge("s4_anchor_queue_depth")

    def anchor_completed(self, duration_seconds, success=True):
        self.inc_gauge("s4_anchor_queue_depth", -1)
        self.observe("s4_anchor_duration_seconds", duration_seconds)
        if success:
            self.inc("s4_anchors_success_total")
        else:
            self.inc("s4_anchors_failed_total")

    def verify_completed(self, duration_seconds, tamper_detected=False):
        self.inc("s4_verifications_total")
        self.observe("s4_verify_duration_seconds", duration_seconds)
        if tamper_detected:
            self.inc("s4_tamper_detected_total")

    def ai_query(self, duration_seconds, success=True, tool_context="general"):
        self.inc("s4_ai_queries_total", labels={"tool": tool_context})
        self.observe("s4_ai_response_seconds", duration_seconds)
        if not success:
            self.inc("s4_ai_query_errors_total", labels={"tool": tool_context})

    def http_request(self, method, endpoint, status_code, duration_seconds):
        labels = {"method": method, "endpoint": endpoint, "status": str(status_code)}
        self.inc("s4_http_requests_total", labels=labels)
        self.observe("s4_http_request_seconds", duration_seconds, labels={"method": method})
        if status_code >= 400:
            self.inc("s4_http_errors_total", labels=labels)

    def record_queue_depth(self, depth):
        self.set_gauge("s4_anchor_queue_depth", depth)

    def record_offline_queue(self, pending, synced):
        self.set_gauge("s4_offline_queue_pending", pending)
        self.set_gauge("s4_offline_queue_synced", synced)

    def record_treasury_balance(self, xrp_balance, sls_balance=0):
        self.set_gauge("s4_treasury_xrp_balance", xrp_balance)
        self.set_gauge("s4_treasury_sls_balance", sls_balance)

    def sls_fee_collected(self, amount=0.01):
        self.inc("s4_sls_fees_collected_total", amount)

    def record_xrpl_health(self, validator, healthy, fee_drops=12):
        self.set_gauge("s4_xrpl_validator_healthy", 1 if healthy else 0, labels={"validator": validator})
        self.set_gauge("s4_xrpl_last_fee_drops", fee_drops, labels={"validator": validator})

    def webhook_delivered(self, event, success=True):
        self.inc("s4_webhooks_total", labels={"event": event})
        if not success:
            self.inc("s4_webhook_failures_total", labels={"event": event})

    # ── Prometheus exposition format ────────────────────────────────

    def export_prometheus(self):
        """Export all metrics in Prometheus text exposition format."""
        lines = []
        lines.append("# S4 Ledger Metrics")
        lines.append(f"# Generated at {time.time()}")
        lines.append("")

        with self._lock:
            # Counters
            for key, value in sorted(self._counters.items()):
                lines.append(f"{key} {value}")

            # Gauges
            for key, value in sorted(self._gauges.items()):
                lines.append(f"{key} {value}")

            # Histograms
            exported_histograms = set()
            for key in sorted(self._histogram_counts.keys()):
                base_name = key.split("{")[0] if "{" in key else key
                if base_name not in exported_histograms:
                    lines.append(f"# TYPE {base_name} histogram")
                    exported_histograms.add(base_name)

                buckets = self._histogram_buckets.get(base_name, [float("inf")])
                cumulative = 0
                for b in buckets:
                    cumulative += self._histogram_bucket_counts[key].get(b, 0)
                    le = "+Inf" if b == float("inf") else str(b)
                    bucket_key = key.replace("}", f',le="{le}"}}') if "{" in key else f'{key}{{le="{le}"}}'
                    lines.append(f"{bucket_key} {cumulative}")

                lines.append(f"{key}_sum {self._histogram_sums[key]}")
                lines.append(f"{key}_count {self._histogram_counts[key]}")

        lines.append("")
        return "\n".join(lines)

    def export_json(self):
        """Export metrics as JSON (for /api/metrics/prometheus endpoint)."""
        with self._lock:
            return {
                "counters": dict(self._counters),
                "gauges": dict(self._gauges),
                "histograms": {
                    k: {
                        "sum": self._histogram_sums[k],
                        "count": self._histogram_counts[k],
                    }
                    for k in self._histogram_counts
                },
            }


# Singleton instance
metrics = S4Metrics()
