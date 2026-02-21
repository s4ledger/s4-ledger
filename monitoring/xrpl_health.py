"""
S4 Ledger — XRPL Validator Health Monitor
Multi-validator routing with health checks, failover, and backoff retries.

Usage:
    from monitoring.xrpl_health import xrpl_monitor
    client = xrpl_monitor.get_healthy_client()
    xrpl_monitor.report_success("testnet-primary")
    xrpl_monitor.report_failure("testnet-primary")
"""

import time
import hashlib
import threading
from dataclasses import dataclass, field
from typing import Optional

# XRPL node endpoints (production + fallbacks)
XRPL_VALIDATORS = {
    "testnet": [
        {"id": "testnet-primary", "url": "https://s.altnet.rippletest.net:51234", "priority": 1},
        {"id": "testnet-fallback-1", "url": "https://testnet.xrpl-labs.com", "priority": 2},
    ],
    "mainnet": [
        {"id": "mainnet-primary", "url": "https://xrplcluster.com", "priority": 1},
        {"id": "mainnet-fullhist", "url": "https://xrpl.ws", "priority": 2},
        {"id": "mainnet-fallback", "url": "https://s1.ripple.com:51234", "priority": 3},
    ],
}


@dataclass
class ValidatorState:
    """Track health of a single XRPL validator node."""
    validator_id: str
    url: str
    priority: int
    healthy: bool = True
    consecutive_failures: int = 0
    last_success: float = 0.0
    last_failure: float = 0.0
    last_check: float = 0.0
    last_fee_drops: int = 12
    total_requests: int = 0
    total_failures: int = 0
    backoff_until: float = 0.0  # Don't retry until this timestamp


class XRPLHealthMonitor:
    """
    Multi-validator health monitor with:
    - Exponential backoff on failures
    - Automatic failover to healthy nodes
    - Priority-based routing
    - Circuit breaker pattern
    """

    MAX_CONSECUTIVE_FAILURES = 3
    BASE_BACKOFF_SECONDS = 5
    MAX_BACKOFF_SECONDS = 300  # 5 minutes max

    def __init__(self, network="testnet"):
        self.network = network
        self._lock = threading.Lock()
        self.validators: dict[str, ValidatorState] = {}
        self._init_validators()

    def _init_validators(self):
        nodes = XRPL_VALIDATORS.get(self.network, XRPL_VALIDATORS["testnet"])
        for node in nodes:
            self.validators[node["id"]] = ValidatorState(
                validator_id=node["id"],
                url=node["url"],
                priority=node["priority"],
            )

    def get_healthy_url(self) -> Optional[str]:
        """Return the highest-priority healthy validator URL, or None if all are down."""
        now = time.time()
        with self._lock:
            candidates = [
                v for v in self.validators.values()
                if v.healthy or now >= v.backoff_until
            ]
            if not candidates:
                # All in backoff — return the one closest to recovery
                candidates = sorted(self.validators.values(), key=lambda v: v.backoff_until)
                if candidates:
                    return candidates[0].url
                return None
            candidates.sort(key=lambda v: (not v.healthy, v.priority))
            return candidates[0].url

    def get_healthy_validator_id(self) -> Optional[str]:
        """Return the ID of the best validator to use."""
        now = time.time()
        with self._lock:
            candidates = [
                v for v in self.validators.values()
                if v.healthy or now >= v.backoff_until
            ]
            if not candidates:
                candidates = sorted(self.validators.values(), key=lambda v: v.backoff_until)
                return candidates[0].validator_id if candidates else None
            candidates.sort(key=lambda v: (not v.healthy, v.priority))
            return candidates[0].validator_id

    def report_success(self, validator_id: str, fee_drops: int = 12):
        """Report a successful interaction with a validator."""
        with self._lock:
            v = self.validators.get(validator_id)
            if not v:
                return
            v.healthy = True
            v.consecutive_failures = 0
            v.last_success = time.time()
            v.last_check = time.time()
            v.last_fee_drops = fee_drops
            v.total_requests += 1
            v.backoff_until = 0

    def report_failure(self, validator_id: str):
        """Report a failed interaction — triggers backoff after threshold."""
        with self._lock:
            v = self.validators.get(validator_id)
            if not v:
                return
            v.consecutive_failures += 1
            v.total_failures += 1
            v.total_requests += 1
            v.last_failure = time.time()
            v.last_check = time.time()

            if v.consecutive_failures >= self.MAX_CONSECUTIVE_FAILURES:
                v.healthy = False
                # Exponential backoff: 5s, 10s, 20s, 40s, ... up to 300s
                backoff = min(
                    self.BASE_BACKOFF_SECONDS * (2 ** (v.consecutive_failures - self.MAX_CONSECUTIVE_FAILURES)),
                    self.MAX_BACKOFF_SECONDS,
                )
                v.backoff_until = time.time() + backoff

    def get_status(self) -> dict:
        """Return health status of all validators (for /api/health and monitoring)."""
        with self._lock:
            now = time.time()
            return {
                "network": self.network,
                "validators": {
                    vid: {
                        "url": v.url,
                        "healthy": v.healthy,
                        "priority": v.priority,
                        "consecutive_failures": v.consecutive_failures,
                        "last_success_ago": round(now - v.last_success, 1) if v.last_success else None,
                        "last_failure_ago": round(now - v.last_failure, 1) if v.last_failure else None,
                        "last_fee_drops": v.last_fee_drops,
                        "total_requests": v.total_requests,
                        "total_failures": v.total_failures,
                        "backoff_remaining": max(0, round(v.backoff_until - now, 1)),
                    }
                    for vid, v in self.validators.items()
                },
                "active_validator": self.get_healthy_validator_id(),
            }


# Singleton — initialized with network from env
import os
_network = os.environ.get("XRPL_NETWORK", "testnet")
xrpl_monitor = XRPLHealthMonitor(network=_network)
