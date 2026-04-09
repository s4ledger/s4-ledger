import { useState, useEffect } from 'react'
import DraggableModal from './DraggableModal'

interface Props {
  onClose: () => void
}

interface WebhookRegistration {
  url: string
  events: string[]
  secret?: string
  id?: string
  created?: string
}

interface WebhookDelivery {
  id: string
  event: string
  url: string
  status: string
  http_status?: number
  error?: string
  last_attempt?: string
}

const API_BASE = '/api'
const VALID_EVENTS = [
  'anchor.confirmed',
  'verify.completed',
  'tamper.detected',
  'batch.completed',
  'custody.transferred',
  'sls.balance_low',
  'chain.integrity_check',
  'proof.appended',
]

const ENDPOINTS: Array<{ method: string; path: string; desc: string; auth: boolean }> = [
  { method: 'GET', path: '/api/health', desc: 'Health check & version info', auth: false },
  { method: 'GET', path: '/api/status', desc: 'System status & record counts', auth: false },
  { method: 'GET', path: '/api/metrics', desc: 'Platform metrics & analytics', auth: false },
  { method: 'GET', path: '/api/record_types', desc: 'List all 64+ record categories', auth: false },
  { method: 'GET', path: '/api/transactions', desc: 'Recent anchored transactions', auth: false },
  { method: 'GET', path: '/api/xrpl_status', desc: 'XRPL connection & wallet status', auth: false },
  { method: 'GET', path: '/api/contracts', desc: 'Contract portfolio data', auth: false },
  { method: 'GET', path: '/api/audit_reports', desc: 'Audit reports & compliance', auth: false },
  { method: 'GET', path: '/api/wallet_balance', desc: 'SLS token wallet balance', auth: true },
  { method: 'POST', path: '/api/anchor', desc: 'Anchor a record hash to XRPL', auth: true },
  { method: 'POST', path: '/api/verify', desc: 'Verify a record against its seal', auth: true },
  { method: 'POST', path: '/api/hash', desc: 'Compute SHA-256 hash of content', auth: false },
  { method: 'POST', path: '/api/webhook_register', desc: 'Register a webhook endpoint', auth: true },
  { method: 'POST', path: '/api/webhook_test', desc: 'Send a test webhook event', auth: true },
  { method: 'GET', path: '/api/webhook_list', desc: 'List registered webhooks', auth: true },
  { method: 'GET', path: '/api/webhook_deliveries', desc: 'Webhook delivery history', auth: true },
  { method: 'GET', path: '/api/proof_chain', desc: 'Full proof chain for a record', auth: true },
  { method: 'GET', path: '/api/custody_chain', desc: 'Custody transfer chain', auth: true },
  { method: 'GET', path: '/api/digital_thread', desc: 'Record digital thread lineage', auth: true },
  { method: 'POST', path: '/api/anchor_composite', desc: 'Composite hash anchor (file+metadata)', auth: true },
]

export default function IntegrationsPanel({ onClose }: Props) {
  const [tab, setTab] = useState<'api' | 'webhooks' | 'sdk'>('api')
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null)
  const [copiedSdk, setCopiedSdk] = useState(false)

  // Webhook registration
  const [webhookUrl, setWebhookUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([...VALID_EVENTS])
  const [registering, setRegistering] = useState(false)
  const [regResult, setRegResult] = useState<WebhookRegistration | null>(null)
  const [regError, setRegError] = useState<string | null>(null)

  // Webhook list & deliveries
  const [webhooks, setWebhooks] = useState<WebhookRegistration[]>([])
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [loadingHooks, setLoadingHooks] = useState(false)

  // Health check
  const [healthStatus, setHealthStatus] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.json())
      .then(setHealthStatus)
      .catch(() => setHealthStatus({ status: 'unreachable' }))
  }, [])

  async function loadWebhooks() {
    setLoadingHooks(true)
    try {
      const apiKey = localStorage.getItem('s4_api_key') || ''
      const [hookRes, delRes] = await Promise.all([
        fetch(`${API_BASE}/webhook_list`, { headers: { 'X-API-Key': apiKey } }),
        fetch(`${API_BASE}/webhook_deliveries`, { headers: { 'X-API-Key': apiKey } }),
      ])
      if (hookRes.ok) {
        const data = await hookRes.json()
        setWebhooks(data.webhooks || [])
      }
      if (delRes.ok) {
        const data = await delRes.json()
        setDeliveries(data.deliveries || data.recent || [])
      }
    } catch { /* ignore */ }
    setLoadingHooks(false)
  }

  async function handleRegisterWebhook() {
    if (!webhookUrl.trim()) return
    setRegistering(true)
    setRegError(null)
    setRegResult(null)

    try {
      const apiKey = localStorage.getItem('s4_api_key') || ''
      const res = await fetch(`${API_BASE}/webhook_register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ url: webhookUrl.trim(), events: selectedEvents }),
      })
      const data = await res.json()
      if (res.ok) {
        setRegResult(data.webhook || data)
        setWebhookUrl('')
        loadWebhooks()
      } else {
        setRegError(data.error || 'Registration failed')
      }
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Network error')
    }
    setRegistering(false)
  }

  async function handleTestWebhook() {
    try {
      const apiKey = localStorage.getItem('s4_api_key') || ''
      await fetch(`${API_BASE}/webhook_test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ event: 'anchor.confirmed' }),
      })
      setTimeout(loadWebhooks, 1000)
    } catch (err) {
      console.error('Webhook test failed:', err)
    }
  }

  function toggleEvent(event: string) {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event],
    )
  }

  function copyToClipboard(text: string, label?: string) {
    navigator.clipboard.writeText(text)
    if (label) {
      setCopiedEndpoint(label)
      setTimeout(() => setCopiedEndpoint(null), 1500)
    }
  }

  const methodColor = (m: string) =>
    m === 'GET' ? 'bg-green-100 text-green-700' : m === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'

  return (
    <DraggableModal className="bg-white border border-border rounded-card shadow-2xl" defaultWidth={680}>
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <i className="fas fa-plug text-purple-600"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">API & Integrations</h3>
              <p className="text-steel text-xs">REST API, webhooks, and SDK for external systems</p>
            </div>
          </div>
          <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* API Status */}
        <div className={`flex items-center gap-2 p-2.5 rounded-lg mb-4 ${
          healthStatus?.status === 'ok' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <i className={`fas ${healthStatus?.status === 'ok' ? 'fa-check-circle text-green-500' : 'fa-exclamation-triangle text-yellow-500'}`}></i>
          <p className="text-xs font-medium">
            {healthStatus?.status === 'ok'
              ? `API Online — ${(healthStatus as Record<string, unknown>).version || 'v2.0'} • ${(healthStatus as Record<string, unknown>).total_records || 0} records`
              : 'Checking API status…'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          {([['api', 'fa-code', 'API Reference'], ['webhooks', 'fa-bolt', 'Webhooks'], ['sdk', 'fa-terminal', 'SDK']] as const).map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); if (key === 'webhooks') loadWebhooks() }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-steel hover:text-gray-700'
              }`}
            >
              <i className={`fas ${icon} text-[10px]`}></i>
              {label}
            </button>
          ))}
        </div>

        {/* ─── API Reference Tab ──────────────────────────── */}
        {tab === 'api' && (
          <div>
            {/* API Key */}
            <div className="bg-gray-50 border border-border rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-900">API Key</p>
                <button
                  onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  className="text-[10px] text-accent hover:underline"
                >
                  {apiKeyVisible ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[10px] bg-white border border-border rounded px-2 py-1.5 font-mono text-gray-600 break-all">
                  {apiKeyVisible ? (localStorage.getItem('s4_api_key') || 'Not set — use X-API-Key header') : '••••••••••••••••••••••••'}
                </code>
                <button
                  onClick={() => copyToClipboard(localStorage.getItem('s4_api_key') || '')}
                  className="text-steel hover:text-accent transition-colors"
                  title="Copy API key"
                >
                  <i className="fas fa-copy text-xs"></i>
                </button>
              </div>
              <p className="text-[9px] text-steel mt-1.5">Set via <code className="bg-gray-200 px-1 rounded">X-API-Key</code> header on authenticated requests</p>
            </div>

            {/* Endpoints List */}
            <p className="text-xs font-semibold text-gray-900 mb-2">{ENDPOINTS.length} Endpoints</p>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {ENDPOINTS.map(ep => (
                <div
                  key={ep.path + ep.method}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
                  onClick={() => copyToClipboard(`curl -X ${ep.method} https://s4ledger.com${ep.path}${ep.auth ? ' -H "X-API-Key: YOUR_KEY"' : ''}`, ep.path)}
                >
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${methodColor(ep.method)} w-10 text-center`}>
                    {ep.method}
                  </span>
                  <code className="text-[10px] font-mono text-gray-700 flex-1">{ep.path}</code>
                  <span className="text-[9px] text-steel hidden group-hover:inline">{ep.desc}</span>
                  {ep.auth && <i className="fas fa-lock text-[8px] text-amber-400" title="Requires API key"></i>}
                  {copiedEndpoint === ep.path ? (
                    <span className="text-[9px] text-green-600 font-medium">Copied!</span>
                  ) : (
                    <i className="fas fa-copy text-[9px] text-gray-300 group-hover:text-steel transition-colors"></i>
                  )}
                </div>
              ))}
            </div>

            {/* Base URL */}
            <div className="mt-3 bg-gray-50 border border-border rounded-lg p-2.5">
              <p className="text-[10px] text-steel">
                <strong>Base URL:</strong>{' '}
                <code className="bg-white px-1 rounded border border-border">https://s4ledger.com/api</code>
                {' '}• All responses are JSON • Rate limited to 100 req/min
              </p>
            </div>
          </div>
        )}

        {/* ─── Webhooks Tab ────────────────────────────────── */}
        {tab === 'webhooks' && (
          <div>
            {/* Register new webhook */}
            <div className="bg-gray-50 border border-border rounded-lg p-4 mb-4">
              <p className="text-xs font-semibold text-gray-900 mb-3">Register Webhook</p>
              <input
                type="url"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="w-full px-3 py-2 text-xs border border-border rounded-lg mb-3"
              />

              {/* Event checkboxes */}
              <p className="text-[10px] text-steel uppercase tracking-wider mb-2">Events to subscribe</p>
              <div className="grid grid-cols-2 gap-1 mb-3">
                {VALID_EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-1.5 text-[10px] text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="rounded border-gray-300 text-accent w-3 h-3"
                    />
                    {ev}
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRegisterWebhook}
                  disabled={registering || !webhookUrl.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white text-xs font-semibold transition-all disabled:opacity-40"
                >
                  {registering ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>}
                  Register
                </button>
                <button
                  onClick={handleTestWebhook}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-semibold text-gray-700 transition-all"
                  title="Send a test event to all registered webhooks"
                >
                  <i className="fas fa-vial mr-1"></i>
                  Test
                </button>
              </div>

              {regResult && (
                <div className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800 font-medium"><i className="fas fa-check-circle mr-1"></i>Webhook registered</p>
                  <p className="text-[10px] text-green-700 mt-1">
                    Signing secret: <code className="bg-white px-1 rounded text-[9px]">{regResult.secret}</code>
                  </p>
                </div>
              )}
              {regError && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700"><i className="fas fa-exclamation-circle mr-1"></i>{regError}</p>
                </div>
              )}
            </div>

            {/* Active webhooks */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-900">Active Webhooks</p>
                <button onClick={loadWebhooks} className="text-[10px] text-accent hover:underline">
                  {loadingHooks ? <i className="fas fa-spinner fa-spin"></i> : 'Refresh'}
                </button>
              </div>
              {webhooks.length === 0 ? (
                <p className="text-xs text-steel py-3 text-center">No webhooks registered</p>
              ) : (
                <div className="space-y-2">
                  {webhooks.map((hook, i) => (
                    <div key={i} className="bg-gray-50 border border-border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-bolt text-accent text-xs"></i>
                        <code className="text-[10px] font-mono text-gray-700 flex-1 break-all">{hook.url}</code>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {hook.events.map(ev => (
                          <span key={ev} className="text-[8px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">{ev}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent deliveries */}
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-2">Recent Deliveries</p>
              {deliveries.length === 0 ? (
                <p className="text-xs text-steel py-3 text-center">No webhook deliveries yet</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {deliveries.slice(0, 20).map((del, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-[10px]">
                      <i className={`fas ${del.status === 'delivered' ? 'fa-check text-green-500' : 'fa-times text-red-500'}`}></i>
                      <span className="font-mono text-gray-600">{del.event}</span>
                      <span className="text-steel flex-1 truncate">{del.url}</span>
                      {del.http_status && <span className="text-gray-500">{del.http_status}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── SDK Tab ─────────────────────────────────────── */}
        {tab === 'sdk' && (
          <div>
            <div className="bg-gray-50 border border-border rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-900">Python SDK</p>
                <button
                  onClick={() => {
                    copyToClipboard('pip install s4-ledger-sdk')
                    setCopiedSdk(true)
                    setTimeout(() => setCopiedSdk(false), 1500)
                  }}
                  className="text-[10px] text-accent hover:underline"
                >
                  {copiedSdk ? 'Copied!' : 'Copy install'}
                </button>
              </div>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-[10px] font-mono overflow-x-auto whitespace-pre">
{`pip install s4-ledger-sdk

from s4_sdk import S4Client

client = S4Client(api_key="your-api-key")

# Anchor a record
result = client.anchor(
    record_type="USN_DRL",
    content="Systems Engineering Plan Rev B",
    metadata={"contract": "N00024-23-C-6200"}
)
print(result.tx_hash)
print(result.explorer_url)

# Verify integrity
verified = client.verify(
    record_text="Systems Engineering Plan Rev B",
    tx_hash=result.tx_hash
)
print(verified.match)  # True

# Register webhook
client.webhooks.register(
    url="https://your-server.com/webhook",
    events=["anchor.confirmed", "tamper.detected"]
)

# List records
records = client.records.list(limit=10)
for r in records:
    print(r.record_id, r.record_type)`}
              </pre>
            </div>

            <div className="bg-gray-50 border border-border rounded-lg p-4 mb-4">
              <p className="text-xs font-semibold text-gray-900 mb-3">TypeScript / Node.js</p>
              <pre className="bg-gray-900 text-blue-300 rounded-lg p-3 text-[10px] font-mono overflow-x-auto whitespace-pre">
{`npm install @s4ledger/sdk

import { S4Client } from '@s4ledger/sdk';

const client = new S4Client({
  apiKey: process.env.S4_API_KEY,
  baseUrl: 'https://s4ledger.com/api',
});

// Anchor a record
const result = await client.anchor({
  recordType: 'USN_DRL',
  content: 'Systems Engineering Plan Rev B',
  metadata: { contract: 'N00024-23-C-6200' },
});
console.log(result.txHash, result.explorerUrl);

// Verify
const verified = await client.verify({
  recordText: 'Systems Engineering Plan Rev B',
  txHash: result.txHash,
});
console.log(verified.match); // true`}
              </pre>
            </div>

            <div className="bg-gray-50 border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-900 mb-3">cURL Example</p>
              <pre className="bg-gray-900 text-yellow-300 rounded-lg p-3 text-[10px] font-mono overflow-x-auto whitespace-pre">
{`# Anchor a record
curl -X POST https://s4ledger.com/api/anchor \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "record_type": "USN_DRL",
    "hash": "sha256-of-your-content",
    "content_preview": "SEP Rev B"
  }'

# Verify a seal
curl -X POST https://s4ledger.com/api/verify \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "record_text": "original content",
    "tx_hash": "TX_HASH_FROM_ANCHOR"
  }'

# Health check
curl https://s4ledger.com/api/health`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </DraggableModal>
  )
}
