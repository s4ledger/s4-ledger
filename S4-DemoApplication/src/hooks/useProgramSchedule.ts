import { useState, useEffect, useCallback } from 'react'
import { fetchProgramSchedule, PSData } from '../services/programScheduleService'

interface UseProgramScheduleResult {
  psData: PSData | null
  loading: boolean
  error: string | null
  lastSync: Date | null
  sync: () => void
}

/**
 * React hook that loads Program Schedule vessel milestone data from
 * Supabase / localStorage on mount and exposes a manual `sync()` trigger.
 *
 * Also listens for the PS tool writing to localStorage in another tab
 * (via the browser `storage` event) so that milestone changes propagate
 * to the Deliverables Tracker in real time without requiring a page reload.
 */
export function useProgramSchedule(): UseProgramScheduleResult {
  const [psData, setPsData] = useState<PSData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncTick, setSyncTick] = useState(0)

  /** Call this to trigger a manual re-fetch */
  const sync = useCallback(() => {
    setSyncTick(t => t + 1)
  }, [])

  // ── Cross-tab real-time sync ─────────────────────────────────────
  // When the Program Schedule tool saves to localStorage (same origin),
  // the browser fires a `storage` event in all OTHER tabs.  We catch it
  // here so that any milestone change in the PS tool is reflected in the
  // Deliverables Tracker immediately — no manual sync button needed.
  useEffect(() => {
    const PS_STORE_KEY = 's4_ps_v2'
    const PS_PROP_KEY  = 's4_program_schedule_propagated'

    const handleStorage = (e: StorageEvent) => {
      if (e.key === PS_STORE_KEY || e.key === PS_PROP_KEY) {
        setSyncTick(t => t + 1)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchProgramSchedule()
      .then(data => {
        if (cancelled) return
        setPsData(data)
        setLastSync(new Date())
        if (!data) {
          setError('Open the Program Schedule tool and save a schedule to enable live date sync.')
        }
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load program schedule.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [syncTick])

  return { psData, loading, error, lastSync, sync }
}
