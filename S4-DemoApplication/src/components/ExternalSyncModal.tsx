import { useState } from 'react'
import { SyncStatus } from '../utils/externalSync'

interface Props {
  syncStatus: SyncStatus
  autoSyncEnabled: boolean
  onToggleAutoSync: () => void
  onManualSync: () => void | Promise<void>
  onToggleOffline: () => void
  onClose: () => void
}

export default function ExternalSyncModal({
  syncStatus,
  autoSyncEnabled,
  onToggleAutoSync,
  onManualSync,
  onToggleOffline,
  onClose,
}: Props) {
  const [syncing, setSyncing] = useState(false)

  async function handleManualSync() {
    setSyncing(true)
    try {
      await onManualSync()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-white border border-border rounded-card p-6 max-w-lg w-full mx-4 animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
              <i className="fas fa-database text-accent text-sm"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">External Database Sync</h3>
              <p className="text-steel text-xs">NSERC IDE (PMS 300) · Constellation-class DRL</p>
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
          <div className="grid grid-cols-3 gap-3">
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
    </div>
  )
}
