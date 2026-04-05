import { useState, useEffect } from 'react'
import DraggableModal from './DraggableModal'
import { SyncStatus } from '../utils/externalSync'
import { getQueueCount, getQueuedChanges, clearSyncedChanges, type QueuedChange } from '../services/offlineStore'

interface Props {
  syncStatus: SyncStatus
  autoSyncEnabled: boolean
  onToggleAutoSync: () => void
  onManualSync: () => void | Promise<void>
  onToggleOffline: () => void
  onClose: () => void
  lastPersist?: string | null
}

export default function ExternalSyncModal({
  syncStatus,
  autoSyncEnabled,
  onToggleAutoSync,
  onManualSync,
  onToggleOffline,
  onClose,
  lastPersist,
}: Props) {
  const [syncing, setSyncing] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [queue, setQueue] = useState<QueuedChange[]>([])
  const [showQueue, setShowQueue] = useState(false)

  // Poll offline queue count
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
    if (!showQueue) return
    getQueuedChanges().then(setQueue)
  }, [showQueue, queueCount])

  async function handleManualSync() {
    setSyncing(true)
    try {
      await onManualSync()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <DraggableModal className="bg-white border border-border rounded-card shadow-2xl" defaultWidth={520}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
              <i className="fas fa-database text-accent text-sm"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">External Database Sync</h3>
              <p className="text-steel text-xs">NSERC IDE (PMS 300) · Service Craft & Small Boats</p>
            </div>
          </div>
          <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-50 border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-steel uppercase tracking-wide">Connection Status</p>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${syncStatus.isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
              <span className={`text-xs font-medium ${syncStatus.isOnline ? 'text-green-600' : 'text-red-500'}`}>
                {syncStatus.isOnline ? 'Connected' : 'Offline Mode'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-steel uppercase">Last Sync</p>
              <p className="text-sm font-semibold text-gray-900">
                {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString() : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-steel uppercase">Total Syncs</p>
              <p className="text-sm font-semibold text-gray-900">{syncStatus.totalSyncs}</p>
            </div>
            <div>
              <p className="text-[10px] text-steel uppercase">Changes Synced</p>
              <p className="text-sm font-semibold text-gray-900">{syncStatus.changesSynced}</p>
            </div>
            <div>
              <p className="text-[10px] text-steel uppercase">Queued</p>
              <p className="text-sm font-semibold text-gray-900">
                {queueCount > 0 ? (
                  <button onClick={() => setShowQueue(!showQueue)} className="text-blue-600 hover:underline">{queueCount}</button>
                ) : (
                  <span className="text-green-600">0</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Auto-Sync Toggle */}
        <div className="flex items-center justify-between p-3 bg-white border border-border rounded-lg mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Auto-Sync (5-minute interval)</p>
            <p className="text-xs text-steel">Automatically import submissions from NSERC IDE</p>
          </div>
          <button
            onClick={onToggleAutoSync}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              autoSyncEnabled ? 'bg-accent' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Offline Toggle */}
        <div className="flex items-center justify-between p-3 bg-white border border-border rounded-lg mb-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Offline Mode</p>
            <p className="text-xs text-steel">Queue changes locally when disconnected</p>
          </div>
          <button
            onClick={onToggleOffline}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              !syncStatus.isOnline ? 'bg-orange-400' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                !syncStatus.isOnline ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Offline Queue Details */}
        {showQueue && queue.length > 0 && (
          <div className="bg-white border border-border rounded-lg mb-4 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-900">Pending Changes ({queue.length})</span>
              <button
                onClick={async () => { await clearSyncedChanges(); const c = await getQueueCount(); setQueueCount(c); setQueue(await getQueuedChanges()) }}
                className="text-[10px] text-red-500 hover:text-red-700 font-medium"
              >Clear synced</button>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {queue.map(c => (
                <div key={c.id} className="px-3 py-2 border-b border-border/50 last:border-0 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <i className={`fas fa-${c.synced ? 'check-circle text-green-400' : 'clock text-amber-400'} text-[10px]`}></i>
                    <span className="text-xs font-medium text-gray-900 truncate flex-1">{c.field}</span>
                    <span className="text-[10px] text-steel">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[10px] text-steel ml-4 truncate">
                    &ldquo;{c.oldValue || '\u2014'}&rdquo; &rarr; &ldquo;{c.newValue}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Local Save Info */}
        {lastPersist && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <i className="fas fa-hdd text-green-500 text-xs"></i>
            <span className="text-xs text-green-700">
              Last local save: {new Date(lastPersist).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Manual Sync Button */}
        <button
          onClick={handleManualSync}
          disabled={syncing || !syncStatus.isOnline}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white rounded-lg text-sm font-medium transition-all"
        >
          {syncing ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Importing Latest Submissions…
            </>
          ) : (
            <>
              <i className="fas fa-sync-alt"></i>
              Import Latest Submissions
            </>
          )}
        </button>

        {!syncStatus.isOnline && (
          <p className="text-xs text-orange-500 text-center mt-2">
            <i className="fas fa-exclamation-triangle mr-1"></i>
            Offline — sync will resume when connection is restored
          </p>
        )}

        {/* Data sources list */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[10px] text-steel uppercase tracking-wide mb-2">Connected Data Sources</p>
          <div className="space-y-1.5">
            {['NSERC IDE (PMS 300)'].map(src => (
              <div key={src} className="flex items-center gap-2 text-xs text-gray-700">
                <span className={`w-1.5 h-1.5 rounded-full ${syncStatus.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                {src}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DraggableModal>
  )
}
