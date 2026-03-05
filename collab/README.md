# S4 Ledger — Real-Time Collaboration Backend

## Architecture

The S4 Ledger real-time collaboration system enables multiple analysts to work in the same workspace simultaneously, with live indicators for presence, anchoring events, and tool state changes.

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Analyst A   │    │  Analyst B   │    │  Analyst C   │
│  (Browser)   │    │  (Browser)   │    │  (Browser)   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │ WebSocket         │ WebSocket         │ WebSocket
       └───────────────────┼───────────────────┘
                           │
                ┌──────────▼──────────┐
                │  WebSocket Server   │
                │  (collab/ws_server) │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │   Supabase          │
                │   (persistence)     │
                └─────────────────────┘
```

## Frontend Client

The `S4Realtime` client is already implemented in `prod-app/src/js/enhancements.js`:

- Auto-reconnect with exponential backoff (1s → 30s, max 10 attempts)
- Heartbeat keep-alive (25s intervals)
- Message queue for offline conditions
- Event types: `user-joined`, `user-left`, `anchor-event`, `tool-update`
- Fallback to polling when WebSocket is unavailable

## Backend Server

`collab/ws_server.py` provides the WebSocket server:

- Pure Python using `websockets` library (no socket.io dependency)
- Workspace-scoped rooms (up to 50 concurrent users per workspace)
- Heartbeat/pong responses matching frontend expectations
- Broadcast architecture for real-time events
- Automatic cleanup on disconnect

## Running Locally

```bash
# Install dependency
pip install websockets

# Start the server
python collab/ws_server.py

# Custom port
WS_PORT=9000 python collab/ws_server.py
```

The server runs on `ws://localhost:8765` by default.

## Deployment Options

### Option 1: Fly.io (Recommended for WebSocket)

```bash
# fly.toml
fly launch --name s4-collab
fly deploy
```

Fly.io natively supports persistent WebSocket connections with global edge deployment.

### Option 2: Railway / Render

Both support long-running Python processes with WebSocket support.

### Option 3: Supabase Realtime (Recommended for Production)

For production, leverage **Supabase Realtime** instead of a custom WebSocket server:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Subscribe to workspace events
const channel = supabase.channel('workspace:default')
  .on('broadcast', { event: 'anchor-event' }, (payload) => {
    console.log('Anchor event:', payload);
  })
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Online users:', state);
  })
  .subscribe();

// Track presence
channel.track({ user: 'analyst-1', role: 'admin' });

// Broadcast events
channel.send({
  type: 'broadcast',
  event: 'anchor-event',
  payload: { record_type: 'NAVSUP_RECEIPT', hash: '...' },
});
```

Supabase Realtime is already included in your Supabase plan and eliminates the need for a separate WebSocket server deployment.

### Why Not Vercel?

Vercel serverless functions are stateless and time-limited (max 60s on Pro). They cannot maintain persistent WebSocket connections. Solutions:

1. Use Supabase Realtime (no extra server needed)
2. Deploy `ws_server.py` on Fly.io/Railway (separate service)
3. Use Vercel Edge Functions with Durable Objects (requires Cloudflare)

## Message Protocol

All messages are JSON with a `type` field:

### Client → Server

```json
{ "type": "join", "session_id": "s4_xxx", "workspace_id": "default", "user": { "name": "...", "role": "admin" } }
{ "type": "leave" }
{ "type": "ping" }
{ "type": "anchor-event", "record_type": "NAVSUP_RECEIPT", "record_hash": "abc...", "tx_hash": "DEF..." }
{ "type": "tool-update", "tool": "hash-generator", "state": { "active": true } }
```

### Server → Client

```json
{ "type": "workspace-state", "members": [...], "workspace_id": "default" }
{ "type": "user-joined", "session_id": "s4_xxx", "user": {...}, "members": [...] }
{ "type": "user-left", "session_id": "s4_xxx", "members": [...] }
{ "type": "anchor-event", "session_id": "s4_xxx", "record_type": "...", "record_hash": "..." }
{ "type": "tool-update", "session_id": "s4_xxx", "tool": "...", "state": {...} }
{ "type": "pong", "timestamp": 1234567890 }
{ "type": "error", "message": "..." }
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_PORT` | 8765 | WebSocket server port |
| `WS_HOST` | 0.0.0.0 | Bind address |

## Security Notes

- The WebSocket server should be deployed behind a reverse proxy (nginx/Caddy) with TLS termination
- In production, add JWT token validation on the `join` message
- Rate limiting is enforced via `MAX_CONNECTIONS_PER_WORKSPACE` (50) and `MAX_MESSAGE_SIZE` (64 KB)
- No sensitive data flows through WebSocket — only presence indicators and event notifications
