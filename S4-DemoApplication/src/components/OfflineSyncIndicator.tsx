/**
 * OfflineSyncIndicator — Shows offline/online status + sync queue
 * Displays in the header bar: connection status, queued changes count,
 * and last sync time. Expands to show queued changes detail.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  isOnline,
  onOnlineStatusChange,
  getQueuedChanges,
  getQueueCount,
  clearSyncedChanges,
  clearAllQueued,
  QueuedChange,
} from '../services/offlineStore'

interface Props {
  onSyncNow?: () => void
  lastPersist: string | null
}

export default function OfflineSyncIndicator({ onSyncNow, lastPersist }: Props) {
  const [online, setOnline] = useState(isOnline())
  const [queueCount, setQueueCount] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [queue, setQueue] = useState<QueuedChange[]>([])

  // Listen for online/offline transitions
  useEffect(() => {
    const unsub = onOnlineStatusChange((status) => {
      setOnline(status)
      if (status && onSyncNow) onSyncNow()
    })
    return unsub
  }, [onSyncNow])

  // Poll queue count
  useEffect(() => {
    const check = async () => {
      const count = await getQueueCount()
      setQueueCount(count)
    }
    check()
    const interval = setInterval(check, 3000)
    return () => clearInterval(interval)
  }, [])

  // Load queue details when expanded
  useEffect(() => {
    if (!expanded) return
    getQueuedChanges().then(setQueue)
  }, [expanded, queueCount])

  const handleClearSynced = useCallback(async () => {
    await clearSyncedChanges()
    const count = await getQueueCount()
    setQueueCount(count)
    setQueue(await getQueuedChanges())
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
          !online
            ? 'bg-amber-50 border-amber-300 text-amber-700'
            : queueCount > 0
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-green-50 border-green-200 text-green-700'
        }`}
      >
        {!online ? (
          <>
            <i className="fas fa-wifi-slash text-amber-500 text-[10px]"></i>
            <span>Offline</span>
          </>
        ) : queueCount > 0 ? (
          <>
            <i className="fas fa-cloud-upload-alt text-blue-500 text-[10px]"></i>
            <span>{queueCount} queued</span>
          </>
        ) : (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span>Synced</span>
          </>
        )}
      </button>

      {/* ─── Expanded panel ───────────────────────────────── */}
      {expanded && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border border-border z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-gray-50/50 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${!online ? 'bg-amber-100' : 'bg-green-100'}`}>
                  <i className={`fas ${!online ? 'fa-wifi-slash text-amber-500' : 'fa-cloud-check text-green-500'} text-[10px]`}></i>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-900">{online ? 'Online' : 'Offline Mode'}</p>
                  <p className="text-[9px] text-steel">
                    {online
                      ? 'All changes synced to cloud'
                      : 'Changes will sync when reconnected'}
                  </p>
                </div>
              </div>
              <button onClick={() => setExpanded(false)} className="text-steel/40 hover:text-steel text-xs">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-3 gap-2 p-3 border-b border-border">
            <div className="flex flex-col items-center py-1.5 rounded-lg bg-gray-50 border border-border">
              <span className={`text-sm font-bold ${!online ? 'text-amber-500' : 'text-green-500'}`}>
                {online ? 'ON' : 'OFF'}
              </span>
              <span className="text-[8px] text-steel uppercase tracking-wider">Connection</span>
            </div>
            <div className="flex flex-col items-center py-1.5 rounded-lg bg-gray-50 border border-border">
              <span className={`text-sm font-bold ${queueCount > 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                {queueCount}
              </span>
              <span className="text-[8px] text-steel uppercase tracking-wider">Queued</span>
            </div>
            <div className="flex flex-col items-center py-1.5 rounded-lg bg-gray-50 border border-border">
              <span className="text-sm font-bold text-gray-900">
                {lastPersist ? new Date(lastPersist).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
              <span className="text-[8px] text-steel uppercase tracking-wider">Last Save</span>
            </div>
          </div>

          {/* Queue list */}
          {queue.length > 0 && (
            <div className="max-h-48 overflow-y-auto">
              <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-900">Pending Changes</span>
                <button onClick={handleClearSynced} className="text-[9px] text-red-500 hover:text-red-700 font-medium">
                  Clear synced
                </button>
              </div>
              {queue.map(c => (
                <div key={c.id} className="px-3 py-1.5 border-t border-border/50 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <i className={`fas fa-${c.synced ? 'check-circle text-green-400' : 'clock text-amber-400'} text-[9px]`}></i>
                    <span className="text-[10px] font-medium text-gray-900 truncate flex-1">{c.rowId}</span>
                    <span className="text-[9px] text-steel">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[9px] text-steel ml-4 truncate">
                    {c.field}: "{c.oldValue || '—'}" → "{c.newValue}"
                  </p>
                </div>
              ))}
            </div>
          )}

          {queue.length === 0 && (
            <div className="px-4 py-6 text-center">
              <i className="fas fa-check-circle text-green-400 text-lg mb-1.5"></i>
              <p className="text-[11px] font-medium text-gray-900">All changes saved</p>
              <p className="text-[9px] text-steel">Data is persisted locally and synced to cloud</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-gray-50/50 rounded-b-xl flex items-center justify-between">
            <span className="text-[8px] text-steel/50">S4 Ledger · Offline-First Storage</span>
            {online && queueCount > 0 && onSyncNow && (
              <button
                onClick={onSyncNow}
                className="text-[9px] font-semibold text-accent hover:underline"
              >
                Sync Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
