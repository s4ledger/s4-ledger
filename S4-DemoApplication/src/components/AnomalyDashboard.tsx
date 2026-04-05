import { useState, useEffect, useMemo } from 'react'
import { DRLRow, AnchorRecord } from '../types'
import { getAuditLog } from '../utils/auditTrail'
import { getAllChanges, ChangeEntry } from '../utils/changeLog'
import {
  runAnomalyDetection,
  getAnomalySummary,
  enrichAnomalyWithAI,
  Anomaly,
  AnomalySummary,
  AnomalySeverity,
  AnomalyType,
} from '../utils/anomalyDetection'
import DraggableModal from './DraggableModal'

interface Props {
  data: DRLRow[]
  anchors: Record<string, AnchorRecord>
  editedSinceSeal: Set<string>
  onClose: () => void
}

const SEVERITY_META: Record<AnomalySeverity, { icon: string; color: string; bg: string; label: string }> = {
  critical: { icon: 'fa-exclamation-triangle', color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Critical' },
  warning:  { icon: 'fa-exclamation-circle', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', label: 'Warning' },
  info:     { icon: 'fa-info-circle', color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', label: 'Info' },
}

const TYPE_LABELS: Record<AnomalyType, string> = {
  status_regression: 'Status Regression',
  edit_velocity: 'Edit Velocity',
  sla_breach: 'SLA Breach',
  bulk_change: 'Bulk Change',
  compliance_drift: 'Compliance Drift',
  unsealed_edit: 'Unsealed Edit',
  unusual_pattern: 'Unusual Pattern',
  missing_submission: 'Missing Submission',
  overdue_review: 'Overdue Review',
}

export default function AnomalyDashboard({ data, anchors, editedSinceSeal, onClose }: Props) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [summary, setSummary] = useState<AnomalySummary | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | 'all'>('all')

  /* ─── Run scan ─────────────────────────────────────────────── */
  async function runScan() {
    setScanning(true)
    setScanComplete(false)
    setSelectedAnomaly(null)
    try {
      const auditEvents = getAuditLog()
      let changes: ChangeEntry[] = []
      try { changes = await getAllChanges(500) } catch { /* no changes */ }
      const detected = runAnomalyDetection(data, anchors, auditEvents, changes, editedSinceSeal)
      setAnomalies(detected)
      setSummary(getAnomalySummary(detected))
      setScanComplete(true)
    } finally {
      setScanning(false)
    }
  }

  // Auto-scan on mount
  useEffect(() => { runScan() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── AI recommendation for selected anomaly ───────────────── */
  async function loadAIRecommendation(anomaly: Anomaly) {
    if (anomaly.aiRecommendation) return
    setAiLoading(true)
    try {
      const rec = await enrichAnomalyWithAI(anomaly)
      setAnomalies(prev => prev.map(a => a.id === anomaly.id ? { ...a, aiRecommendation: rec } : a))
      setSelectedAnomaly(prev => prev?.id === anomaly.id ? { ...prev, aiRecommendation: rec } : prev)
    } finally {
      setAiLoading(false)
    }
  }

  /* ─── Filtering ────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = anomalies
    if (severityFilter !== 'all') list = list.filter(a => a.severity === severityFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.affectedRows.some(r => r.toLowerCase().includes(q))
      )
    }
    if (dateFilter) {
      list = list.filter(a => a.detectedAt.startsWith(dateFilter))
    }
    return list
  }, [anomalies, severityFilter, search, dateFilter])

  return (
    <DraggableModal defaultWidth={680} defaultHeight={620} position="center" backdrop={true}>
      <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">
        {/* ─── Header ───────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <i className="fas fa-shield-alt text-red-500 text-sm"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">AI Anomaly Detection</h2>
              <p className="text-[10px] text-steel">Automated risk & compliance scanning</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runScan}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <i className={`fas ${scanning ? 'fa-spinner fa-spin' : 'fa-radar'} text-[10px]`}></i>
              {scanning ? 'Scanning…' : 'Run Scan'}
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <i className="fas fa-times text-steel text-xs"></i>
            </button>
          </div>
        </div>

        {/* ─── Summary Cards ────────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-border bg-gray-50/50">
            <button
              onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
              className={`flex flex-col items-center py-2 rounded-lg border transition-all ${severityFilter === 'critical' ? 'bg-red-100 border-red-300 ring-1 ring-red-300' : 'bg-white border-border hover:bg-red-50'}`}
            >
              <span className="text-lg font-bold text-red-600">{summary.critical}</span>
              <span className="text-[9px] font-medium text-red-500 uppercase tracking-wider">Critical</span>
            </button>
            <button
              onClick={() => setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning')}
              className={`flex flex-col items-center py-2 rounded-lg border transition-all ${severityFilter === 'warning' ? 'bg-amber-100 border-amber-300 ring-1 ring-amber-300' : 'bg-white border-border hover:bg-amber-50'}`}
            >
              <span className="text-lg font-bold text-amber-500">{summary.warning}</span>
              <span className="text-[9px] font-medium text-amber-500 uppercase tracking-wider">Warning</span>
            </button>
            <button
              onClick={() => setSeverityFilter(severityFilter === 'info' ? 'all' : 'info')}
              className={`flex flex-col items-center py-2 rounded-lg border transition-all ${severityFilter === 'info' ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-border hover:bg-blue-50'}`}
            >
              <span className="text-lg font-bold text-blue-500">{summary.info}</span>
              <span className="text-[9px] font-medium text-blue-500 uppercase tracking-wider">Info</span>
            </button>
            <div className="flex flex-col items-center py-2 rounded-lg bg-white border border-border">
              <span className="text-lg font-bold text-gray-900">{summary.total}</span>
              <span className="text-[9px] font-medium text-steel uppercase tracking-wider">Total</span>
            </div>
          </div>
        )}

        {/* ─── Search & Date Filter ─────────────────────────── */}
        <div className="flex gap-2 px-5 py-2 border-b border-border">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-steel/40 text-[10px]"></i>
            <input
              type="text"
              placeholder="Search anomalies…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-7 py-1.5 text-[11px] bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-steel/40 hover:text-steel text-[10px]">
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
          <div className="relative">
            <i className="fas fa-calendar-alt absolute left-2 top-1/2 -translate-y-1/2 text-steel/40 text-[10px] pointer-events-none"></i>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="pl-6 pr-1 py-1.5 text-[11px] bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent w-[130px]"
            />
          </div>
          {(search || dateFilter || severityFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setDateFilter(''); setSeverityFilter('all') }}
              className="px-2 py-1.5 text-[10px] text-red-500 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>

        {/* ─── Anomaly List ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {scanning && (
            <div className="flex flex-col items-center justify-center py-16 text-steel">
              <i className="fas fa-spinner fa-spin text-2xl mb-3 text-accent"></i>
              <p className="text-sm font-medium">Scanning {data.length} deliverables…</p>
              <p className="text-[10px] text-steel/60 mt-1">Analyzing audit trail, change history, and compliance data</p>
            </div>
          )}

          {!scanning && scanComplete && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-steel">
              <i className="fas fa-check-circle text-3xl mb-3 text-green-500"></i>
              <p className="text-sm font-semibold text-gray-900">
                {anomalies.length === 0 ? 'No anomalies detected' : 'No matching anomalies'}
              </p>
              <p className="text-[10px] text-steel/60 mt-1">
                {anomalies.length === 0 ? 'All deliverables passed automated checks' : 'Try adjusting your filters'}
              </p>
            </div>
          )}

          {!scanning && filtered.map(anomaly => {
            const meta = SEVERITY_META[anomaly.severity]
            const isSelected = selectedAnomaly?.id === anomaly.id
            return (
              <button
                key={anomaly.id}
                onClick={() => {
                  setSelectedAnomaly(isSelected ? null : anomaly)
                  if (!isSelected) loadAIRecommendation(anomaly)
                }}
                className={`w-full text-left px-5 py-3 border-b border-border hover:bg-gray-50 transition-colors ${isSelected ? 'bg-gray-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border ${meta.bg}`}>
                    <i className={`fas ${meta.icon} ${meta.color} text-[10px]`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-gray-900 truncate">{anomaly.title}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-steel mt-0.5 line-clamp-2">{anomaly.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-steel/60">
                        <i className="fas fa-tag mr-1"></i>{TYPE_LABELS[anomaly.type]}
                      </span>
                      <span className="text-[9px] text-steel/60">
                        <i className="fas fa-clock mr-1"></i>{new Date(anomaly.detectedAt).toLocaleString()}
                      </span>
                      <span className="text-[9px] text-steel/60">
                        <i className="fas fa-layer-group mr-1"></i>{anomaly.affectedRows.length} row{anomaly.affectedRows.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <i className={`fas fa-chevron-right text-[9px] text-steel/30 mt-2 transition-transform ${isSelected ? 'rotate-90' : ''}`}></i>
                </div>

                {/* ─── Expanded Detail ──────────────────────── */}
                {isSelected && (
                  <div className="mt-3 ml-9 space-y-2" onClick={e => e.stopPropagation()}>
                    {/* Affected Rows */}
                    <div className="bg-white border border-border rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-gray-900 mb-1.5">Affected Deliverables</p>
                      <div className="flex flex-wrap gap-1.5">
                        {anomaly.affectedRows.map(id => (
                          <span key={id} className="px-2 py-0.5 text-[9px] font-mono bg-gray-100 rounded text-steel">{id}</span>
                        ))}
                      </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <i className="fas fa-brain text-accent text-[10px]"></i>
                        <p className="text-[10px] font-semibold text-gray-900">AI Recommendation</p>
                      </div>
                      {aiLoading && !anomaly.aiRecommendation ? (
                        <div className="flex items-center gap-2 text-[10px] text-steel">
                          <i className="fas fa-spinner fa-spin"></i>
                          Analyzing…
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-700 leading-relaxed">
                          {anomaly.aiRecommendation || 'Loading recommendation…'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* ─── Footer ───────────────────────────────────────── */}
        <div className="px-5 py-2 border-t border-border bg-gray-50/50 flex items-center justify-between">
          <span className="text-[9px] text-steel/50">
            S4 Ledger Trust Layer · AI Anomaly Detection
          </span>
          {summary && (
            <span className="text-[9px] text-steel/50">
              Last scan: {new Date(summary.lastScan).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </DraggableModal>
  )
}
