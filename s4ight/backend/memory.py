"""
S4ight Memory Module
Conversation memory for multi-turn context. In-process, per-session keyed by session_id.
Replace with Redis / vector memory for multi-instance prod deployments.
"""

from typing import Dict, List, Optional
from threading import RLock
import time

from config import MAX_HISTORY_TURNS


class ConversationMemory:
    """Single-session sliding-window memory."""

    def __init__(self, max_turns: int = MAX_HISTORY_TURNS):
        self.history: List[Dict] = []
        self.max_turns = max_turns
        self.created_at = time.time()
        self.last_active = time.time()

    def add_turn(
        self,
        role: str,
        content: str,
        program: Optional[str] = None,
        agent: Optional[str] = None,
    ) -> None:
        self.history.append(
            {
                "role": role,
                "content": content,
                "program": program,
                "agent": agent,
                "ts": time.time(),
            }
        )
        self.last_active = time.time()
        # Keep last (max_turns * 2) entries so we retain both sides of N exchanges.
        cap = self.max_turns * 2
        if len(self.history) > cap:
            self.history = self.history[-cap:]

    def get_context(self, max_chars: int = 2000) -> str:
        if not self.history:
            return ""
        lines = []
        for turn in self.history[-(self.max_turns * 2):]:
            tag = turn.get("agent") or turn["role"]
            prefix = f"[{tag}"
            if turn.get("program"):
                prefix += f" | {turn['program']}"
            prefix += "]: "
            lines.append(prefix + turn["content"][:400])
        joined = "\n".join(lines)
        return joined[-max_chars:]

    def clear(self) -> None:
        self.history = []


class MemoryStore:
    """Thread-safe map of session_id -> ConversationMemory."""

    def __init__(self):
        self._sessions: Dict[str, ConversationMemory] = {}
        self._lock = RLock()

    def get(self, session_id: str) -> ConversationMemory:
        with self._lock:
            mem = self._sessions.get(session_id)
            if mem is None:
                mem = ConversationMemory()
                self._sessions[session_id] = mem
            return mem

    def clear(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)

    def prune(self, max_age_s: int = 60 * 60 * 6) -> int:
        """Drop sessions idle longer than max_age_s. Returns number pruned."""
        cutoff = time.time() - max_age_s
        with self._lock:
            stale = [sid for sid, m in self._sessions.items() if m.last_active < cutoff]
            for sid in stale:
                self._sessions.pop(sid, None)
            return len(stale)


# Global stores
store = MemoryStore()

# Backwards-compatible single global memory (used by legacy agent code paths).
memory = ConversationMemory()
