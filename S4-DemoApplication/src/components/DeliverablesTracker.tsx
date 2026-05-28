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
  DEMO_ACTION_ITEMS,
  DEMO_ANALYTICS,
  DEMO_ARCHIVE,
  DEMO_EXECUTIVE_BRIEF,
  DEMO_ROWS,
  DEMO_SHIPBUILDER,
  DEMO_SUBMITTALS_LIBRARY,
  DEMO_SUBMITTAL_SCHEDULE,
  DEMO_VESSEL_CLASS,
  FEATURES,
} from '../data/deliverablesDemoData'
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

/* ─── Shell ───────────────────────────────────────────────── */

export default function DeliverablesTracker(props: Props) {
  const {
    data,
    role,
    anchors,
    onAnchor,
    onAnchorAll: _onAnchorAll,
    onVerify,
    onReseal,
    onDataUpdate,
    onSyncAnchors,
    selectedContract,
    onTogglePortfolio,
  } = props

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

  /* ─── Data: merge incoming `data` prop with demo seed ──── */
  // The prop may be empty (fresh load) or carry rows already injected by
  // App.tsx.  We blend demo seed in for any IDs missing from the prop so
  // every feature has something to render out-of-the-box.
  const rows = useMemo<DRLRow[]>(() => {
    if (!data || data.length === 0) return DEMO_ROWS
    const propIds = new Set(data.map(r => r.id))
    const fillers = DEMO_ROWS.filter(r => !propIds.has(r.id))
    return [...data, ...fillers]
  }, [data])
  /* ─── Weekly snapshots (in-memory; seeded with demo archive) ── */
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>(() => DEMO_ARCHIVE)

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

  useEffect(() => {
    // First pull + interval
    runIdeSync()
    const id = window.setInterval(runIdeSync, IDE_AUTO_SYNC_MS)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally mount-only; runIdeSync re-reads latest rows via closure

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
        onIdeSync={runIdeSync}
        onToggleLog={() => setLogOpen(v => !v)}
        logCount={logEntries.length}
        onExit={onTogglePortfolio}
        selectedContract={selectedContract}
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
            psHasData={!!psData}            anchors={anchors}
            snapshots={snapshots}
            onAnchor={onAnchor}
            onVerify={onVerify}
            onReseal={onReseal}
            onSnapshot={handleSnapshot}          />
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
}: TopBarProps) {
  const statusDot = {
    idle: '#9ca3af',
    syncing: accent,
    ok: '#34c759',
    error: '#ff3b30',
  }[ideStatus]

  return (
    <header
      className="w-full bg-white/90 backdrop-blur sticky top-0 z-30"
      style={{ borderBottom: `1px solid ${hairline}`, height: 64 }}
    >
      <div className="h-full flex items-center px-8 gap-8">
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
              {DEMO_SHIPBUILDER} · {DEMO_VESSEL_CLASS}
              {selectedContract ? ` · ${selectedContract.contractNumber}` : ''}
            </div>
          </div>
        </div>

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
  anchors,
  snapshots,
  onAnchor,
  onVerify,
  onReseal,
  onSnapshot,
}: {
  featureKey: FeatureKey
  rows: DRLRow[]
  role: UserRole
  actorName: string
  psHasData: boolean
  anchors: Record<string, AnchorRecord>
  snapshots: WeeklySnapshot[]
  onAnchor: (row: DRLRow) => void
  onVerify: (row: DRLRow) => void
  onReseal: (row: DRLRow) => Promise<void>
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
            anchors={anchors}
            actorName={actorName}
            onAnchor={onAnchor}
            onVerify={onVerify}
            onReseal={onReseal}
            onSnapshot={onSnapshot}
          />
        )
      case 'executive':
        return <ExecutiveBriefView brief={DEMO_EXECUTIVE_BRIEF} actorName={actorName} />
      case 'actions':
        return <ActionItemsView items={DEMO_ACTION_ITEMS} actorName={actorName} />
      case 'analytics':
        return <AnalyticsView snapshot={DEMO_ANALYTICS} actorName={actorName} />
      case 'archive':
        return <ArchiveView snapshots={snapshots} actorName={actorName} />
      case 'snapshot':
        return <SnapshotView currentRows={rows} snapshots={snapshots} actorName={actorName} />
      case 'schedule':
        return <ScheduleView entries={DEMO_SUBMITTAL_SCHEDULE} actorName={actorName} />
      case 'library':
        return <LibraryView items={DEMO_SUBMITTALS_LIBRARY} actorName={actorName} />
      default:
        return null
    }
  })()

  return (
    <div className="max-w-[1280px] mx-auto">
      <PageHeader def={def} />
      {body}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Page header (used by every feature view)
   ═══════════════════════════════════════════════════════════ */

function PageHeader({ def }: { def: { label: string; description: string; icon: string } }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-gray-400 font-semibold mb-2">
          <span>{DEMO_SHIPBUILDER}</span>
          <span className="text-gray-300">/</span>
          <span>{DEMO_VESSEL_CLASS}</span>
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
