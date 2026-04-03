import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { CDRLRow, UserRole, AnchorRecord } from '../types'
import AIAssistModal from './AIAssistModal'
import AINextActionsPanel from './AINextActionsPanel'
import AuditTrailSidebar from './AuditTrailSidebar'
import AnchorVerifyMenu from './AnchorVerifyMenu'
import VerifyModal from './VerifyModal'
import MismatchModal from './MismatchModal'
import ReportModal from './ReportModal'
import ExternalSyncModal from './ExternalSyncModal'
import NotificationsPanel from './NotificationsPanel'
import EmailComposer from './EmailComposer'
import WorkflowProgressPopup from './WorkflowProgressPopup'
import { runContractComparison, ComparisonResult, ComparisonSummary } from '../utils/contractCompare'
import { contractRequirements } from '../data/contractData'
import { analyzeRow, AIRowInsight } from '../utils/aiAnalysis'
import { seedAuditHistory, recordEdit, recordAIRemarkUpdate, getAuditLog } from '../utils/auditTrail'
import { realSyncPipeline, manualCraftPipeline, SyncNotification, SyncStatus } from '../utils/externalSync'
import { getRACIParty, getRACIColor } from '../utils/raciWorkflow'
import { PMS300_CRAFT_LABELS } from '../services/nsercIdeService'

interface Props {
  data: CDRLRow[]
  role: UserRole
  anchors: Record<string, AnchorRecord>
  onAnchor: (row: CDRLRow) => void
  onAnchorAll: () => void
  onVerify: (row: CDRLRow) => void
  onReseal: (row: CDRLRow) => Promise<void>
  onDataUpdate: (data: CDRLRow[]) => void
  onSyncAnchors?: (newAnchors: Record<string, AnchorRecord>) => void
}

/* ─── Craft+Hull parser: extracts (Platform — Hull N) from title ─ */
function parseCraftHull(title: string): { platform: string; hull: string } | null {
  const idx = title.lastIndexOf('(')
  if (idx === -1) return null
  const end = title.lastIndexOf(')')
  if (end <= idx) return null
  const inner = title.slice(idx + 1, end).trim()
  const dashIdx = inner.indexOf('—')
  if (dashIdx === -1) return null
  const platform = inner.slice(0, dashIdx).trim()
  const hull = inner.slice(dashIdx + 1).trim()
  if (!platform || !hull) return null
  return { platform, hull }
}

const columns = [
  { key: 'title', label: 'S4 DRL(S) TITLE / REVISIONS', width: 'w-[22%]' },
  { key: 'diNumber', label: 'DI NUMBER', width: 'w-[11%]' },
  { key: 'contractDueFinish', label: 'CONTRACT DUE: FINISH', width: 'w-[10%]' },
  { key: 'calculatedDueDate', label: 'CALCULATED DUE DATE', width: 'w-[10%]' },
  { key: 'submittalGuidance', label: 'SUBMITTAL GUIDANCE', width: 'w-[13%]' },
  { key: 'actualSubmissionDate', label: 'ACTUAL SUBMISSION DATE', width: 'w-[10%]' },
  { key: 'received', label: 'RCVD', width: 'w-[5%]' },
  { key: 'calendarDaysToReview', label: 'CAL DAYS TO REVIEW', width: 'w-[7%]' },
  { key: 'notes', label: 'NOTES', width: 'w-[12%]' },
]

export default function DeliverablesTracker({ data, role, anchors, onAnchor, onAnchorAll, onVerify, onReseal, onDataUpdate, onSyncAnchors }: Props) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'green' | 'yellow' | 'red'>('all')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [showAI, setShowAI] = useState(false)
  const [aiRow, setAiRow] = useState<CDRLRow | null>(null)
  const [verifyRow, setVerifyRow] = useState<CDRLRow | null>(null)
  const [mismatchRow, setMismatchRow] = useState<CDRLRow | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)
  const [compareProgress, setCompareProgress] = useState(0)
  const [compareSummary, setCompareSummary] = useState<ComparisonSummary | null>(null)
  const [contractRefs, setContractRefs] = useState<Record<string, string>>({})
  const [hoveredDI, setHoveredDI] = useState<string | null>(null)
  const [rowFindings, setRowFindings] = useState<Record<string, string[]>>({})
  const [notesRow, setNotesRow] = useState<CDRLRow | null>(null)
  const [originalNotes, setOriginalNotes] = useState<Record<string, { notes: string; status: 'green' | 'yellow' | 'red' }> | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [hullFilter, setHullFilter] = useState<string>('all')
  const [editedSinceSeal, setEditedSinceSeal] = useState<Set<string>>(new Set())
  const [resealToast, setResealToast] = useState<string | null>(null)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiInsights, setAiInsights] = useState<Record<string, AIRowInsight>>({})
  const [showAudit, setShowAudit] = useState(false)
  const [auditRowId, setAuditRowId] = useState<string | null>(null)
  const [auditRowTitle, setAuditRowTitle] = useState<string | undefined>(undefined)
  const [auditVersion, setAuditVersion] = useState(0) // bump to force re-render
  const seededRef = useRef(false)

  /* ─── External Sync & Notifications state ──────────────────── */
  const [showSync, setShowSync] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<SyncNotification[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: true,
    lastSync: null,
    totalSyncs: 0,
    changesSynced: 0,
    isOnline: true,
  })
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [syncToast, setSyncToast] = useState<string | null>(null)
  const [emailNotification, setEmailNotification] = useState<SyncNotification | null>(null)
  const [workflowRow, setWorkflowRow] = useState<CDRLRow | null>(null)
  const autoSyncRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ─── Manual craft add state ────────────────────────────────── */
  const [showAddCraft, setShowAddCraft] = useState(false)
  const [showManualCraftModal, setShowManualCraftModal] = useState(false)
  const [manualCraftType, setManualCraftType] = useState('')
  const [addingCraft, setAddingCraft] = useState(false)

  /* ─── Derive unique platforms from data ─────────────────────── */
  const platforms = useMemo(() => {
    const platformSet = new Set<string>()
    for (const row of data) {
      const parsed = parseCraftHull(row.title)
      if (parsed) platformSet.add(parsed.platform)
    }
    return Array.from(platformSet).sort()
  }, [data])

  /* ─── Derive hull tabs for the selected platform ────────────── */
  const hullTabs = useMemo(() => {
    if (platformFilter === 'all') return ['all']
    const hullSet = new Set<string>()
    for (const row of data) {
      const parsed = parseCraftHull(row.title)
      if (parsed && parsed.platform === platformFilter) {
        hullSet.add(parsed.hull)
      }
    }
    const sorted = Array.from(hullSet).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10) || 0
      const nb = parseInt(b.replace(/\D/g, ''), 10) || 0
      return na - nb
    })
    return ['all', ...sorted]
  }, [data, platformFilter])

  /* ─── Platform + hull filtered base data ────────────────────── */
  const hullData = useMemo(() => {
    if (platformFilter === 'all') return data
    let rows = data.filter(r => {
      const parsed = parseCraftHull(r.title)
      return parsed && parsed.platform === platformFilter
    })
    if (hullFilter !== 'all') {
      rows = rows.filter(r => {
        const parsed = parseCraftHull(r.title)
        return parsed && parsed.hull === hullFilter
      })
    }
    return rows
  }, [data, platformFilter, hullFilter])

  const filtered = useMemo(() => {
    let rows = [...hullData]
    if (filterStatus !== 'all') rows = rows.filter(r => r.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.diNumber.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      )
    }
    if (sortCol) {
      rows.sort((a, b) => {
        const av = String((a as unknown as Record<string, unknown>)[sortCol] ?? '')
        const bv = String((b as unknown as Record<string, unknown>)[sortCol] ?? '')
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    return rows
  }, [hullData, filterStatus, search, sortCol, sortAsc])

  const stats = useMemo(() => ({
    total: hullData.length,
    green: hullData.filter(r => r.status === 'green').length,
    yellow: hullData.filter(r => r.status === 'yellow').length,
    red: hullData.filter(r => r.status === 'red').length,
    anchored: hullData.filter(r => anchors[r.id]).length,
  }), [hullData, anchors])

  /* ─── Summary (shown when a specific platform/hull is selected) ─ */
  const hullSummary = useMemo(() => {
    if (platformFilter === 'all') return null
    const total = hullData.length
    const green = hullData.filter(r => r.status === 'green').length
    const red = hullData.filter(r => r.status === 'red').length
    const sealed = hullData.filter(r => anchors[r.id]).length
    const pctComplete = total > 0 ? Math.round((green / total) * 100) : 0
    const nextDue = hullData
      .filter(r => r.status !== 'green')
      .sort((a, b) => a.contractDueFinish.localeCompare(b.contractDueFinish))[0]
    const label = hullFilter !== 'all'
      ? `${platformFilter} — ${hullFilter}`
      : platformFilter
    return { total, green, red, sealed, pctComplete, nextDue, label }
  }, [platformFilter, hullFilter, hullData, anchors])

  const handleCompare = useCallback(async () => {
    if (comparing) return
    setComparing(true)
    setCompareProgress(0)
    setCompareSummary(null)

    // Save original notes/status before overwriting
    const origMap: Record<string, { notes: string; status: 'green' | 'yellow' | 'red' }> = {}
    hullData.forEach(r => { origMap[r.id] = { notes: r.notes, status: r.status } })
    setOriginalNotes(origMap)

    const refs: Record<string, string> = {}
    const findingsMap: Record<string, string[]> = {}
    const updatedData = [...data]

    const summary = await runContractComparison(hullData, (result: ComparisonResult, index: number) => {
      setCompareProgress(index + 1)
      refs[result.rowId] = result.contractRef
      findingsMap[result.rowId] = result.findings
      // Update the row's notes and status
      const dataIdx = updatedData.findIndex(r => r.id === result.rowId)
      if (dataIdx !== -1) {
        updatedData[dataIdx] = {
          ...updatedData[dataIdx],
          notes: result.remarks,
          status: result.status,
        }
      }
    })

    setContractRefs(refs)
    setRowFindings(findingsMap)
    onDataUpdate(updatedData)
    setCompareSummary(summary)
    setComparing(false)
  }, [comparing, data, hullData, onDataUpdate])

  function handleSort(key: string) {
    if (sortCol === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortCol(key)
      setSortAsc(true)
    }
  }

  /* ─── Seed audit history on first load ─────────────────── */
  useEffect(() => {
    if (!seededRef.current) {
      seedAuditHistory(data, anchors)
      seededRef.current = true
    }
  }, [data, anchors])

  function openAuditGlobal() {
    setAuditRowId(null)
    setAuditRowTitle(undefined)
    setAuditVersion(v => v + 1)
    setShowAudit(true)
  }

  function openAuditForRow(row: CDRLRow) {
    setAuditRowId(row.id)
    setAuditRowTitle(row.title)
    setAuditVersion(v => v + 1)
    setShowAudit(true)
  }

  /* ─── Generate AI insights for all rows ───────────────── */
  const refreshAIInsights = useCallback(() => {
    const insights: Record<string, AIRowInsight> = {}
    data.forEach(r => {
      insights[r.id] = analyzeRow(r, anchors, editedSinceSeal)
    })
    setAiInsights(insights)
  }, [data, anchors, editedSinceSeal])

  /* ─── Auto-generate insights on load and data change ──── */
  useEffect(() => {
    refreshAIInsights()
  }, [refreshAIInsights])

  /* ─── External Sync Handler ────────────────────────────── */
  const handleExternalSync = useCallback(async () => {
    if (!syncStatus.isOnline) return
    const { changes, notifications: newNotifs, updatedRows, newAnchors, newCraftDetected } = await realSyncPipeline(data, role, anchors, editedSinceSeal)
    onDataUpdate(updatedRows)
    if (onSyncAnchors && Object.keys(newAnchors).length > 0) {
      onSyncAnchors(newAnchors)
    }
    setNotifications(prev => [...newNotifs, ...prev])
    setSyncStatus(prev => ({
      ...prev,
      lastSync: new Date().toISOString(),
      totalSyncs: prev.totalSyncs + 1,
      changesSynced: prev.changesSynced + changes.length,
    }))
    setAuditVersion(v => v + 1)
    const sealCount = Object.keys(newAnchors).length
    if (newCraftDetected) {
      setSyncToast(`NSERC IDE (PMS 300): New craft "${newCraftDetected}" detected — ${changes.length} update${changes.length !== 1 ? 's' : ''} synced, ${sealCount} sealed to XRPL`)
      setPlatformFilter(newCraftDetected)
      setHullFilter('all')
    } else {
      setSyncToast(`NSERC IDE (PMS 300): ${changes.length} update${changes.length !== 1 ? 's' : ''} synced — ${sealCount} record${sealCount !== 1 ? 's' : ''} sealed to XRPL`)
    }
    setTimeout(() => setSyncToast(null), 5000)
  }, [data, role, anchors, editedSinceSeal, syncStatus.isOnline, onDataUpdate, onSyncAnchors])

  /* ─── Auto-sync interval (5 minutes) ──────────────────── */
  useEffect(() => {
    if (autoSyncEnabled && syncStatus.isOnline) {
      autoSyncRef.current = setInterval(handleExternalSync, 5 * 60 * 1000)
    }
    return () => {
      if (autoSyncRef.current) clearInterval(autoSyncRef.current)
    }
  }, [autoSyncEnabled, syncStatus.isOnline, handleExternalSync])

  /* ─── Manual Craft Entry (offline fallback) ──────────── */
  const handleManualCraft = useCallback(async (craftName: string) => {
    const { changes, notifications: newNotifs, updatedRows, newAnchors, newCraftDetected } = await manualCraftPipeline(data, craftName, role, anchors, editedSinceSeal)
    onDataUpdate(updatedRows)
    if (onSyncAnchors && Object.keys(newAnchors).length > 0) {
      onSyncAnchors(newAnchors)
    }
    setNotifications(prev => [...newNotifs, ...prev])
    setSyncStatus(prev => ({
      ...prev,
      lastSync: new Date().toISOString(),
      totalSyncs: prev.totalSyncs + 1,
      changesSynced: prev.changesSynced + changes.length,
    }))
    setAuditVersion(v => v + 1)
    const sealCount = Object.keys(newAnchors).length
    setSyncToast(`Manual Entry: ${newCraftDetected} added — ${sealCount} new row${sealCount !== 1 ? 's' : ''} sealed to XRPL`)
    if (newCraftDetected) {
      setPlatformFilter(newCraftDetected)
      setHullFilter('all')
    }
    setTimeout(() => setSyncToast(null), 5000)
  }, [data, role, anchors, editedSinceSeal, onDataUpdate, onSyncAnchors])

  function handleToggleOffline() {
    setSyncStatus(prev => ({ ...prev, isOnline: !prev.isOnline }))
  }

  function handleMarkNotifRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  /** Build a SyncNotification shell so the EmailComposer can render for a workflow row */
  function handleWorkflowEmail(row: CDRLRow) {
    const party = getRACIParty(row)
    const n: SyncNotification = {
      id: `wf-${row.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: `${row.id} — Workflow Status Update`,
      body: `Current status: ${row.status === 'green' ? 'Approved' : row.status === 'yellow' ? 'In Review' : 'Overdue'}. Responsible: ${party}. ${row.notes.slice(0, 100)}`,
      priority: row.status === 'red' ? 'critical' : row.status === 'yellow' ? 'medium' : 'low',
      rowId: row.id,
      rowTitle: row.title,
      stakeholders: ['Program Manager', 'Contracting Officer', party === 'Shipbuilder' ? 'Quality Assurance' : party],
      read: true,
      changes: [{ rowId: row.id, rowTitle: row.title, field: 'Workflow Update', oldValue: '', newValue: row.notes.slice(0, 80), source: 'DRL Workflow Progress', isReal: false }],
      isReal: false,
    }
    setEmailNotification(n)
    setWorkflowRow(null)
  }

  function handleUpdateNotes(rowId: string, notes: string) {
    const row = data.find(r => r.id === rowId)
    if (row) recordAIRemarkUpdate(row, notes)
    const updated = data.map(r => r.id === rowId ? { ...r, notes } : r)
    onDataUpdate(updated)
    setAuditVersion(v => v + 1)
  }

  function handleRestoreNotes() {
    if (!originalNotes) return
    const restored = data.map(r => ({
      ...r,
      notes: originalNotes[r.id]?.notes ?? r.notes,
      status: originalNotes[r.id]?.status ?? r.status,
    }))
    onDataUpdate(restored)
    setOriginalNotes(null)
    setCompareSummary(null)
    setRowFindings({})
    setContractRefs({})
  }

  function handleCellEdit(rowId: string, field: keyof CDRLRow, value: string) {
    const row = data.find(r => r.id === rowId)
    if (row) {
      const oldVal = String(row[field] ?? '')
      if (oldVal !== value) {
        recordEdit(row, field, oldVal, value)
        setAuditVersion(v => v + 1)
      }
    }
    // Track that this sealed row was edited
    if (anchors[rowId]) {
      setEditedSinceSeal(prev => new Set(prev).add(rowId))
    }
    const updated = data.map(r => {
      if (r.id !== rowId) return r
      if (field === 'calendarDaysToReview') {
        const num = value.trim() === '' || value.trim() === '—' ? null : parseInt(value, 10)
        return { ...r, [field]: isNaN(num as number) ? null : num }
      }
      return { ...r, [field]: value }
    })
    onDataUpdate(updated)
  }

  function rowClass(status: string) {
    if (status === 'red') return 'row-red'
    if (status === 'yellow') return 'row-yellow'
    return 'row-green'
  }

  async function handleRowReseal(row: CDRLRow) {
    await onReseal(row)
    setEditedSinceSeal(prev => {
      const next = new Set(prev)
      next.delete(row.id)
      return next
    })
    setResealToast(row.id)
    setTimeout(() => setResealToast(null), 4000)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900">
      {/* Top Bar */}
      <header className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/s4-assets/S4Ledger_logo.png" alt="S4 Ledger" className="h-9 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">S4 Ledger · Deliverables Tracker</h1>
              <p className="text-steel text-xs">{role} View · FOUO Simulation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCompare}
              disabled={comparing}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 rounded-lg text-green-600 text-sm font-medium transition-all disabled:opacity-60"
            >
              {comparing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Comparing ({compareProgress}/{hullData.length})…
                </>
              ) : (
                <>
                  <i className="fas fa-file-contract"></i>
                  Compare to Contract
                </>
              )}
            </button>
            <button
              onClick={() => { setAiRow(null); setShowAI(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-accent/15 hover:bg-accent/25 border border-accent/30 rounded-lg text-accent text-sm font-medium transition-all"
            >
              <i className="fas fa-brain"></i>
              AI Insights
            </button>
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                showAIPanel
                  ? 'bg-accent text-white border-accent'
                  : 'bg-accent/15 hover:bg-accent/25 border-accent/30 text-accent'
              }`}
            >
              <i className="fas fa-bolt"></i>
              Next Actions
            </button>
            <button
              onClick={openAuditGlobal}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                showAudit && !auditRowId
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-black/[0.04] hover:bg-black/[0.08] border-border text-steel'
              }`}
            >
              <i className="fas fa-history"></i>
              Audit Trail
            </button>
            <button
              onClick={() => setShowSync(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 rounded-lg text-purple-600 text-sm font-medium transition-all"
            >
              <i className="fas fa-database"></i>
              Sync
              {syncStatus.lastSync && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`flex items-center justify-center w-9 h-9 border rounded-lg text-sm transition-all ${
                  showNotifications
                    ? 'bg-accent text-white border-accent'
                    : 'bg-black/[0.04] hover:bg-black/[0.08] border-border text-steel'
                }`}
              >
                <i className="fas fa-bell"></i>
              </button>
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all"
            >
              <i className="fas fa-file-pdf"></i>
              Generate Weekly PDF Report
            </button>
          </div>
        </div>
      </header>

      {/* Platform/Craft Filter Bar */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center gap-2 py-2">
            {/* Platform Dropdown (custom, styled like toolbar buttons) */}
            <div className="relative">
              <button
                onClick={() => setShowAddCraft(!showAddCraft)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                  platformFilter !== 'all'
                    ? 'bg-accent text-white border-accent'
                    : 'bg-black/[0.04] hover:bg-black/[0.08] border-border text-gray-900'
                }`}
              >
                <i className="fas fa-ship text-xs"></i>
                {platformFilter === 'all' ? 'All Platforms' : platformFilter}
                <i className={`fas fa-chevron-down text-[10px] ml-1 transition-transform ${showAddCraft ? 'rotate-180' : ''}`}></i>
              </button>
              {showAddCraft && (
                <div
                  className="absolute left-0 top-full mt-1 z-50 bg-white border border-border rounded-lg shadow-xl w-72 overflow-hidden"
                >
                  {/* All Platforms option */}
                  <button
                    onClick={() => { setPlatformFilter('all'); setHullFilter('all'); setShowAddCraft(false) }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                      platformFilter === 'all' ? 'bg-accent/10 text-accent font-semibold' : 'text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <i className="fas fa-th-list text-xs text-steel w-4 text-center"></i>
                    All Platforms
                    <span className="ml-auto text-xs text-steel">({data.length})</span>
                  </button>

                  {/* Divider */}
                  <div className="border-t border-border" />

                  {/* Synced platforms */}
                  {platforms.map(p => {
                    const count = data.filter(r => { const pr = parseCraftHull(r.title); return pr && pr.platform === p }).length
                    return (
                      <button
                        key={p}
                        onClick={() => { setPlatformFilter(p); setHullFilter('all'); setShowAddCraft(false) }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                          platformFilter === p ? 'bg-accent/10 text-accent font-semibold' : 'text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <i className="fas fa-ship text-xs text-steel w-4 text-center"></i>
                        {p}
                        <span className="ml-auto text-xs text-steel">({count})</span>
                      </button>
                    )
                  })}

                  {/* Divider + Add Craft option */}
                  <div className="border-t border-border" />
                  <button
                    onClick={() => { setShowAddCraft(false); setShowManualCraftModal(true) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-accent hover:bg-accent/5 transition-colors font-medium"
                  >
                    <i className="fas fa-plus-circle text-xs w-4 text-center"></i>
                    Add Craft Manually…
                  </button>
                </div>
              )}
            </div>

            {/* Hull Tabs (shown when a specific platform is selected) */}
            {platformFilter !== 'all' && hullTabs.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto">
                {hullTabs.map(h => {
                  const label = h === 'all' ? 'All Hulls' : h
                  const count = h === 'all'
                    ? data.filter(r => { const pr = parseCraftHull(r.title); return pr && pr.platform === platformFilter }).length
                    : data.filter(r => { const pr = parseCraftHull(r.title); return pr && pr.platform === platformFilter && pr.hull === h }).length
                  const isActive = hullFilter === h
                  return (
                    <button
                      key={h}
                      onClick={() => setHullFilter(h)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-steel hover:text-gray-900 hover:bg-black/[0.04]'
                      }`}
                    >
                      <i className="fas fa-anchor text-[10px]"></i>
                      {label}
                      <span className={`ml-0.5 text-[10px] ${isActive ? 'text-white/70' : 'text-steel/60'}`}>
                        ({count})
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Craft Entry Modal */}
      {showManualCraftModal && (
        <div className="modal-backdrop" onClick={() => { setShowManualCraftModal(false); setManualCraftType('') }}>
          <div
            className="bg-white border border-border rounded-card p-6 max-w-md w-full mx-4 animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                  <i className="fas fa-ship text-accent text-sm"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Add PMS 300 Craft</h3>
                  <p className="text-steel text-xs">Manually add a service craft when NSERC IDE is offline</p>
                </div>
              </div>
              <button onClick={() => { setShowManualCraftModal(false); setManualCraftType('') }} className="text-steel hover:text-gray-900 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p className="text-xs text-steel mb-3">Select a PMS 300 craft type. Hull number will be assigned automatically.</p>
            <div className="space-y-2">
              {PMS300_CRAFT_LABELS.map(c => {
                const exists = platforms.includes(c)
                return (
                  <button
                    key={c}
                    onClick={() => setManualCraftType(c)}
                    disabled={addingCraft}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-all border ${
                      manualCraftType === c
                        ? 'bg-accent/10 border-accent/40 text-accent font-medium'
                        : 'border-border text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <i className={`fas fa-ship text-xs ${manualCraftType === c ? 'text-accent' : 'text-steel'} w-4 text-center`}></i>
                    {c}
                    {exists && <span className="ml-auto text-[10px] text-steel bg-gray-100 px-1.5 py-0.5 rounded">active</span>}
                  </button>
                )
              })}
            </div>
            <button
              onClick={async () => {
                if (!manualCraftType) return
                setAddingCraft(true)
                try {
                  await handleManualCraft(manualCraftType)
                } finally {
                  setAddingCraft(false)
                  setManualCraftType('')
                  setShowManualCraftModal(false)
                }
              }}
              disabled={!manualCraftType || addingCraft}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/40 text-white rounded-lg text-sm font-medium transition-all"
            >
              {addingCraft ? (
                <><i className="fas fa-spinner fa-spin"></i> Adding Craft…</>
              ) : (
                <><i className="fas fa-plus"></i> Add to Tracker</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Craft Summary Section (visible when specific platform selected) */}
      {hullSummary && (
        <div className="max-w-[1600px] mx-auto px-6 pt-4">
          <div className="bg-white border border-accent/20 rounded-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <i className="fas fa-ship text-accent text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{hullSummary.label} Summary</h3>
                  <p className="text-[11px] text-steel">
                    {hullSummary.total} deliverables assigned · {hullSummary.green} approved · {hullSummary.red} overdue · {hullSummary.sealed} sealed
                  </p>
                </div>
              </div>
              {hullSummary.nextDue && (
                <div className="text-right">
                  <p className="text-[10px] text-steel uppercase tracking-wide">Next Critical Due</p>
                  <p className="text-sm font-semibold text-gray-900">{hullSummary.nextDue.contractDueFinish}</p>
                  <p className="text-[10px] text-steel truncate max-w-[180px]">{hullSummary.nextDue.title}</p>
                </div>
              )}
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${hullSummary.pctComplete}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-900 w-10 text-right">{hullSummary.pctComplete}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white border border-border rounded-card p-4">
            <p className="text-steel text-xs uppercase tracking-wide">Total CDRLs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white border border-green-500/30 rounded-card p-4">
            <p className="text-green-600 text-xs uppercase tracking-wide">Approved</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.green}</p>
          </div>
          <div className="bg-white border border-yellow-500/30 rounded-card p-4">
            <p className="text-yellow-600 text-xs uppercase tracking-wide">In Review</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.yellow}</p>
          </div>
          <div className="bg-white border border-red-500/30 rounded-card p-4">
            <p className="text-red-500 text-xs uppercase tracking-wide">Overdue</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{stats.red}</p>
          </div>
          <div className="bg-white border border-accent/30 rounded-card p-4">
            <p className="text-accent text-xs uppercase tracking-wide">Sealed</p>
            <p className="text-2xl font-bold text-accent mt-1">{stats.anchored}</p>
          </div>
        </div>
      </div>

      {/* Contract Comparison Summary Banner */}
      {compareSummary && (
        <div className="max-w-[1600px] mx-auto px-6 pb-3">
          <div className="bg-white border border-accent/20 rounded-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <i className="fas fa-file-contract text-accent text-sm"></i>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Contractual Guidance Comparison Complete
                </p>
                <p className="text-xs text-steel">
                  <span className="text-green-500 font-medium">{compareSummary.compliant} fully compliant</span>
                  {compareSummary.needsAttention > 0 && (
                    <>, <span className="text-yellow-500 font-medium">{compareSummary.needsAttention} need attention</span></>
                  )}
                  {compareSummary.critical > 0 && (
                    <>, <span className="text-red-500 font-medium">{compareSummary.critical} critical</span></>
                  )}
                  {' '}— AI remarks generated from full Attachment J-2 contract requirements.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {originalNotes && (
                <button
                  onClick={handleRestoreNotes}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-steel/10 hover:bg-steel/20 border border-steel/20 rounded-lg text-steel text-xs font-medium transition-all"
                >
                  <i className="fas fa-undo text-[10px]"></i>
                  Restore Original Notes
                </button>
              )}
              <button
                onClick={() => setCompareSummary(null)}
                className="text-steel hover:text-gray-900 transition-colors text-xs px-2"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="max-w-[1600px] mx-auto px-6 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-steel/50 text-sm"></i>
            <input
              type="text"
              placeholder="Search deliverables…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-border rounded-lg pl-9 pr-4 py-2 text-gray-900 text-sm placeholder:text-steel/50 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1">
            {(['all', 'green', 'yellow', 'red'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filterStatus === s
                    ? s === 'all'
                      ? 'bg-accent text-white'
                      : s === 'green'
                      ? 'bg-green-500/20 text-green-400'
                      : s === 'yellow'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                    : 'text-steel hover:text-gray-900'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => { hullData.filter(r => !anchors[r.id]).forEach(r => onAnchor(r)) }}
            className="flex items-center gap-2 px-3 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-lg text-accent text-xs font-medium transition-all"
          >
            <i className="fas fa-link"></i>
            Seal All
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-[1600px] mx-auto px-6 pb-8">
        <div className="bg-white border border-border rounded-card overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-380px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <tr className="border-b border-border">
                  <th className="w-[50px] px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                    #
                  </th>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`${col.width} px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors bg-white`}
                    >
                      {col.label}
                      {sortCol === col.key && (
                        <i className={`fas fa-sort-${sortAsc ? 'up' : 'down'} ml-1 text-accent`}></i>
                      )}
                    </th>
                  ))}
                  <th className="w-[80px] px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                    Trust
                  </th>
                  <th className="w-[50px] px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                    <i className="fas fa-bolt text-accent"></i>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`${rowClass(row.status)} border-b border-border/50 hover:bg-black/[0.04] hover:shadow-[inset_0_0_0_1px_rgba(0,122,255,0.08)] transition-all cursor-pointer`}
                    onClick={e => {
                      const el = e.target as HTMLElement
                      // Skip if user is editing content, clicking buttons, or clicking notes cell
                      if (el.isContentEditable || el.tagName === 'BUTTON' || el.tagName === 'I' || el.closest('button') || el.closest('[data-no-workflow]')) return
                      setWorkflowRow(row)
                    }}
                  >
                    <td className="px-3 py-3 text-gray-500 font-mono text-xs">{idx + 1}</td>
                    <td
                      className="px-3 py-3 font-medium text-gray-900"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'title', e.currentTarget.textContent || '')}
                    >{row.title}</td>
                    <td
                      className="px-3 py-3 font-mono text-xs text-gray-500 relative"
                      onMouseEnter={() => setHoveredDI(row.id)}
                      onMouseLeave={() => setHoveredDI(null)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="cursor-help border-b border-dashed border-steel/40"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => handleCellEdit(row.id, 'diNumber', e.currentTarget.textContent || '')}
                        >
                          {row.diNumber}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-px text-[8px] font-semibold uppercase rounded border leading-tight ${getRACIColor(getRACIParty(row))}`}>
                          {getRACIParty(row).length > 8 ? getRACIParty(row).slice(0, 3) : getRACIParty(row)}
                        </span>
                      </div>
                      {hoveredDI === row.id && (contractRefs[row.id] || contractRequirements[row.id]) && (
                        <div className={`absolute left-0 z-50 w-72 bg-white border border-border text-gray-900 text-xs rounded-lg p-3 shadow-xl pointer-events-none ${
                          idx < 2 ? 'top-full mt-2' : 'bottom-full mb-2'
                        }`}>
                          <p className="font-semibold text-accent mb-1">
                            <i className="fas fa-file-contract mr-1"></i>
                            Contract Reference
                          </p>
                          <p className="leading-relaxed text-gray-700">
                            {contractRefs[row.id] || contractRequirements[row.id]?.summaryRule || 'No reference available'}
                          </p>
                          {contractRequirements[row.id] && (
                            <p className="mt-1.5 text-steel text-[10px]">
                              {contractRequirements[row.id].block} · {contractRequirements[row.id].frequency} · {contractRequirements[row.id].submittalMethod}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td
                      className="px-3 py-3 text-xs"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'contractDueFinish', e.currentTarget.textContent || '')}
                    >{row.contractDueFinish}</td>
                    <td
                      className="px-3 py-3 text-xs"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'calculatedDueDate', e.currentTarget.textContent || '')}
                    >{row.calculatedDueDate}</td>
                    <td
                      className="px-3 py-3 text-xs text-steel"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'submittalGuidance', e.currentTarget.textContent || '')}
                    >{row.submittalGuidance}</td>
                    <td
                      className="px-3 py-3 text-xs"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'actualSubmissionDate', e.currentTarget.textContent || '')}
                    >{row.actualSubmissionDate || '—'}</td>
                    <td
                      className={`px-3 py-3 text-xs text-center font-semibold ${row.received === 'Yes' ? 'text-green-600' : 'text-red-500'}`}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'received', e.currentTarget.textContent || '')}
                    >{row.received}</td>
                    <td
                      className="px-3 py-3 text-xs text-center"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => handleCellEdit(row.id, 'calendarDaysToReview', e.currentTarget.textContent || '')}
                    >{row.calendarDaysToReview !== null ? row.calendarDaysToReview : '—'}</td>
                    <td
                      data-no-workflow
                      className="px-3 py-3 text-xs text-steel max-w-[180px] cursor-pointer group"
                      onClick={e => { e.stopPropagation(); setNotesRow(row) }}
                    >
                      <div className="truncate group-hover:text-accent transition-colors" title="Click to view full remarks">
                        {aiInsights[row.id]?.conciseNote || row.notes || '—'}
                      </div>
                      {aiInsights[row.id] && (
                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                          aiInsights[row.id].priority === 'Critical' ? 'bg-red-500/15 text-red-500' :
                          aiInsights[row.id].priority === 'High' ? 'bg-orange-500/15 text-orange-500' :
                          aiInsights[row.id].priority === 'Medium' ? 'bg-yellow-500/15 text-yellow-500' :
                          'bg-green-500/15 text-green-500'
                        }`}>
                          {aiInsights[row.id].priority}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                      {anchors[row.id] ? (
                        editedSinceSeal.has(row.id) ? (
                          <button
                            onClick={() => handleRowReseal(row)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent rounded text-xs font-medium transition-all"
                            title="Record edited since last seal — click to re-seal"
                          >
                            <i className="fas fa-shield-alt text-[10px]"></i>
                            Re-Seal
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/15 text-green-400 rounded text-xs">
                            <i className="fas fa-check-circle text-[10px]"></i>
                            Verified
                          </span>
                        )
                      ) : (
                        <span className="text-steel/40 text-xs">—</span>
                      )}
                      <button
                        onClick={() => openAuditForRow(row)}
                        className={`w-5 h-5 rounded inline-flex items-center justify-center transition-all ${
                          anchors[row.id]
                            ? 'text-steel/50 hover:text-accent hover:bg-accent/10'
                            : 'text-transparent group-hover:text-steel/30 group-hover:hover:text-accent group-hover:hover:bg-accent/10'
                        }`}
                        title="View Audit Trail"
                      >
                        <i className="fas fa-history text-[9px]"></i>
                      </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === row.id ? null : row.id)}
                        className="w-7 h-7 rounded-md bg-accent/10 hover:bg-accent/25 text-accent transition-all inline-flex items-center justify-center"
                      >
                        <i className="fas fa-bolt text-xs"></i>
                      </button>
                      {activeMenu === row.id && (
                        <AnchorVerifyMenu
                          row={row}
                          isAnchored={!!anchors[row.id]}
                          onAnchor={() => { onAnchor(row); setActiveMenu(null) }}
                          onVerify={() => { setVerifyRow(row); setActiveMenu(null) }}
                          onAIAssist={() => { setAiRow(row); setShowAI(true); setActiveMenu(null) }}
                          onClose={() => setActiveMenu(null)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center text-steel">
                      No deliverables match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-[1600px] mx-auto px-6 pb-6">
        <div className="flex items-center justify-center gap-2 py-3">
          <i className="fas fa-shield-alt text-accent/40 text-[10px]"></i>
          <p className="text-[11px] text-steel/60">All data sealed to Ledger — immutable trust layer active</p>
        </div>
      </div>

      {/* Modals */}
      {showAI && (
        <AIAssistModal
          row={aiRow}
          allData={data}
          anchors={anchors}
          editedSinceSeal={editedSinceSeal}
          onUpdateNotes={handleUpdateNotes}
          onClose={() => { setShowAI(false); setAiRow(null) }}
        />
      )}

      {/* AI Next Actions Panel */}
      <AINextActionsPanel
        data={data}
        anchors={anchors}
        editedSinceSeal={editedSinceSeal}
        visible={showAIPanel}
        onClose={() => setShowAIPanel(false)}
      />

      {/* Audit Trail Sidebar */}
      <AuditTrailSidebar
        visible={showAudit}
        rowId={auditRowId}
        rowTitle={auditRowTitle}
        onClose={() => setShowAudit(false)}
        key={`audit-${auditVersion}`}
      />
      {verifyRow && (
        <VerifyModal
          row={verifyRow}
          anchor={anchors[verifyRow.id]}
          onReseal={async (row) => {
            await handleRowReseal(row)
          }}
          onShowMismatch={() => {
            setMismatchRow(verifyRow)
            setVerifyRow(null)
          }}
          onClose={() => setVerifyRow(null)}
        />
      )}
      {mismatchRow && anchors[mismatchRow.id] && (
        <MismatchModal
          row={mismatchRow}
          anchor={anchors[mismatchRow.id]}
          onReseal={async (row) => {
            await handleRowReseal(row)
          }}
          onClose={() => setMismatchRow(null)}
        />
      )}
      {showReport && (
        <ReportModal
          data={hullData}
          anchors={anchors}
          role={role}
          rowFindings={rowFindings}
          contractRefs={contractRefs}
          hullFilter={platformFilter === 'all' ? undefined : platformFilter}
          aiInsights={aiInsights}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* External Sync Modal */}
      {showSync && (
        <ExternalSyncModal
          syncStatus={syncStatus}
          autoSyncEnabled={autoSyncEnabled}
          onToggleAutoSync={() => setAutoSyncEnabled(prev => !prev)}
          onManualSync={handleExternalSync}
          onToggleOffline={handleToggleOffline}
          onClose={() => setShowSync(false)}
        />
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          onMarkRead={handleMarkNotifRead}
          onMarkAllRead={handleMarkAllRead}
          onSendEmail={n => { setEmailNotification(n); setShowNotifications(false) }}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {/* Email Composer */}
      {emailNotification && (
        <EmailComposer
          notification={emailNotification}
          role={role}
          onClose={() => setEmailNotification(null)}
        />
      )}

      {/* Workflow Progress Popup */}
      {workflowRow && (
        <WorkflowProgressPopup
          row={workflowRow}
          anchors={anchors}
          role={role}
          aiInsight={aiInsights[workflowRow.id]}
          onUpdateNotes={handleUpdateNotes}
          onSendEmail={handleWorkflowEmail}
          onClose={() => setWorkflowRow(null)}
        />
      )}

      {/* Notes Detail Popup */}
      {notesRow && (
        <div className="modal-backdrop" onClick={() => setNotesRow(null)}>
          <div
            className="bg-white border border-border rounded-card p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  notesRow.status === 'green' ? 'bg-green-500/15' :
                  notesRow.status === 'yellow' ? 'bg-yellow-500/15' : 'bg-red-500/15'
                }`}>
                  <i className={`fas ${
                    notesRow.status === 'green' ? 'fa-check-circle text-green-500' :
                    notesRow.status === 'yellow' ? 'fa-exclamation-circle text-yellow-500' :
                    'fa-exclamation-triangle text-red-500'
                  }`}></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Contractual Guidance & Recommended Actions</h3>
                  <p className="text-steel text-xs">{notesRow.id} — {notesRow.title}</p>
                </div>
              </div>
              <button onClick={() => setNotesRow(null)} className="text-steel hover:text-gray-900 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Contract reference banner */}
            {contractRefs[notesRow.id] && (
              <div className="bg-accent/5 border border-accent/15 rounded-lg px-4 py-2.5 mb-4">
                <p className="text-xs font-semibold text-accent mb-0.5">
                  <i className="fas fa-file-contract mr-1.5"></i>Contract Reference
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">{contractRefs[notesRow.id]}</p>
              </div>
            )}

            {/* Findings list */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {rowFindings[notesRow.id] && rowFindings[notesRow.id].length > 0 ? (
                rowFindings[notesRow.id].map((finding, i) => {
                  const isCompliant = finding.startsWith('COMPLIANT:')
                  const isCritical = finding.startsWith('DELINQUENT:') || finding.startsWith('LATE SUBMITTAL:') || finding.startsWith('CORRECTIVE ACTION')
                  const isWarning = finding.startsWith('MINOR VARIANCE:') || finding.startsWith('DUE DATE') || finding.startsWith('REVISION') || finding.startsWith('RECEIPT') || finding.startsWith('GOV\'T REVIEW') || finding.startsWith('RECOMMENDED')
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border px-4 py-3 text-xs leading-relaxed ${
                        isCompliant ? 'bg-green-50 border-green-200 text-green-800' :
                        isCritical ? 'bg-red-50 border-red-200 text-red-800' :
                        isWarning ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                        'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      {finding}
                    </div>
                  )
                })
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-600 leading-relaxed">
                  {notesRow.notes || 'No remarks available. Run "Compare to Contract" to generate AI-powered contractual guidance.'}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4 pt-3 border-t border-border">
              <button
                onClick={() => setNotesRow(null)}
                className="px-4 py-2 bg-black/[0.03] hover:bg-black/[0.06] border border-border rounded-lg text-sm text-steel transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-seal success toast */}
      {resealToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
          <div className="bg-white border border-green-500/30 shadow-xl rounded-card px-5 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
              <i className="fas fa-shield-alt text-green-500 text-sm"></i>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Record re-sealed successfully</p>
              <p className="text-xs text-steel">Trust restored. {resealToast} now has a fresh Ledger Seal.</p>
            </div>
          </div>
        </div>
      )}

      {/* Sync success toast */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
          <div className="bg-white border border-purple-500/30 shadow-xl rounded-card px-5 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <i className="fas fa-database text-purple-500 text-sm"></i>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">External Sync Complete</p>
              <p className="text-xs text-steel">{syncToast}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
