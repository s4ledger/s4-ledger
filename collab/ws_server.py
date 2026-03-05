"""
S4 Ledger — Real-Time Collaboration WebSocket Server

Standalone WebSocket server for multi-user workspace collaboration.
Handles presence, anchor events, tool updates, and heartbeat.

The frontend S4Realtime client (prod-app/src/js/enhancements.js) connects
to /ws/collab — this server provides the backend for that connection.

Deployment Options:
  1. Standalone: python collab/ws_server.py (port 8765)
  2. Docker: docker build -f collab/Dockerfile -t s4-collab .
  3. Fly.io / Railway / Render: Deploy as a long-running process
  4. Supabase Realtime (recommended for production — see README.md)

Requirements:
  pip install websockets

Usage:
  python collab/ws_server.py
  # or with custom port:
  WS_PORT=9000 python collab/ws_server.py
"""

import asyncio
import json
import logging
import os
import time
import secrets

try:
    import websockets
except ImportError:
    print("ERROR: websockets package required. Install with: pip install websockets")
    raise SystemExit(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("s4-collab")

# ─── Configuration ───────────────────────────────────────────────────

WS_PORT = int(os.environ.get("WS_PORT", 8765))
WS_HOST = os.environ.get("WS_HOST", "0.0.0.0")
HEARTBEAT_INTERVAL = 25  # seconds — matches frontend
MAX_CONNECTIONS_PER_WORKSPACE = 50
MAX_MESSAGE_SIZE = 64 * 1024  # 64 KB

# ─── State ───────────────────────────────────────────────────────────

# workspace_id -> { session_id -> { ws, user_info, last_active } }
workspaces: dict[str, dict[str, dict]] = {}

# ─── Helpers ─────────────────────────────────────────────────────────


def _workspace_members(workspace_id: str) -> list[dict]:
    """Return list of active members in a workspace."""
    if workspace_id not in workspaces:
        return []
    members = []
    for sid, info in workspaces[workspace_id].items():
        members.append({
            "session_id": sid,
            "user": info.get("user_info", {}),
            "last_active": info.get("last_active", 0),
        })
    return members


async def _broadcast(workspace_id: str, message: dict, exclude_session: str | None = None):
    """Broadcast a message to all connections in a workspace."""
    if workspace_id not in workspaces:
        return
    payload = json.dumps(message)
    disconnected = []
    for sid, info in workspaces[workspace_id].items():
        if sid == exclude_session:
            continue
        try:
            await info["ws"].send(payload)
        except websockets.exceptions.ConnectionClosed:
            disconnected.append(sid)
    # Clean up disconnected sessions
    for sid in disconnected:
        workspaces[workspace_id].pop(sid, None)


# ─── Message Handlers ────────────────────────────────────────────────


async def handle_join(ws, workspace_id: str, session_id: str, data: dict):
    """Handle a user joining the workspace."""
    user_info = data.get("user", {"name": "Anonymous", "role": "viewer"})

    if workspace_id not in workspaces:
        workspaces[workspace_id] = {}

    if len(workspaces[workspace_id]) >= MAX_CONNECTIONS_PER_WORKSPACE:
        await ws.send(json.dumps({"type": "error", "message": "Workspace full"}))
        return

    workspaces[workspace_id][session_id] = {
        "ws": ws,
        "user_info": user_info,
        "last_active": time.time(),
    }

    # Notify others
    await _broadcast(workspace_id, {
        "type": "user-joined",
        "session_id": session_id,
        "user": user_info,
        "members": _workspace_members(workspace_id),
        "timestamp": time.time(),
    }, exclude_session=session_id)

    # Send current members to the joining user
    await ws.send(json.dumps({
        "type": "workspace-state",
        "members": _workspace_members(workspace_id),
        "workspace_id": workspace_id,
        "timestamp": time.time(),
    }))

    logger.info("User joined workspace=%s session=%s", workspace_id, session_id)


async def handle_leave(workspace_id: str, session_id: str):
    """Handle a user leaving the workspace."""
    if workspace_id in workspaces:
        user_info = workspaces[workspace_id].pop(session_id, {}).get("user_info", {})

        await _broadcast(workspace_id, {
            "type": "user-left",
            "session_id": session_id,
            "user": user_info,
            "members": _workspace_members(workspace_id),
            "timestamp": time.time(),
        })

        # Clean up empty workspaces
        if not workspaces[workspace_id]:
            del workspaces[workspace_id]

    logger.info("User left workspace=%s session=%s", workspace_id, session_id)


async def handle_anchor_event(workspace_id: str, session_id: str, data: dict):
    """Broadcast an anchor event to all workspace members."""
    await _broadcast(workspace_id, {
        "type": "anchor-event",
        "session_id": session_id,
        "record_type": data.get("record_type", "unknown"),
        "record_hash": data.get("record_hash", ""),
        "tx_hash": data.get("tx_hash", ""),
        "timestamp": time.time(),
    }, exclude_session=session_id)


async def handle_tool_update(workspace_id: str, session_id: str, data: dict):
    """Broadcast a tool state update to all workspace members."""
    await _broadcast(workspace_id, {
        "type": "tool-update",
        "session_id": session_id,
        "tool": data.get("tool", ""),
        "state": data.get("state", {}),
        "timestamp": time.time(),
    }, exclude_session=session_id)


# ─── WebSocket Handler ───────────────────────────────────────────────


async def handler(ws):
    """Main WebSocket connection handler."""
    session_id = None
    workspace_id = "default"

    try:
        async for raw in ws:
            if len(raw) > MAX_MESSAGE_SIZE:
                await ws.send(json.dumps({"type": "error", "message": "Message too large"}))
                continue

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send(json.dumps({"type": "error", "message": "Invalid JSON"}))
                continue

            msg_type = msg.get("type", "")
            workspace_id = msg.get("workspace_id", workspace_id)

            # ── Heartbeat ──
            if msg_type == "ping":
                await ws.send(json.dumps({"type": "pong", "timestamp": time.time()}))
                # Update last_active
                if workspace_id in workspaces and session_id in workspaces.get(workspace_id, {}):
                    workspaces[workspace_id][session_id]["last_active"] = time.time()
                continue

            # ── Join ──
            if msg_type == "join":
                session_id = msg.get("session_id", f"s4_{int(time.time())}_{secrets.token_hex(4)}")
                await handle_join(ws, workspace_id, session_id, msg)
                continue

            # ── Leave ──
            if msg_type == "leave":
                if session_id:
                    await handle_leave(workspace_id, session_id)
                continue

            # ── Anchor Event ──
            if msg_type == "anchor-event":
                if session_id:
                    await handle_anchor_event(workspace_id, session_id, msg)
                continue

            # ── Tool Update ──
            if msg_type == "tool-update":
                if session_id:
                    await handle_tool_update(workspace_id, session_id, msg)
                continue

            # Unknown message type
            await ws.send(json.dumps({"type": "error", "message": f"Unknown type: {msg_type}"}))

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        # Clean up on disconnect
        if session_id:
            await handle_leave(workspace_id, session_id)


# ─── Server ──────────────────────────────────────────────────────────


async def main():
    logger.info("S4 Collab WebSocket server starting on %s:%d", WS_HOST, WS_PORT)
    async with websockets.serve(handler, WS_HOST, WS_PORT, max_size=MAX_MESSAGE_SIZE):
        logger.info("Server ready. Ctrl+C to stop.")
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    asyncio.run(main())
