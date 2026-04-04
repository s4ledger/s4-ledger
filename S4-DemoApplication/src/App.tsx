import { useState, useCallback } from 'react'
import { AuthStage, UserRole, DRLRow, AnchorRecord } from './types'
import { sampleData } from './data/sampleData'
import { hashRow } from './utils/hash'
import { anchorToXRPL } from './utils/xrpl'
import { recordSeal, recordReseal } from './utils/auditTrail'
import { storeSealed } from './utils/sealedVault'
import { useAuth } from './contexts/AuthContext'
import LoginScreen from './components/LoginScreen'
import CACPopup from './components/CACPopup'
import WelcomeCard from './components/WelcomeCard'
import RoleSelector from './components/RoleSelector'
import DeliverablesTracker from './components/DeliverablesTracker'

export default function App() {
  const { session, profile, loading: authLoading, isDemo } = useAuth()
  const [stage, setStage] = useState<AuthStage>('cac')
  const [role, setRole] = useState<UserRole>('Program Manager')
  const [data, setData] = useState<DRLRow[]>(sampleData)
  const [anchors, setAnchors] = useState<Record<string, AnchorRecord>>({})
  const [anchoring, setAnchoring] = useState<Set<string>>(new Set())

  const handleAnchor = useCallback(async (row: DRLRow) => {
    if (anchors[row.id] || anchoring.has(row.id)) return

    setAnchoring(prev => new Set(prev).add(row.id))
    try {
      const hash = await hashRow(row as unknown as Record<string, unknown>)
      const record = await anchorToXRPL(row.id, hash, row.title)
      setAnchors(prev => ({ ...prev, [row.id]: record }))
      storeSealed(row.id, row)
      recordSeal(row, record)
    } finally {
      setAnchoring(prev => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }, [anchors, anchoring])

  const handleReseal = useCallback(async (row: DRLRow) => {
    setAnchoring(prev => new Set(prev).add(row.id))
    try {
      const hash = await hashRow(row as unknown as Record<string, unknown>)
      const record = await anchorToXRPL(row.id, hash, row.title)
      setAnchors(prev => ({ ...prev, [row.id]: record }))
      storeSealed(row.id, row)
      recordReseal(row, record)
    } finally {
      setAnchoring(prev => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }, [])

  const handleAnchorAll = useCallback(async () => {
    const unanchored = data.filter(r => !anchors[r.id] && !anchoring.has(r.id))
    for (const row of unanchored) {
      await handleAnchor(row)
    }
  }, [data, anchors, anchoring, handleAnchor])

  const handleVerify = useCallback((_row: DRLRow) => {
    // Verify is handled inside DeliverablesTracker via VerifyModal
  }, [])

  // ── Auth loading state ──
  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <i className="fas fa-shield-alt text-accent text-3xl mb-4 block"></i>
          <i className="fas fa-spinner fa-spin text-accent text-lg"></i>
        </div>
      </div>
    )
  }

  // ── Not authenticated and not in demo mode → show login ──
  if (!session && !isDemo) {
    return <LoginScreen />
  }

  // ── Authenticated user → skip demo flow, go straight to tracker ──
  if (session && profile) {
    const authRole = profile.role
    return (
      <DeliverablesTracker
        data={data}
        role={authRole}
        anchors={anchors}
        onAnchor={handleAnchor}
        onAnchorAll={handleAnchorAll}
        onVerify={handleVerify}
        onReseal={handleReseal}
        onDataUpdate={setData}
        onSyncAnchors={(newAnchors) => setAnchors(prev => ({ ...prev, ...newAnchors }))}
      />
    )
  }

  // ── Demo mode → existing flow ──
  if (stage === 'cac') {
    return <CACPopup onAuthenticated={() => setStage('welcome')} />
  }

  if (stage === 'welcome') {
    return <WelcomeCard onContinue={() => setStage('role')} />
  }

  if (stage === 'role') {
    return (
      <RoleSelector
        onSelect={(r: UserRole) => {
          setRole(r)
          setStage('tracker')
        }}
      />
    )
  }

  return (
    <DeliverablesTracker
      data={data}
      role={role}
      anchors={anchors}
      onAnchor={handleAnchor}
      onAnchorAll={handleAnchorAll}
      onVerify={handleVerify}
      onReseal={handleReseal}
      onDataUpdate={setData}
      onSyncAnchors={(newAnchors) => setAnchors(prev => ({ ...prev, ...newAnchors }))}
    />
  )
}
