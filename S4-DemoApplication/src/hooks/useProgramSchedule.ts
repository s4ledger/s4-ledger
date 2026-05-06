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
 * Supabase on mount and exposes a manual `sync()` trigger.
 *
 * Usage:
 *   const { psData, loading, lastSync, sync } = useProgramSchedule()
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
