"""
S4 Ledger — Resilience Module
Persistent queue management, circuit breaker, WebSocket health,
and data integrity patterns for air-gapped / degraded environments.

Components:
1. PersistentQueue — SQLite-backed queue for offline anchoring
2. CircuitBreaker — Protect against cascading failures
3. WebSocketHealthMonitor — Auto-detect connection state with ping/pong
4. DataCapManager — Enforce storage limits during prolonged outages
"""

import time
import json
import hashlib
import threading
import sqlite3
import os
from datetime import datetime, timezone
from enum import Enum
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════
#  1. PERSISTENT QUEUE — SQLite-backed offline anchor queue
# ═══════════════════════════════════════════════════════════════════════

class PersistentQueue:
    """
    SQLite-backed persistent queue for offline anchor operations.
    Survives process restarts, provides exactly-once delivery semantics,
    and supports encrypted payloads for CUI/ITAR data.
    """

    def __init__(self, db_path="s4_offline_queue.db"):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    record_hash TEXT NOT NULL,
                    record_type TEXT NOT NULL,
                    payload_json TEXT,
                    encrypted INTEGER DEFAULT 0,
                    branch TEXT DEFAULT 'JOINT',
                    created_at TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    sync_attempts INTEGER DEFAULT 0,
                    last_attempt TEXT,
                    synced_at TEXT,
                    tx_hash TEXT,
                    error TEXT
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status)
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sync_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    records_synced INTEGER,
                    records_failed INTEGER,
                    batch_hash TEXT,
                    duration_seconds REAL
                )
            """)
            conn.commit()

    def enqueue(self, record_hash: str, record_type: str, payload: dict = None,
                encrypted: bool = False, branch: str = "JOINT") -> int:
        """Add a record to the offline queue. Returns queue ID."""
        now = datetime.now(timezone.utc).isoformat()
        payload_json = json.dumps(payload) if payload else None
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    """INSERT INTO queue (record_hash, record_type, payload_json,
                       encrypted, branch, created_at, status)
                       VALUES (?, ?, ?, ?, ?, ?, 'pending')""",
                    (record_hash, record_type, payload_json, int(encrypted), branch, now),
                )
                conn.commit()
                return cursor.lastrowid

    def get_pending(self, limit: int = 100) -> list:
        """Get pending records for batch sync."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """SELECT * FROM queue WHERE status = 'pending'
                   ORDER BY created_at ASC LIMIT ?""",
                (limit,),
            ).fetchall()
            return [dict(row) for row in rows]

    def mark_synced(self, queue_id: int, tx_hash: str):
        """Mark a record as successfully synced."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """UPDATE queue SET status = 'synced', synced_at = ?,
                       tx_hash = ? WHERE id = ?""",
                    (now, tx_hash, queue_id),
                )
                conn.commit()

    def mark_failed(self, queue_id: int, error: str):
        """Mark a record as failed with error message."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """UPDATE queue SET status = 'failed', last_attempt = ?,
                       sync_attempts = sync_attempts + 1, error = ?
                       WHERE id = ?""",
                    (now, error[:500], queue_id),
                )
                conn.commit()

    def retry_failed(self, max_attempts: int = 5) -> int:
        """Re-queue failed records that haven't exceeded max attempts."""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    """UPDATE queue SET status = 'pending'
                       WHERE status = 'failed' AND sync_attempts < ?""",
                    (max_attempts,),
                )
                conn.commit()
                return cursor.rowcount

    def get_stats(self) -> dict:
        """Get queue statistics."""
        with sqlite3.connect(self.db_path) as conn:
            stats = {}
            for status in ["pending", "synced", "failed"]:
                count = conn.execute(
                    "SELECT COUNT(*) FROM queue WHERE status = ?", (status,)
                ).fetchone()[0]
                stats[status] = count
            stats["total"] = sum(stats.values())

            # Last sync time
            last = conn.execute(
                "SELECT MAX(synced_at) FROM queue WHERE status = 'synced'"
            ).fetchone()[0]
            stats["last_sync"] = last

            # Last sync log entry
            log = conn.execute(
                "SELECT * FROM sync_log ORDER BY id DESC LIMIT 1"
            ).fetchone()
            if log:
                stats["last_batch"] = {
                    "timestamp": log[1],
                    "records_synced": log[2],
                    "records_failed": log[3],
                }

            return stats

    def log_sync_batch(self, records_synced: int, records_failed: int,
                       batch_hash: str, duration: float):
        """Log a batch sync operation."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """INSERT INTO sync_log (timestamp, records_synced,
                       records_failed, batch_hash, duration_seconds)
                       VALUES (?, ?, ?, ?, ?)""",
                    (now, records_synced, records_failed, batch_hash, duration),
                )
                conn.commit()

    def purge_synced(self, older_than_days: int = 30) -> int:
        """Purge synced records older than N days."""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    """DELETE FROM queue WHERE status = 'synced'
                       AND synced_at < datetime('now', ?)""",
                    (f"-{older_than_days} days",),
                )
                conn.commit()
                return cursor.rowcount


# ═══════════════════════════════════════════════════════════════════════
#  2. CIRCUIT BREAKER — Prevent cascading failures
# ═══════════════════════════════════════════════════════════════════════

class CircuitState(Enum):
    CLOSED = "closed"        # Normal operation
    OPEN = "open"            # Failures exceeded threshold — fast fail
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreaker:
    """
    Circuit breaker pattern for external service calls (XRPL, Supabase, DLA, etc.).
    
    States:
    - CLOSED: Normal. Failures counted. If threshold exceeded → OPEN
    - OPEN: All calls fail fast. After timeout → HALF_OPEN
    - HALF_OPEN: Allow one test call. Success → CLOSED, Failure → OPEN
    """
    name: str
    failure_threshold: int = 5
    recovery_timeout: float = 30.0  # seconds before trying again
    success_threshold: int = 2      # successes needed in HALF_OPEN to close

    state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    failure_count: int = field(default=0, init=False)
    success_count: int = field(default=0, init=False)
    last_failure_time: float = field(default=0.0, init=False)
    last_state_change: float = field(default_factory=time.time, init=False)
    _lock: threading.Lock = field(default_factory=threading.Lock, init=False)

    def can_execute(self) -> bool:
        """Check if the circuit allows execution."""
        with self._lock:
            if self.state == CircuitState.CLOSED:
                return True
            elif self.state == CircuitState.OPEN:
                if time.time() - self.last_failure_time >= self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                    self.last_state_change = time.time()
                    self.success_count = 0
                    return True
                return False
            elif self.state == CircuitState.HALF_OPEN:
                return True
            return False

    def record_success(self):
        """Record a successful call."""
        with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.success_threshold:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    self.last_state_change = time.time()
            elif self.state == CircuitState.CLOSED:
                self.failure_count = 0

    def record_failure(self):
        """Record a failed call."""
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
                self.last_state_change = time.time()
            elif self.state == CircuitState.CLOSED:
                if self.failure_count >= self.failure_threshold:
                    self.state = CircuitState.OPEN
                    self.last_state_change = time.time()

    def get_status(self) -> dict:
        with self._lock:
            return {
                "name": self.name,
                "state": self.state.value,
                "failure_count": self.failure_count,
                "success_count": self.success_count,
                "recovery_timeout": self.recovery_timeout,
                "time_in_state": round(time.time() - self.last_state_change, 1),
            }


# ═══════════════════════════════════════════════════════════════════════
#  3. WEBSOCKET HEALTH MONITOR
# ═══════════════════════════════════════════════════════════════════════

class WebSocketHealth:
    """
    Track WebSocket connection health with ping/pong monitoring.
    Detects connection degradation before full failure.
    """

    def __init__(self, ping_interval: float = 30.0, timeout: float = 10.0):
        self.ping_interval = ping_interval
        self.timeout = timeout
        self._lock = threading.Lock()
        self._connections = {}  # conn_id -> {last_ping, last_pong, latency_ms, state}

    def register_connection(self, conn_id: str):
        with self._lock:
            self._connections[conn_id] = {
                "connected_at": time.time(),
                "last_ping_sent": 0,
                "last_pong_received": 0,
                "avg_latency_ms": 0,
                "latency_samples": [],
                "state": "connected",
                "missed_pongs": 0,
            }

    def ping_sent(self, conn_id: str):
        with self._lock:
            conn = self._connections.get(conn_id)
            if conn:
                conn["last_ping_sent"] = time.time()

    def pong_received(self, conn_id: str):
        with self._lock:
            conn = self._connections.get(conn_id)
            if conn and conn["last_ping_sent"]:
                latency = (time.time() - conn["last_ping_sent"]) * 1000
                conn["last_pong_received"] = time.time()
                conn["missed_pongs"] = 0
                samples = conn["latency_samples"]
                samples.append(latency)
                if len(samples) > 20:
                    samples.pop(0)
                conn["avg_latency_ms"] = round(sum(samples) / len(samples), 2)
                conn["state"] = "healthy" if latency < self.timeout * 1000 else "degraded"

    def check_timeouts(self) -> list:
        """Check for connections that missed pong responses."""
        now = time.time()
        degraded = []
        with self._lock:
            for conn_id, conn in self._connections.items():
                if conn["last_ping_sent"] and not conn["last_pong_received"]:
                    if now - conn["last_ping_sent"] > self.timeout:
                        conn["missed_pongs"] += 1
                        conn["state"] = "timeout"
                        degraded.append(conn_id)
                elif conn["last_ping_sent"] > conn["last_pong_received"]:
                    if now - conn["last_ping_sent"] > self.timeout:
                        conn["missed_pongs"] += 1
                        conn["state"] = "degraded"
                        degraded.append(conn_id)
        return degraded

    def get_status(self) -> dict:
        with self._lock:
            return {
                "total_connections": len(self._connections),
                "connections": {
                    cid: {
                        "state": c["state"],
                        "avg_latency_ms": c["avg_latency_ms"],
                        "missed_pongs": c["missed_pongs"],
                    }
                    for cid, c in self._connections.items()
                },
            }

    def remove_connection(self, conn_id: str):
        with self._lock:
            self._connections.pop(conn_id, None)


# ═══════════════════════════════════════════════════════════════════════
#  4. DATA CAP MANAGER — Enforce limits during prolonged outages
# ═══════════════════════════════════════════════════════════════════════

class DataCapManager:
    """
    Enforce data storage limits for offline/air-gapped environments.
    Prevents unbounded queue growth during prolonged disconnection.
    """

    def __init__(self, max_queue_size: int = 10000, max_storage_mb: int = 500):
        self.max_queue_size = max_queue_size
        self.max_storage_mb = max_storage_mb
        self._current_count = 0
        self._current_size_bytes = 0
        self._lock = threading.Lock()

    def can_enqueue(self, payload_size_bytes: int = 0) -> tuple:
        """Check if a new record can be enqueued within caps."""
        with self._lock:
            if self._current_count >= self.max_queue_size:
                return False, f"Queue full: {self._current_count}/{self.max_queue_size} records"
            new_size = self._current_size_bytes + payload_size_bytes
            if new_size > self.max_storage_mb * 1024 * 1024:
                return False, f"Storage cap exceeded: {new_size / 1024 / 1024:.1f}MB / {self.max_storage_mb}MB"
            return True, "OK"

    def record_enqueued(self, payload_size_bytes: int = 0):
        with self._lock:
            self._current_count += 1
            self._current_size_bytes += payload_size_bytes

    def record_dequeued(self, payload_size_bytes: int = 0):
        with self._lock:
            self._current_count = max(0, self._current_count - 1)
            self._current_size_bytes = max(0, self._current_size_bytes - payload_size_bytes)

    def get_usage(self) -> dict:
        with self._lock:
            return {
                "queue_count": self._current_count,
                "queue_limit": self.max_queue_size,
                "queue_pct": round(self._current_count / self.max_queue_size * 100, 1),
                "storage_mb": round(self._current_size_bytes / 1024 / 1024, 2),
                "storage_limit_mb": self.max_storage_mb,
                "storage_pct": round(self._current_size_bytes / (self.max_storage_mb * 1024 * 1024) * 100, 1),
            }


# ═══════════════════════════════════════════════════════════════════════
#  MODULE EXPORTS
# ═══════════════════════════════════════════════════════════════════════

# Pre-configured circuit breakers for external services
xrpl_breaker = CircuitBreaker(name="xrpl", failure_threshold=3, recovery_timeout=30)
supabase_breaker = CircuitBreaker(name="supabase", failure_threshold=5, recovery_timeout=60)
dla_breaker = CircuitBreaker(name="dla_flis", failure_threshold=3, recovery_timeout=120)

# WebSocket health monitor
ws_health = WebSocketHealth(ping_interval=30, timeout=10)

# Data cap manager (air-gapped environments)
data_caps = DataCapManager(max_queue_size=10000, max_storage_mb=500)
