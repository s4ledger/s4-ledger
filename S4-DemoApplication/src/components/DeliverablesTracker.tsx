/**
 * ═══════════════════════════════════════════════════════════════════
 *  Deliverables Tracker — v2 Shell (2026-05-28)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Apple.com / Steve Jobs aesthetic.  Light mode only — no `dark:` variants.
 *
 *  Layout
 *  ──────
 *    ┌──────────────────────────────────────────────────────────────┐
 *    │  Top bar — tool name · IDE sync indicator · Activity · Exit  │
 *    ├──────────┬───────────────────────────────────────────────────┤
 *    │   Left   │  Active feature view                              │
 *    │   rail   │  (Tracker / Brief / Actions / Analytics / …)      │
 *    │  (8 nav) │                                                   │
 *    └──────────┴───────────────────────────────────────────────────┘
 *
 *  Each of the 8 spreadsheet tabs in `Analysis of CSY DRLs (5.7.2026).xlsx`
 *  becomes one feature view, accessed via the left rail.  The shell ships
 *  with placeholders for views 2–8; they are filled in steps 4–11.
 *
 *  Props signature is identical to v1 so `App.tsx` keeps working unchanged.
 *  IDE auto-pull (`realSyncPipeline` → `nsercIdeService`) is preserved.
 *  Every meaningful action is recorded in the in-tool Activity Log
 *  (localStorage today, Supabase later — see `services/activityLog.ts`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AnchorRecord, Contract, DRLRow, UserRole } from '../types'
import type { ActivityLogEntry, FeatureKey, WeeklySnapshot } from '../types/deliverablesV2'
import { useAuth } from '../contexts/AuthContext'
import { useProgramSchedule } from '../hooks/useProgramSchedule'
import { realSyncPipeline } from '../utils/externalSync'
import {
  getActivityLog,
  logActivity,
  subscribe as subscribeActivity,
  clearActivityLog,
} from '../services/activityLog'
import {
  FEATURES,
} from '../data/deliverablesDemoData'
import { VESSELS, getVesselDataset, type VesselDataset, type VesselId } from '../data/vesselDatasets'
import TrackerView from './deliverables/TrackerView'
import ExecutiveBriefView from './deliverables/ExecutiveBriefView'
import ActionItemsView from './deliverables/ActionItemsView'
import AnalyticsView from './deliverables/AnalyticsView'
import ArchiveView from './deliverables/ArchiveView'
import SnapshotView from './deliverables/SnapshotView'
import ScheduleView from './deliverables/ScheduleView'
import LibraryView from './deliverables/LibraryView'

/* ─── Props (matches v1 to keep App.tsx working) ──────────── */

interface Props {
  data: DRLRow[]
  role: UserRole
  anchors: Record<string, AnchorRecord>
  onAnchor: (row: DRLRow) => void
  onAnchorAll: () => void
  onVerify: (row: DRLRow) => void
  onReseal: (row: DRLRow) => Promise<void>
  onDataUpdate: (data: DRLRow[]) => void
  onSyncAnchors?: (newAnchors: Record<string, AnchorRecord>) => void
  selectedContract?: Contract
  onTogglePortfolio?: () => void
}

/* ─── Constants ───────────────────────────────────────────── */

const ACCENT = '#0071e3' // Apple system blue
const HAIRLINE = '#e5e5e7' // Apple hairline grey
const IDE_AUTO_SYNC_MS = 5 * 60 * 1000 // 5 min
void IDE_AUTO_SYNC_MS

/* ─── Shell ───────────────────────────────────────────────── */

export default function DeliverablesTracker(props: Props) {
  const {
    data,
    role,
    anchors,
    onAnchor: _onAnchor,
    onAnchorAll: _onAnchorAll,
    onVerify: _onVerify,
    onReseal: _onReseal,
    onDataUpdate,
    onSyncAnchors,
    selectedContract,
    onTogglePortfolio,
  } = props
  // Legacy props kept for App.tsx compatibility — tracker no longer uses
  // anchor / seal actions.  Suppress unused warnings.
  void _onAnchor; void _onAnchorAll; void _onVerify; void _onReseal

  const { user, profile } = useAuth()
  const actorName = profile?.display_name || user?.email || role
  const { psData } = useProgramSchedule()

  /* ─── Feature nav ──────────────────────────────────────── */
  const [activeFeature, setActiveFeature] = useState<FeatureKey>('tracker')

  const switchFeature = useCallback(
    (next: FeatureKey) => {
      if (next === activeFeature) return
      setActiveFeature(next)
      const def = FEATURES.find(f => f.key === next)
      logActivity({
        actor: actorName,
        kind: 'view',
        feature: next,
        summary: `Opened ${def?.label ?? next}`,
      })
    },
    [activeFeature, actorName],
  )

  /* ─── Active vessel (platform / hull class) ──────── */
  const [activeVesselId, setActiveVesselId] = useState<VesselId>('vessel-a')
  const dataset: VesselDataset = useMemo(() => getVesselDataset(activeVesselId), [activeVesselId])

  /* ─── Live tracker rows (vessel-scoped, IDE sim can mutate) ─ */
  const [localRows, setLocalRows] = useState<DRLRow[]>(dataset.rows)
  useEffect(() => {
    // Re-seed when vessel changes
    setLocalRows(dataset.rows)
  }, [dataset])

  /* ─── Data: merge incoming `data` prop with vessel rows ──── */
  // The prop may be empty (fresh load) or carry rows already injected by
  // App.tsx.  We blend the active vessel dataset in for any IDs missing
  // from the prop so every feature has something to render.
  const rows = useMemo<DRLRow[]>(() => {
    if (!data || data.length === 0) return localRows
    const propIds = new Set(data.map(r => r.id))
    const fillers = localRows.filter(r => !propIds.has(r.id))
    return [...data, ...fillers]
  }, [data, localRows])
  /* ─── Weekly snapshots (vessel-scoped) ─────────── */
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>(() => dataset.archive)
  useEffect(() => {
    setSnapshots(dataset.archive)
  }, [dataset])

  const switchVessel = useCallback((next: VesselId) => {
    if (next === activeVesselId) return
    const def = VESSELS.find(v => v.id === next)
    setActiveVesselId(next)
    logActivity({
      actor: actorName,
      kind: 'view',
      feature: 'global',
      summary: `Switched vessel to ${def?.label ?? next}`,
    })
  }, [activeVesselId, actorName])

  const handleSnapshot = useCallback((snap: WeeklySnapshot) => {
    setSnapshots(prev => {
      // Replace any existing snapshot for the same week-ending date
      const filtered = prev.filter(s => s.weekEnding !== snap.weekEnding)
      return [...filtered, snap].sort((a, b) => a.weekEnding.localeCompare(b.weekEnding))
    })
  }, [])
  /* ─── IDE auto-sync (every 5 min) ──────────────────────── */
  const [ideStatus, setIdeStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [ideLastSync, setIdeLastSync] = useState<Date | null>(null)
  const [ideMessage, setIdeMessage] = useState<string>('Auto-sync ready')
  const editedRef = useRef<Set<string>>(new Set())

  const runIdeSync = useCallback(async () => {
    setIdeStatus('syncing')
    setIdeMessage('Pulling from NSERC IDE…')
    try {
      const result = await realSyncPipeline(rows, role, anchors, editedRef.current)
      if (result.updatedRows && result.updatedRows.length) {
        onDataUpdate(result.updatedRows)
      }
      if (result.newAnchors && Object.keys(result.newAnchors).length && onSyncAnchors) {
        onSyncAnchors(result.newAnchors)
      }
      setIdeStatus('ok')
      setIdeLastSync(new Date())
      const changeCount = result.changes?.length ?? 0
      setIdeMessage(
        result.isSimulation
          ? `Synced (simulation) — ${changeCount} change${changeCount === 1 ? '' : 's'}`
          : `Synced — ${changeCount} change${changeCount === 1 ? '' : 's'}`,
      )
      logActivity({
        actor: 'NSERC IDE',
        kind: 'ide-sync',
        feature: 'global',
        summary: `IDE sync completed — ${changeCount} change${changeCount === 1 ? '' : 's'}${
          result.isSimulation ? ' (simulation)' : ''
        }`,
        metadata: { changes: changeCount, warnings: result.warnings },
      })
    } catch (err) {
      setIdeStatus('error')
      const msg = err instanceof Error ? err.message : String(err)
      setIdeMessage(`Sync error: ${msg}`)
      logActivity({
        actor: 'NSERC IDE',
        kind: 'ide-sync',
        feature: 'global',
        summary: `IDE sync error: ${msg}`,
      })
    }
  }, [rows, role, anchors, onDataUpdate, onSyncAnchors])

  /* ─── Simulated IDE drop (every ~45s in demo) ────── */
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const pushToast = useCallback((t: Omit<ToastEntry, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts(prev => [...prev, { ...t, id }])
    window.setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 6000)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLocalRows(prev => simulateIdeDrop(prev, dataset, actorName, pushToast))
    }, 45_000)
    return () => window.clearInterval(interval)
  }, [dataset, actorName, pushToast])

  /* ─── Activity Log panel ───────────────────────────────── */
  const [logOpen, setLogOpen] = useState(false)
  const [logEntries, setLogEntries] = useState<ActivityLogEntry[]>(() => getActivityLog())

  useEffect(() => {
    const unsub = subscribeActivity(setLogEntries)
    return unsub
  }, [])

  /* ─── Mount-time entry ─────────────────────────────────── */
  useEffect(() => {
    logActivity({
      actor: actorName,
      kind: 'view',
      feature: 'tracker',
      summary: `Opened Deliverables Tracker (role: ${role})`,
      metadata: { contract: selectedContract?.contractNumber ?? null },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ─── Render ───────────────────────────────────────────── */

  return (
    <div
      className="min-h-screen w-full text-gray-900"
      style={{
        background: '#f5f5f7',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      {/* ── Top bar ─────────────────────────────────────── */}
      <TopBar
        accent={ACCENT}
        hairline={HAIRLINE}
        ideStatus={ideStatus}
        ideMessage={ideMessage}
        ideLastSync={ideLastSync}
        onIdeSync={() => {
          runIdeSync()
          // Also trigger an immediate simulated drop for visible feedback
          setLocalRows(prev => simulateIdeDrop(prev, dataset, actorName, pushToast, true))
        }}
        onToggleLog={() => setLogOpen(v => !v)}
        logCount={logEntries.length}
        onExit={onTogglePortfolio}
        selectedContract={selectedContract}
        activeVesselId={activeVesselId}
        onSelectVessel={switchVessel}
      />

      <div className="flex" style={{ minHeight: 'calc(100vh - 64px)' }}>
        {/* ── Left rail ─────────────────────────────────── */}
        <LeftRail
          active={activeFeature}
          onSelect={switchFeature}
          hairline={HAIRLINE}
          accent={ACCENT}
        />

        {/* ── Main canvas ───────────────────────────────── */}
        <main className="flex-1 min-w-0 px-8 py-7 overflow-x-auto">
          <FeatureView
            featureKey={activeFeature}
            rows={rows}
            role={role}
            actorName={actorName}
            psHasData={!!psData}
            dataset={dataset}
            snapshots={snapshots}
            onSnapshot={handleSnapshot}
          />
        </main>

        {/* ── Activity Log slide-out ───────────────────── */}
        {logOpen && (
          <ActivityLogPanel
            entries={logEntries}
            onClose={() => setLogOpen(false)}
            onClear={() => {
              clearActivityLog()
              logActivity({
                actor: actorName,
                kind: 'edit',
                feature: 'global',
                summary: 'Cleared activity log',
              })
            }}
            hairline={HAIRLINE}
            accent={ACCENT}
          />
        )}
      </div>

      {/* ── IDE sync toasts ──────────────────────────────── */}
      <ToastStack toasts={toasts} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Top bar
   ═══════════════════════════════════════════════════════════ */

interface TopBarProps {
  accent: string
  hairline: string
  ideStatus: 'idle' | 'syncing' | 'ok' | 'error'
  ideMessage: string
  ideLastSync: Date | null
  onIdeSync: () => void
  onToggleLog: () => void
  logCount: number
  onExit?: () => void
  selectedContract?: Contract
  activeVesselId: VesselId
  onSelectVessel: (id: VesselId) => void
}

function TopBar({
  accent,
  hairline,
  ideStatus,
  ideMessage,
  ideLastSync,
  onIdeSync,
  onToggleLog,
  logCount,
  onExit,
  selectedContract,
  activeVesselId,
  onSelectVessel,
}: TopBarProps) {
  const statusDot = {
    idle: '#9ca3af',
    syncing: accent,
    ok: '#34c759',
    error: '#ff3b30',
  }[ideStatus]
  const activeVessel = VESSELS.find(v => v.id === activeVesselId) ?? VESSELS[0]

  return (
    <header
      className="w-full bg-white/90 backdrop-blur sticky top-0 z-30"
      style={{ borderBottom: `1px solid ${hairline}`, height: 64 }}
    >
      <div className="h-full flex items-center px-8 gap-6">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: accent }}
          >
            S4
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Deliverables Tracker</div>
            <div className="text-[12px] text-gray-500">
              {activeVessel.shipbuilder}
              {selectedContract ? ` · ${selectedContract.contractNumber}` : ''}
            </div>
          </div>
        </div>

        {/* Vessel switcher */}
        <VesselSwitcher
          accent={accent}
          hairline={hairline}
          activeVesselId={activeVesselId}
          onSelect={onSelectVessel}
        />

        <div className="flex-1" />

        {/* IDE sync chip */}
        <button
          onClick={onIdeSync}
          disabled={ideStatus === 'syncing'}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          style={{ border: `1px solid ${hairline}` }}
          title={ideMessage}
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: statusDot }}
          />
          <span className="font-medium">NSERC IDE</span>
          <span className="text-gray-500">
            {ideLastSync ? `· ${formatRelative(ideLastSync)}` : '· connecting…'}
          </span>
          <i className={`fas fa-rotate ml-1 text-[10px] ${ideStatus === 'syncing' ? 'fa-spin' : ''}`} />
        </button>

        {/* Activity log toggle */}
        <button
          onClick={onToggleLog}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] text-gray-700 hover:bg-gray-50 transition"
          style={{ border: `1px solid ${hairline}` }}
        >
          <i className="fas fa-clock-rotate-left text-[11px]" />
          <span className="font-medium">Activity</span>
          {logCount > 0 && (
            <span
              className="px-1.5 rounded-full text-[10px] font-semibold text-white"
              style={{ background: accent }}
            >
              {logCount > 99 ? '99+' : logCount}
            </span>
          )}
        </button>

        {/* Portfolio exit */}
        {onExit && (
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] text-gray-700 hover:bg-gray-50 transition"
            style={{ border: `1px solid ${hairline}` }}
          >
            <i className="fas fa-arrow-left text-[11px]" />
            <span className="font-medium">Portfolio</span>
          </button>
        )}
      </div>
    </header>
  )
}

/* ═══════════════════════════════════════════════════════════
   Left rail
   ═══════════════════════════════════════════════════════════ */

function LeftRail({
  active,
  onSelect,
  hairline,
  accent,
}: {
  active: FeatureKey
  onSelect: (k: FeatureKey) => void
  hairline: string
  accent: string
}) {
  return (
    <nav
      className="w-56 shrink-0 bg-white py-5 px-2.5"
      style={{ borderRight: `1px solid ${hairline}` }}
      aria-label="Feature navigation"
    >
      <div className="px-3 mb-3 text-[10px] uppercase tracking-[0.12em] text-gray-400 font-semibold">
        Features
      </div>
      <ul className="space-y-0.5">
        {FEATURES.map(f => {
          const isActive = f.key === active
          return (
            <li key={f.key}>
              <button
                onClick={() => onSelect(f.key)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition hover:bg-[#f5f5f7]"
                style={{
                  background: isActive ? 'rgba(0,113,227,0.08)' : 'transparent',
                  color: isActive ? accent : '#1f2937',
                }}
                title={f.description}
              >
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    background: isActive ? accent : '#f5f5f7',
                    color: isActive ? '#fff' : '#6b7280',
                  }}
                >
                  <i className={`fas ${f.icon} text-[11px]`} />
                </span>
                <span className="text-[13px] font-medium tracking-tight truncate">{f.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════
   Feature view router (placeholders fill in Steps 4–11)
   ═══════════════════════════════════════════════════════════ */

function FeatureView({
  featureKey,
  rows,
  role,
  actorName,
  psHasData,
  dataset,
  snapshots,
  onSnapshot,
}: {
  featureKey: FeatureKey
  rows: DRLRow[]
  role: UserRole
  actorName: string
  psHasData: boolean
  dataset: VesselDataset
  snapshots: WeeklySnapshot[]
  onSnapshot: (snap: WeeklySnapshot) => void
}) {
  const def = FEATURES.find(f => f.key === featureKey)!

  // suppress unused-warnings for shell-only params on certain features
  void role; void psHasData

  const body = (() => {
    switch (featureKey) {
      case 'tracker':
        return (
          <TrackerView
            rows={rows}
            actorName={actorName}
            onSnapshot={onSnapshot}
          />
        )
      case 'executive':
        return <ExecutiveBriefView brief={dataset.brief} actorName={actorName} />
      case 'actions':
        return <ActionItemsView items={dataset.actions} actorName={actorName} />
      case 'analytics':
        return <AnalyticsView snapshot={dataset.analytics} actorName={actorName} />
      case 'archive':
        return <ArchiveView snapshots={snapshots} actorName={actorName} />
      case 'snapshot':
        return <SnapshotView currentRows={rows} snapshots={snapshots} actorName={actorName} />
      case 'schedule':
        return <ScheduleView entries={dataset.schedule} actorName={actorName} />
      case 'library':
        return <LibraryView items={dataset.library} actorName={actorName} />
      default:
        return null
    }
  })()

  return (
    <div className="max-w-[1280px] mx-auto">
      <PageHeader def={def} dataset={dataset} />
      {body}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Page header (used by every feature view)
   ═══════════════════════════════════════════════════════════ */

function PageHeader({
  def,
  dataset,
}: {
  def: { label: string; description: string; icon: string }
  dataset: VesselDataset
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold mb-2">
          <span>{dataset.shipbuilder}</span>
          <span className="text-gray-300">/</span>
          <span>{dataset.label}</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600">{def.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT }}
          >
            <i className={`fas ${def.icon} text-[14px]`} />
          </span>
          <h1 className="text-[28px] leading-[1.1] tracking-[-0.02em] font-semibold text-gray-900">
            {def.label}
          </h1>
        </div>
      </div>
      <p className="text-[13px] text-gray-500 text-right max-w-md leading-snug pb-1">
        {def.description}
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Activity Log slide-out
   ═══════════════════════════════════════════════════════════ */

function ActivityLogPanel({
  entries,
  onClose,
  onClear,
  hairline,
  accent,
}: {
  entries: ActivityLogEntry[]
  onClose: () => void
  onClear: () => void
  hairline: string
  accent: string
}) {
  return (
    <aside
      className="w-96 shrink-0 bg-white flex flex-col"
      style={{ borderLeft: `1px solid ${hairline}` }}
      aria-label="Activity log"
    >
      <div
        className="h-14 px-5 flex items-center justify-between shrink-0"
        style={{ borderBottom: `1px solid ${hairline}` }}
      >
        <div className="flex items-center gap-2">
          <i className="fas fa-clock-rotate-left text-[12px] text-gray-500" />
          <span className="text-[13px] font-semibold tracking-tight">Activity</span>
          <span className="text-[11px] text-gray-400">· {entries.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClear}
            className="px-2 py-1 rounded-md text-[11px] text-gray-500 hover:bg-gray-50 transition"
            title="Clear activity log"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md text-gray-500 hover:bg-gray-50 transition"
            aria-label="Close activity log"
          >
            <i className="fas fa-xmark text-[12px]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {entries.length === 0 ? (
          <div className="px-5 py-10 text-center text-[12px] text-gray-400">
            No activity yet.
          </div>
        ) : (
          <ul className="space-y-px">
            {entries.map(e => (
              <li key={e.id} className="px-5 py-3 hover:bg-gray-50 transition">
                <div className="flex items-baseline gap-2">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: kindColor(e.kind, accent) }}
                  />
                  <span className="text-[12px] font-medium text-gray-900 leading-snug">
                    {e.summary}
                  </span>
                </div>
                <div className="mt-1 pl-3.5 text-[11px] text-gray-500">
                  {e.actor} · {formatRelative(new Date(e.ts))} ·{' '}
                  <span className="text-gray-400">{e.feature}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

function kindColor(kind: ActivityLogEntry['kind'], accent: string): string {
  switch (kind) {
    case 'edit':            return accent
    case 'status-change':   return '#ff9500'
    case 'snapshot':        return '#5856d6'
    case 'export':          return '#34c759'
    case 'anchor':          return '#af52de'
    case 'verify':          return '#0a84ff'
    case 'ide-sync':        return '#34c759'
    case 'action-response': return '#ff3b30'
    case 'comment':         return '#8e8e93'
    case 'view':
    default:                return '#9ca3af'
  }
}

/* ─── Tiny helpers ────────────────────────────────────────── */

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime()
  const s = Math.round(diff / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.round(h / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

/* ═══════════════════════════════════════════════════════════
   Vessel switcher (segmented control in TopBar)
   ═══════════════════════════════════════════════════════════ */

function VesselSwitcher({
  accent,
  hairline,
  activeVesselId,
  onSelect,
}: {
  accent: string
  hairline: string
  activeVesselId: VesselId
  onSelect: (id: VesselId) => void
}) {
  return (
    <div
      className="hidden md:flex items-center gap-1 p-1 rounded-full bg-gray-50"
      style={{ border: `1px solid ${hairline}` }}
      role="tablist"
      aria-label="Select vessel class"
    >
      {VESSELS.map(v => {
        const active = v.id === activeVesselId
        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className="flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium transition"
            style={{
              background: active ? '#ffffff' : 'transparent',
              color: active ? accent : '#374151',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              border: active ? `1px solid ${hairline}` : '1px solid transparent',
            }}
            title={`${v.label} · ${v.shipbuilder}`}
            role="tab"
            aria-selected={active}
          >
            <i className={`fas ${v.icon} text-[11px]`} />
            <span>{v.shortLabel}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Toast stack (IDE sync drops)
   ═══════════════════════════════════════════════════════════ */

export interface ToastEntry {
  id: string
  kind: 'info' | 'success' | 'warn'
  icon: string
  title: string
  detail: string
  ts: number
}

function ToastStack({ toasts }: { toasts: ToastEntry[] }) {
  if (toasts.length === 0) return null
  return (
    <div
      className="fixed z-50 flex flex-col gap-2"
      style={{ right: 20, bottom: 20, width: 320 }}
    >
      {toasts.map(t => {
        const colour =
          t.kind === 'success' ? '#34c759' :
          t.kind === 'warn'    ? '#ff9500' :
                                 '#0071e3'
        return (
          <div
            key={t.id}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
            style={{ border: '1px solid #e5e5e7' }}
          >
            <div className="flex items-start gap-3 p-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${colour}1a`, color: colour }}
              >
                <i className={`fas ${t.icon} text-[13px]`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-gray-900 leading-tight">
                  {t.title}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-600 leading-snug">
                  {t.detail}
                </div>
                <div className="mt-1 text-[10px] text-gray-400">
                  NSERC IDE · {formatRelative(new Date(t.ts))}
                </div>
              </div>
            </div>
            <div className="h-0.5" style={{ background: colour, opacity: 0.5 }} />
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Simulated IDE drop — mutates rows + logs + toasts
   ═══════════════════════════════════════════════════════════ */

function simulateIdeDrop(
  current: DRLRow[],
  dataset: VesselDataset,
  actorName: string,
  pushToast: (t: Omit<ToastEntry, 'id'>) => void,
  forceAction = false,
): DRLRow[] {
  void actorName
  const roll = forceAction ? Math.random() * 0.95 : Math.random()

  // 35% – flip a yellow row → green
  if (roll < 0.35) {
    const yellows = current.filter(r => r.status === 'yellow')
    if (yellows.length > 0) {
      const target = yellows[Math.floor(Math.random() * yellows.length)]
      const next = current.map(r =>
        r.id === target.id
          ? { ...r, status: 'green' as const, received: new Date().toISOString().slice(0, 10) }
          : r
      )
      logActivity({
        actor: 'NSERC IDE',
        kind: 'ide-sync',
        feature: 'tracker',
        summary: `Received submission for ${target.diNumber} — status cleared to green`,
        rowId: target.id,
      })
      pushToast({
        kind: 'success',
        icon: 'fa-circle-check',
        title: `${target.diNumber} cleared`,
        detail: `${target.title} marked received in ${dataset.shortLabel}.`,
        ts: Date.now(),
      })
      return next
    }
  }

  // 35% – inject a new row at the top
  if (roll < 0.70) {
    const seq = (current.length + 1).toString().padStart(3, '0')
    const titles = [
      'Trim & Stability Report',
      'Habitability Survey',
      'Cable Block Diagram',
      'Weight Estimate Update',
      'Welding Procedure Specification',
      'Coatings Test Plan',
    ]
    const title = titles[Math.floor(Math.random() * titles.length)]
    const diPrefix = dataset.id === 'vessel-a' ? 'DI-0' : dataset.id === 'vessel-b' ? 'DI-1' : 'DI-2'
    const newRow: DRLRow = {
      id: `${dataset.id}-ide-${Date.now()}`,
      diNumber: `${diPrefix}${seq}`,
      title,
      contractDueFinish: '2026-06-30',
      calculatedDueDate: '60 DAC',
      submittalGuidance: '2026-05-31',
      actualSubmissionDate: '',
      received: '',
      calendarDaysToReview: null,
      notes: 'Detected from latest IDE sync.',
      status: 'pending',
      scope: 'per-hull',
    }
    const next = [newRow, ...current]
    logActivity({
      actor: 'NSERC IDE',
      kind: 'ide-sync',
      feature: 'tracker',
      summary: `New deliverable detected: ${newRow.diNumber} — ${newRow.title}`,
      rowId: newRow.id,
    })
    pushToast({
      kind: 'info',
      icon: 'fa-file-circle-plus',
      title: `New DRL · ${newRow.diNumber}`,
      detail: `${title} synced from IDE for ${dataset.shortLabel}.`,
      ts: Date.now(),
    })
    return next
  }

  // 25% – add a comment to a random row
  if (roll < 0.95) {
    if (current.length === 0) return current
    const target = current[Math.floor(Math.random() * current.length)]
    const notes = [
      'Reviewer flagged minor formatting issue.',
      'Government QA requested supporting calculations.',
      'Shipbuilder uploaded revised drawing pack.',
      'Cross-reference to NAVSEA spec confirmed.',
      'Awaiting subcontractor sign-off.',
    ]
    const note = notes[Math.floor(Math.random() * notes.length)]
    logActivity({
      actor: 'NSERC IDE',
      kind: 'comment',
      feature: 'tracker',
      summary: `${target.diNumber}: ${note}`,
      rowId: target.id,
    })
    pushToast({
      kind: 'info',
      icon: 'fa-comment-dots',
      title: `Comment on ${target.diNumber}`,
      detail: note,
      ts: Date.now(),
    })
    return current
  }

  // 5% – silent no-op
  return current
}
