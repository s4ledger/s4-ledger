import { useState } from 'react'
import { UserRole, CDRLRow, AnchorRecord } from '../types'
import { SyncStatus, SyncNotification } from '../utils/externalSync'

interface Props {
  role: UserRole
  data: CDRLRow[]
  anchors: Record<string, AnchorRecord>
  syncStatus: SyncStatus
  notifications: SyncNotification[]
  onClose: () => void
}

export default function ProfileDashboard({ role, data, anchors, syncStatus, notifications, onClose }: Props) {
  const [tab, setTab] = useState<'overview' | 'tasks' | 'history' | 'settings'>('overview')

  const verifiedCount = Object.keys(anchors).length
  const totalRows = data.length
  const overdue = data.filter(r => r.status === 'red').length
  const atRisk = data.filter(r => r.status === 'yellow').length
  const onTrack = data.filter(r => r.status === 'green').length
  const unreadNotifs = notifications.filter(n => !n.read).length

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: 'fa-user' },
    { id: 'tasks' as const, label: 'Tasks', icon: 'fa-tasks' },
    { id: 'history' as const, label: 'Audit History', icon: 'fa-history' },
    { id: 'settings' as const, label: 'Settings', icon: 'fa-cog' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center">
              <i className="fas fa-user-shield text-accent"></i>
            </div>
            <div>
              <h2 className="text-gray-900 font-semibold text-lg leading-tight">User Profile</h2>
              <p className="text-steel text-xs">{role} · PMS 300 Program Office</p>
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
                    <p className="font-medium">CAC Authenticated User</p>
                  </div>
                  <div>
                    <span className="text-steel text-xs">Role</span>
                    <p className="font-medium">{role}</p>
                  </div>
                  <div>
                    <span className="text-steel text-xs">Program</span>
                    <p className="font-medium">PMS 300 · Boats &amp; Craft</p>
                  </div>
                  <div>
                    <span className="text-steel text-xs">Access Level</span>
                    <p className="font-medium">FOUO Simulation</p>
                  </div>
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
            <div className="space-y-2">
              <p className="text-xs text-steel mb-2">Integrity verification records for this session</p>
              {Object.keys(anchors).length === 0 ? (
                <p className="text-sm text-steel italic py-4 text-center">No verification records yet</p>
              ) : (
                Object.values(anchors).map(a => {
                  const row = data.find(r => r.id === a.rowId)
                  return (
                    <div key={a.rowId} className="flex items-center gap-3 p-3 bg-gray-50 border border-border rounded-xl text-sm">
                      <i className="fas fa-check-double text-accent"></i>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{row?.title ?? a.rowId}</p>
                        <p className="text-xs text-steel truncate">Record ID: {a.txHash}</p>
                      </div>
                      <p className="text-xs text-steel whitespace-nowrap">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                  )
                })
              )}
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
                    <span className="font-medium">CAC / PIV Simulated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-steel">Role:</span>
                    <span className="font-medium">{role}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
