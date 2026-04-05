import { useState, useMemo, useEffect } from 'react'
import DraggableModal from './DraggableModal'
import { UserRole, DRLRow, AnchorRecord } from '../types'
import { SyncStatus, SyncNotification } from '../utils/externalSync'
import { useAuth } from '../contexts/AuthContext'
import { AuditEvent, getAuditLog, getAuditSummary } from '../utils/auditTrail'
import { ChangeEntry, getAllChanges } from '../utils/changeLog'
import { chatWithAI } from '../utils/aiService'

interface Props {
  role: UserRole
  data: DRLRow[]
  anchors: Record<string, AnchorRecord>
  syncStatus: SyncStatus
  notifications: SyncNotification[]
  onClose: () => void
}

export default function ProfileDashboard({ role, data, anchors, syncStatus, notifications, onClose }: Props) {
  const { session, profile, signOut, exitDemo, isDemo } = useAuth()
  const [tab, setTab] = useState<'overview' | 'tasks' | 'history' | 'settings'>('overview')
  const [historySubTab, setHistorySubTab] = useState<'audit' | 'changes'>('audit')
  const [historySearch, setHistorySearch] = useState('')
  const [historyDate, setHistoryDate] = useState('')
  const [selectedAuditEvent, setSelectedAuditEvent] = useState<AuditEvent | null>(null)
  const [selectedChange, setSelectedChange] = useState<ChangeEntry | null>(null)
  const [detailAI, setDetailAI] = useState<string | null>(null)
  const [detailAILoading, setDetailAILoading] = useState(false)

  const verifiedCount = Object.keys(anchors).length
  const totalRows = data.length
  const overdue = data.filter(r => r.status === 'red').length
  const atRisk = data.filter(r => r.status === 'yellow').length
  const onTrack = data.filter(r => r.status === 'green').length
  const unreadNotifs = notifications.filter(n => !n.read).length

  // Audit Trail data (global — all rows)
  const auditEvents = useMemo(() => [...getAuditLog()].reverse(), [tab])
  const auditSummary = useMemo(() => getAuditSummary(), [tab])
  const [changeEntries, setChangeEntries] = useState<ChangeEntry[]>([])

  useEffect(() => {
    if (tab === 'history') {
      let cancelled = false
      getAllChanges(500).then(data => {
        if (!cancelled) setChangeEntries(data)
      })
      return () => { cancelled = true }
    }
  }, [tab])

  const filteredAuditEvents = useMemo(() => {
    let result = auditEvents
    if (historySearch) {
      const q = historySearch.toLowerCase()
      result = result.filter(e =>
        e.type.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.aiSummary && e.aiSummary.toLowerCase().includes(q)) ||
        e.rowId.toLowerCase().includes(q) ||
        (e.rowTitle && e.rowTitle.toLowerCase().includes(q))
      )
    }
    if (historyDate) {
      result = result.filter(e => e.timestamp.startsWith(historyDate))
    }
    return result
  }, [auditEvents, historySearch, historyDate])

  const filteredChanges = useMemo(() => {
    let result = changeEntries
    if (historySearch) {
      const q = historySearch.toLowerCase()
      result = result.filter(e =>
        (e.field_label && e.field_label.toLowerCase().includes(q)) ||
        (e.old_value && e.old_value.toLowerCase().includes(q)) ||
        (e.new_value && e.new_value.toLowerCase().includes(q)) ||
        (e.user_email && e.user_email.toLowerCase().includes(q)) ||
        (e.row_id && e.row_id.toLowerCase().includes(q)) ||
        (e.row_title && e.row_title.toLowerCase().includes(q))
      )
    }
    if (historyDate) {
      result = result.filter(e => e.created_at.startsWith(historyDate))
    }
    return result
  }, [changeEntries, historySearch, historyDate])

  const EVENT_ICONS: Record<string, { icon: string; bg: string; text: string }> = {
    Sealed:              { icon: 'fa-shield-alt',       bg: 'bg-green-500/15',  text: 'text-green-600' },
    Verified:            { icon: 'fa-check-circle',     bg: 'bg-green-500/15',  text: 'text-green-600' },
    'Mismatch Detected': { icon: 'fa-exclamation-triangle', bg: 'bg-red-500/15', text: 'text-red-500' },
    'Re-Sealed':         { icon: 'fa-redo',             bg: 'bg-accent/15',     text: 'text-accent' },
    Edited:              { icon: 'fa-pen',              bg: 'bg-yellow-500/15', text: 'text-yellow-600' },
    'AI Remark Updated': { icon: 'fa-brain',            bg: 'bg-purple-500/15', text: 'text-purple-600' },
    'External Data Feed':{ icon: 'fa-satellite-dish',   bg: 'bg-blue-500/15',   text: 'text-blue-600' },
  }

  function openAuditDetail(evt: AuditEvent) {
    setSelectedChange(null)
    setSelectedAuditEvent(evt)
    setDetailAI(null)
    setDetailAILoading(true)
    const anchor = anchors?.[evt.rowId]
    const sealCtx = anchor
      ? `This record is sealed (tx: ${anchor.txHash}, ledger: ${anchor.ledgerIndex}).`
      : 'This record has not been sealed yet.'
    const editCtx = evt.details && evt.type === 'Edited'
      ? `Field "${evt.details.field}" changed from "${evt.details.oldValue}" to "${evt.details.newValue}".`
      : ''
    chatWithAI({
      message: `Analyze this audit event for a government program manager.\nEvent: ${evt.type}\nRecord: ${evt.rowId} — "${evt.rowTitle}"\nTimestamp: ${evt.timestamp}\nDescription: ${evt.description}\n${editCtx}\n${sealCtx}\n\nProvide: (1) risk/compliance assessment, (2) data integrity implications, (3) recommended actions. 3-4 sentences, Navy/DoD tone.`,
      tool_context: 'audit_analysis'
    }).then(r => setDetailAI(r.response || evt.aiSummary)).catch(() => setDetailAI(evt.aiSummary)).finally(() => setDetailAILoading(false))
  }

  function openChangeDetail(entry: ChangeEntry) {
    setSelectedAuditEvent(null)
    setSelectedChange(entry)
    setDetailAI(null)
    setDetailAILoading(true)
    const anchor = anchors?.[entry.row_id]
    const sealCtx = anchor
      ? `Record sealed (tx: ${anchor.txHash}, ledger: ${anchor.ledgerIndex}).`
      : 'Record not yet sealed.'
    chatWithAI({
      message: `Analyze this field change for a government program manager.\nField: ${entry.field_label}\nOld: "${entry.old_value}"\nNew: "${entry.new_value}"\nRecord: ${entry.row_id} — "${entry.row_title}"\nChanged by: ${entry.user_email || 'Unknown'} (${entry.user_role || 'Unknown'})\n${sealCtx}\n\nProvide: (1) impact assessment, (2) data integrity implications, (3) 2-3 recommended next actions. Professional Navy/DoD tone.`,
      tool_context: 'change_analysis'
    }).then(r => setDetailAI(r.response || 'Change recorded.')).catch(() => setDetailAI('Change recorded in audit trail.')).finally(() => setDetailAILoading(false))
  }

  function closeDetail() {
    setSelectedAuditEvent(null)
    setSelectedChange(null)
    setDetailAI(null)
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: 'fa-user' },
    { id: 'tasks' as const, label: 'Tasks', icon: 'fa-tasks' },
    { id: 'history' as const, label: 'Audit History', icon: 'fa-history' },
    { id: 'settings' as const, label: 'Settings', icon: 'fa-cog' },
  ]

  return (
    <DraggableModal className="bg-white rounded-2xl shadow-2xl border border-border overflow-hidden" defaultWidth={720}>
      <div className="max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center">
              <i className="fas fa-user-shield text-accent"></i>
            </div>
            <div>
              <h2 className="text-gray-900 font-semibold text-lg leading-tight">
                {profile?.display_name || 'User Profile'}
              </h2>
              <p className="text-steel text-xs">
                {role} · PMS 300 Program Office
                {!isDemo && session && <span className="ml-1 text-green-500">· Authenticated</span>}
                {isDemo && <span className="ml-1 text-yellow-500">· Demo Mode</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Tab Nav */}
        <div className="flex border-b border-border bg-gray-50 px-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-steel hover:text-gray-700'
              }`}
            >
              <i className={`fas ${t.icon} text-xs`}></i>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'overview' && (
            <div className="space-y-5">
              {/* User Card */}
              <div className="bg-gray-50 rounded-xl p-4 border border-border">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-steel text-xs">Name</span>
                    <p className="font-medium">{profile?.display_name || (isDemo ? 'Demo User' : 'Authenticated User')}</p>
                  </div>
                  <div>
                    <span className="text-steel text-xs">Email</span>
                    <p className="font-medium truncate">{profile?.email || (isDemo ? 'demo@s4ledger.com' : '—')}</p>
                  </div>
                  <div>
                    <span className="text-steel text-xs">Role</span>
                    <p className="font-medium">{role}</p>
                  </div>
                  <div>
                    <span className="text-steel text-xs">Organization</span>
                    <p className="font-medium">{profile?.organization || '—'}</p>
                  </div>
                  <div>
                    <span className="text-steel text-xs">Program</span>
                    <p className="font-medium">PMS 300 · Boats &amp; Craft</p>
                  </div>
                  <div>
                    <span className="text-steel text-xs">Access Level</span>
                    <p className="font-medium">{isDemo ? 'Demo Mode' : 'FOUO Simulation'}</p>
                  </div>
                  {profile?.last_login && (
                    <div className="col-span-2">
                      <span className="text-steel text-xs">Last Login</span>
                      <p className="font-medium">{new Date(profile.last_login).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-green-50 rounded-xl p-3 border border-green-200 text-center">
                  <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
                  <p className="text-xs text-green-700">Verified</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-center">
                  <p className="text-2xl font-bold text-blue-600">{totalRows}</p>
                  <p className="text-xs text-blue-700">Deliverables</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{atRisk}</p>
                  <p className="text-xs text-yellow-700">At Risk</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 border border-red-200 text-center">
                  <p className="text-2xl font-bold text-red-600">{overdue}</p>
                  <p className="text-xs text-red-700">Overdue</p>
                </div>
              </div>

              {/* Sync Status */}
              <div className="bg-gray-50 rounded-xl p-4 border border-border">
                <h3 className="text-sm font-semibold mb-2">Sync Status</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${syncStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-steel">{syncStatus.connected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <div>
                    <span className="text-steel">Last Sync: </span>
                    <span className="font-medium">{syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString() : 'Never'}</span>
                  </div>
                  <div>
                    <span className="text-steel">Total Syncs: </span>
                    <span className="font-medium">{syncStatus.totalSyncs}</span>
                  </div>
                  <div>
                    <span className="text-steel">Unread Alerts: </span>
                    <span className="font-medium">{unreadNotifs}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-3">
              <p className="text-xs text-steel mb-2">Active tasks based on deliverable status</p>
              {overdue > 0 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
                  <div>
                    <p className="text-sm font-medium text-red-700">Review {overdue} overdue deliverable{overdue > 1 ? 's' : ''}</p>
                    <p className="text-xs text-red-600 mt-0.5">Immediate action required — past contractual due dates</p>
                  </div>
                </div>
              )}
              {atRisk > 0 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <i className="fas fa-exclamation-triangle text-yellow-500 mt-0.5"></i>
                  <div>
                    <p className="text-sm font-medium text-yellow-700">Monitor {atRisk} at-risk deliverable{atRisk > 1 ? 's' : ''}</p>
                    <p className="text-xs text-yellow-600 mt-0.5">Approaching due dates or incomplete submission guidance</p>
                  </div>
                </div>
              )}
              {verifiedCount < totalRows && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <i className="fas fa-shield-alt text-blue-500 mt-0.5"></i>
                  <div>
                    <p className="text-sm font-medium text-blue-700">Verify {totalRows - verifiedCount} remaining deliverable{totalRows - verifiedCount > 1 ? 's' : ''}</p>
                    <p className="text-xs text-blue-600 mt-0.5">Record integrity verification for tamper-evident audit trail</p>
                  </div>
                </div>
              )}
              {onTrack > 0 && (
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
                  <div>
                    <p className="text-sm font-medium text-green-700">{onTrack} deliverable{onTrack > 1 ? 's' : ''} on track</p>
                    <p className="text-xs text-green-600 mt-0.5">No action needed — within contractual timelines</p>
                  </div>
                </div>
              )}
              {unreadNotifs > 0 && (
                <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <i className="fas fa-bell text-purple-500 mt-0.5"></i>
                  <div>
                    <p className="text-sm font-medium text-purple-700">Review {unreadNotifs} unread notification{unreadNotifs > 1 ? 's' : ''}</p>
                    <p className="text-xs text-purple-600 mt-0.5">Sync alerts, AI insights, and RACI workflow updates</p>
                  </div>
                </div>
              )}
              {overdue === 0 && atRisk === 0 && verifiedCount >= totalRows && unreadNotifs === 0 && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <i className="fas fa-trophy text-green-500"></i>
                  <p className="text-sm text-green-700 font-medium">All clear — no outstanding tasks</p>
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-3 relative">
              {/* Sub-tabs: Audit Trail / Change History */}
              <div className="flex border-b border-border -mx-6 px-6">
                <button
                  onClick={() => { setHistorySubTab('audit'); closeDetail() }}
                  className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    historySubTab === 'audit' ? 'text-accent border-accent' : 'text-steel border-transparent hover:text-gray-700'
                  }`}
                >
                  <i className="fas fa-history mr-1 text-[10px]"></i>Audit Trail
                  <span className="ml-1.5 text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">{filteredAuditEvents.length}</span>
                </button>
                <button
                  onClick={() => { setHistorySubTab('changes'); closeDetail() }}
                  className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    historySubTab === 'changes' ? 'text-accent border-accent' : 'text-steel border-transparent hover:text-gray-700'
                  }`}
                >
                  <i className="fas fa-code-branch mr-1 text-[10px]"></i>Change History
                  <span className="ml-1.5 text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">{filteredChanges.length}</span>
                </button>
              </div>

              {/* Search + Date */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-steel/40 text-[10px]"></i>
                  <input
                    type="text"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    placeholder={historySubTab === 'audit' ? 'Search events…' : 'Search changes…'}
                    className="w-full pl-7 pr-7 py-1.5 text-[11px] bg-white border border-border rounded-md text-gray-700 focus:outline-none focus:border-accent placeholder:text-steel/40"
                  />
                  {historySearch && (
                    <button onClick={() => setHistorySearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-steel/40 hover:text-steel">
                      <i className="fas fa-times text-[9px]"></i>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <i className="fas fa-calendar-alt absolute left-2 top-1/2 -translate-y-1/2 text-steel/40 text-[10px] pointer-events-none"></i>
                  <input
                    type="date"
                    value={historyDate}
                    onChange={e => setHistoryDate(e.target.value)}
                    className="pl-6 pr-1 py-1.5 text-[11px] bg-white border border-border rounded-md text-gray-700 focus:outline-none focus:border-accent w-[130px]"
                  />
                </div>
                {(historySearch || historyDate) && (
                  <button onClick={() => { setHistorySearch(''); setHistoryDate('') }} className="text-[10px] text-accent hover:text-accent/70 font-medium whitespace-nowrap">
                    Clear
                  </button>
                )}
              </div>

              {/* Trust summary bar */}
              {historySubTab === 'audit' && (
                <div className="flex items-center gap-3 text-[11px] bg-gray-50 border border-border rounded-lg px-3 py-2">
                  <span className="text-steel">Seals: <strong className="text-gray-800">{auditSummary.totalSeals}</strong></span>
                  <span className="text-steel">Verifications: <strong className="text-gray-800">{auditSummary.totalVerifications}</strong></span>
                  <span className="text-steel">Edits: <strong className="text-gray-800">{auditSummary.totalEdits}</strong></span>
                  {auditSummary.totalMismatches > 0 && (
                    <span className="text-red-500">Mismatches: <strong>{auditSummary.totalMismatches}</strong></span>
                  )}
                  <span className={`ml-auto font-semibold ${auditSummary.trustColor === 'green' ? 'text-green-600' : auditSummary.trustColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>
                    {auditSummary.trustStatus}
                  </span>
                </div>
              )}

              {/* Audit event list */}
              {historySubTab === 'audit' && !selectedAuditEvent && (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {filteredAuditEvents.length === 0 ? (
                    <p className="text-sm text-steel italic py-6 text-center">No audit events{historySearch || historyDate ? ' match your filters' : ' recorded yet'}</p>
                  ) : filteredAuditEvents.map(evt => {
                    const s = EVENT_ICONS[evt.type] || EVENT_ICONS.Edited
                    return (
                      <div key={evt.id}
                        className="flex items-start gap-3 p-3 bg-white border border-border rounded-xl text-sm cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all"
                        onClick={() => openAuditDetail(evt)}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${s.bg} flex items-center justify-center`}>
                          <i className={`fas ${s.icon} ${s.text} text-xs`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${s.text}`}>{evt.type}</span>
                            <span className="text-[9px] font-mono bg-gray-100 text-steel px-1 py-0.5 rounded">{evt.rowId}</span>
                            <span className="text-[10px] text-steel/50 ml-auto">{new Date(evt.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-gray-700 mt-0.5 truncate">{evt.description}</p>
                          {evt.aiSummary && (
                            <p className="text-[10px] text-steel mt-0.5 truncate"><i className="fas fa-brain text-accent/50 mr-1 text-[8px]"></i>{evt.aiSummary}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Change list */}
              {historySubTab === 'changes' && !selectedChange && (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {filteredChanges.length === 0 ? (
                    <p className="text-sm text-steel italic py-6 text-center">No changes{historySearch || historyDate ? ' match your filters' : ' recorded yet'}</p>
                  ) : filteredChanges.map(entry => (
                    <div key={entry.id}
                      className="p-3 bg-white border border-border rounded-xl text-sm cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all"
                      onClick={() => openChangeDetail(entry)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">{entry.change_type}</span>
                        <span className="text-[9px] font-mono bg-gray-100 text-steel px-1 py-0.5 rounded">{entry.row_id}</span>
                        <span className="text-[10px] text-steel/50 ml-auto">{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-900">{entry.field_label}</span>
                        {entry.user_email && <span className="text-[10px] text-steel">by {entry.user_email.split('@')[0]}</span>}
                      </div>
                      {(entry.old_value || entry.new_value) && (
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          {entry.old_value && <span className="px-1.5 py-0.5 bg-red-50 text-red-500 rounded line-through truncate max-w-[200px]">{entry.old_value}</span>}
                          {entry.old_value && entry.new_value && <i className="fas fa-arrow-right text-steel/30 text-[8px]"></i>}
                          {entry.new_value && <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded truncate max-w-[200px]">{entry.new_value}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Audit Detail Popup */}
              {selectedAuditEvent && (() => {
                const evt = selectedAuditEvent
                const s = EVENT_ICONS[evt.type] || EVENT_ICONS.Edited
                const anchor = anchors?.[evt.rowId]
                return (
                  <div className="space-y-3">
                    <button onClick={closeDetail} className="text-[11px] text-accent hover:text-accent/70 font-medium">
                      <i className="fas fa-arrow-left mr-1"></i>Back to Audit Trail
                    </button>
                    <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${s.bg} flex items-center justify-center`}>
                          <i className={`fas ${s.icon} ${s.text} text-xs`}></i>
                        </div>
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${s.text}`}>{evt.type}</span>
                          <p className="text-[10px] text-steel">{evt.rowId} · {new Date(evt.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700">{evt.description}</p>
                      {evt.details && evt.type === 'Edited' && (
                        <div className="bg-gray-50 border border-border rounded-lg p-3">
                          <h4 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2"><i className="fas fa-exchange-alt mr-1"></i>Before vs. After</h4>
                          <div className="space-y-1.5">
                            <div><span className="text-[9px] font-bold text-red-400">BEFORE</span><div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1 mt-0.5 break-words">{evt.details.oldValue || '(empty)'}</div></div>
                            <div><span className="text-[9px] font-bold text-green-500">AFTER</span><div className="text-[11px] text-green-800 bg-green-50 border border-green-100 rounded px-2 py-1 mt-0.5 break-words">{evt.details.newValue || '(empty)'}</div></div>
                          </div>
                        </div>
                      )}
                      {anchor && (
                        <div className="bg-gradient-to-r from-accent/5 to-navy/5 border border-accent/20 rounded-lg p-3">
                          <h4 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5"><i className="fas fa-shield-alt mr-1"></i>S4 Ledger Trust Layer</h4>
                          <div className="space-y-1 text-[11px]">
                            <div><span className="text-steel">Tx Hash:</span> <span className="font-mono text-[10px] text-navy break-all">{anchor.txHash}</span></div>
                            <div><span className="text-steel">Ledger:</span> <span className="font-mono text-[10px] text-navy">{anchor.ledgerIndex}</span></div>
                            {anchor.explorerUrl && (
                              <a href={anchor.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:text-accent/80 mt-1">
                                <i className="fas fa-external-link-alt"></i>Verify on Ledger
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                        <h4 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5"><i className="fas fa-robot mr-1"></i>AI Analysis</h4>
                        {detailAILoading ? (
                          <p className="text-[11px] text-steel"><i className="fas fa-spinner fa-spin mr-1"></i>Analyzing…</p>
                        ) : detailAI ? (
                          <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap">{detailAI}</p>
                        ) : (
                          <p className="text-[11px] text-steel italic">Analysis unavailable</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Change Detail Popup */}
              {selectedChange && (() => {
                const entry = selectedChange
                const anchor = anchors?.[entry.row_id]
                return (
                  <div className="space-y-3">
                    <button onClick={closeDetail} className="text-[11px] text-accent hover:text-accent/70 font-medium">
                      <i className="fas fa-arrow-left mr-1"></i>Back to Change History
                    </button>
                    <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">{entry.change_type}</span>
                          <span className="text-xs font-semibold text-gray-900">{entry.field_label}</span>
                        </div>
                        <p className="text-[10px] text-steel">{entry.row_id}{entry.row_title ? ` · ${entry.row_title}` : ''} · {new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 border border-border rounded-lg p-3">
                        <h4 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2"><i className="fas fa-exchange-alt mr-1"></i>Before vs. After</h4>
                        <div className="space-y-1.5">
                          <div><span className="text-[9px] font-bold text-red-400">BEFORE</span><div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1 mt-0.5 break-words whitespace-pre-wrap">{entry.old_value || '(empty)'}</div></div>
                          <div><span className="text-[9px] font-bold text-green-500">AFTER</span><div className="text-[11px] text-green-800 bg-green-50 border border-green-100 rounded px-2 py-1 mt-0.5 break-words whitespace-pre-wrap">{entry.new_value || '(empty)'}</div></div>
                        </div>
                      </div>
                      {anchor && (
                        <div className="bg-gradient-to-r from-accent/5 to-navy/5 border border-accent/20 rounded-lg p-3">
                          <h4 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5"><i className="fas fa-shield-alt mr-1"></i>S4 Ledger Trust Layer</h4>
                          <div className="space-y-1 text-[11px]">
                            <div><span className="text-steel">Tx Hash:</span> <span className="font-mono text-[10px] text-navy break-all">{anchor.txHash}</span></div>
                            <div><span className="text-steel">Ledger:</span> <span className="font-mono text-[10px] text-navy">{anchor.ledgerIndex}</span></div>
                            {anchor.explorerUrl && (
                              <a href={anchor.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:text-accent/80 mt-1">
                                <i className="fas fa-external-link-alt"></i>Verify on Ledger
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                        <h4 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5"><i className="fas fa-robot mr-1"></i>AI Analysis &amp; Next Actions</h4>
                        {detailAILoading ? (
                          <p className="text-[11px] text-steel"><i className="fas fa-spinner fa-spin mr-1"></i>Analyzing…</p>
                        ) : detailAI ? (
                          <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap">{detailAI}</p>
                        ) : (
                          <p className="text-[11px] text-steel italic">Analysis unavailable</p>
                        )}
                      </div>
                      <div className="bg-gray-50 border border-border rounded-lg p-3">
                        <h4 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5"><i className="fas fa-info-circle mr-1"></i>Metadata</h4>
                        <div className="grid grid-cols-2 gap-y-1 text-[11px]">
                          <span className="text-steel">Change ID</span><span className="font-mono text-[10px] text-navy">{entry.id}</span>
                          {entry.user_email && <><span className="text-steel">User</span><span className="text-navy">{entry.user_email}</span></>}
                          {entry.user_role && <><span className="text-steel">Role</span><span className="text-navy">{entry.user_role}</span></>}
                          {entry.user_org && <><span className="text-steel">Org</span><span className="text-navy">{entry.user_org}</span></>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-border">
                <h3 className="text-sm font-semibold mb-3">Preferences</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between text-sm">
                    <span className="text-steel">Auto-sync on startup</span>
                    <span className="w-8 h-5 rounded-full bg-accent/20 border border-accent/30 flex items-center px-0.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-accent translate-x-3 transition-transform"></span>
                    </span>
                  </label>
                  <label className="flex items-center justify-between text-sm">
                    <span className="text-steel">Desktop notifications</span>
                    <span className="w-8 h-5 rounded-full bg-accent/20 border border-accent/30 flex items-center px-0.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-accent translate-x-3 transition-transform"></span>
                    </span>
                  </label>
                  <label className="flex items-center justify-between text-sm">
                    <span className="text-steel">AI insights on edit</span>
                    <span className="w-8 h-5 rounded-full bg-accent/20 border border-accent/30 flex items-center px-0.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-accent translate-x-3 transition-transform"></span>
                    </span>
                  </label>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-border">
                <h3 className="text-sm font-semibold mb-3">Verification Ledger</h3>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-steel">Network:</span>
                    <span className="font-medium">S4 Production</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-steel">Fee per record:</span>
                    <span className="font-medium">0.01 SLS</span>
                  </div>
                  <p className="text-xs text-steel mt-2">Integrity records are written to the S4 Ledger verification layer</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-border">
                <h3 className="text-sm font-semibold mb-3">Session</h3>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-steel">Authentication:</span>
                    <span className="font-medium">
                      {session ? 'Supabase Auth (Email/Password)' : 'Demo Mode (Simulated)'}
                    </span>
                  </div>
                  {session && profile && (
                    <div className="flex items-center gap-2">
                      <span className="text-steel">Email:</span>
                      <span className="font-medium">{profile.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-steel">Role:</span>
                    <span className="font-medium">{role}</span>
                  </div>
                </div>
                {session ? (
                  <button
                    onClick={async () => { await signOut(); onClose() }}
                    className="mt-3 w-full py-2 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-sign-out-alt"></i>Sign Out
                  </button>
                ) : isDemo ? (
                  <button
                    onClick={() => { exitDemo(); onClose() }}
                    className="mt-3 w-full py-2 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-sign-out-alt"></i>Exit Demo &amp; Sign In
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </DraggableModal>
  )
}
