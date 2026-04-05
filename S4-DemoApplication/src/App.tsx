import { useState, useCallback, useMemo, useEffect } from 'react'
import { AuthStage, UserRole, DRLRow, AnchorRecord } from './types'
import { sampleData } from './data/sampleData'
import { assignContractIds, getContractById } from './data/portfolioData'
import { hashRow } from './utils/hash'
import { anchorToXRPL } from './utils/xrpl'
import { recordSeal, recordReseal } from './utils/auditTrail'
import { recordChange } from './utils/changeLog'
import { storeSealed } from './utils/sealedVault'
import { useAuth } from './contexts/AuthContext'
import LoginScreen from './components/LoginScreen'
import CACPopup from './components/CACPopup'
import WelcomeCard from './components/WelcomeCard'
import RoleSelector from './components/RoleSelector'
import DeliverablesTracker from './components/DeliverablesTracker'
import PortfolioDashboard from './components/PortfolioDashboard'

export default function App() {
  const { session, profile, user, loading: authLoading, isDemo } = useAuth()
  const [stage, setStage] = useState<AuthStage>('cac')
  const [role, setRole] = useState<UserRole>('Program Manager')
  const [data, setData] = useState<DRLRow[]>(() => {
    const rows = assignContractIds(sampleData)
    // Restore persisted workflow states from localStorage
    try {
      const stored = localStorage.getItem('s4_workflow_states')
      if (stored) {
        const states: Record<string, unknown> = JSON.parse(stored)
        return rows.map(r => states[r.id] ? { ...r, workflowState: states[r.id] as DRLRow['workflowState'] } : r)
      }
    } catch { /* ignore */ }
    return rows
  })
  const [anchors, setAnchors] = useState<Record<string, AnchorRecord>>({})
  const [anchoring, setAnchoring] = useState<Set<string>>(new Set())
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  const [showPortfolio, setShowPortfolio] = useState(false)

  // Persist workflow states to localStorage whenever data changes
  useEffect(() => {
    const states: Record<string, unknown> = {}
    let hasAny = false
    for (const row of data) {
      if (row.workflowState) {
        states[row.id] = row.workflowState
        hasAny = true
      }
    }
    if (hasAny) {
      localStorage.setItem('s4_workflow_states', JSON.stringify(states))
    }
  }, [data])

  // Filter data to selected contract (or show all)
  const filteredData = useMemo(() => {
    if (!selectedContractId) return data
    return data.filter(r => r.contractId === selectedContractId)
  }, [data, selectedContractId])

  const selectedContract = selectedContractId ? getContractById(selectedContractId) : null

  const handleAnchor = useCallback(async (row: DRLRow) => {
    if (anchors[row.id] || anchoring.has(row.id)) return

    setAnchoring(prev => new Set(prev).add(row.id))
    try {
      const hash = await hashRow(row as unknown as Record<string, unknown>)
      const record = await anchorToXRPL(row.id, hash, row.title)
      setAnchors(prev => ({ ...prev, [row.id]: record }))
      storeSealed(row.id, row)
      recordSeal(row, record)
      recordChange({
        userId: user?.id, userEmail: user?.email, userRole: role, userOrg: profile?.organization,
        rowId: row.id, rowTitle: row.title, field: 'seal',
        oldValue: null, newValue: record.txHash, changeType: 'seal',
      })
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
      recordChange({
        userId: user?.id, userEmail: user?.email, userRole: role, userOrg: profile?.organization,
        rowId: row.id, rowTitle: row.title, field: 'reseal',
        oldValue: null, newValue: record.txHash, changeType: 'reseal',
      })
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

  // ── Authenticated user → portfolio + tracker ──
  if (session && profile) {
    const authRole = profile.role
    if (showPortfolio) {
      return (
        <PortfolioDashboard
          allData={data}
          selectedContractId={selectedContractId}
          onSelectContract={(cid) => { setSelectedContractId(cid); setShowPortfolio(false) }}
          onViewAll={() => setSelectedContractId(null)}
          onBack={() => setShowPortfolio(false)}
        />
      )
    }
    return (
      <DeliverablesTracker
        data={filteredData}
        role={authRole}
        anchors={anchors}
        onAnchor={handleAnchor}
        onAnchorAll={handleAnchorAll}
        onVerify={handleVerify}
        onReseal={handleReseal}
        onDataUpdate={(updated) => {
          setData(prev => {
            const updatedMap = new Map(updated.map(r => [r.id, r]))
            return prev.map(r => updatedMap.get(r.id) ?? r)
          })
        }}
        onSyncAnchors={(newAnchors) => setAnchors(prev => ({ ...prev, ...newAnchors }))}
        selectedContract={selectedContract ?? undefined}
        onTogglePortfolio={() => setShowPortfolio(true)}
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
    <>
      {showPortfolio ? (
        <PortfolioDashboard
          allData={data}
          selectedContractId={selectedContractId}
          onSelectContract={(cid) => { setSelectedContractId(cid); setShowPortfolio(false) }}
          onViewAll={() => setSelectedContractId(null)}
          onBack={() => setShowPortfolio(false)}
        />
      ) : (
        <DeliverablesTracker
          data={filteredData}
          role={role}
          anchors={anchors}
          onAnchor={handleAnchor}
          onAnchorAll={handleAnchorAll}
          onVerify={handleVerify}
          onReseal={handleReseal}
          onDataUpdate={(updated) => {
            setData(prev => {
              const updatedMap = new Map(updated.map(r => [r.id, r]))
              return prev.map(r => updatedMap.get(r.id) ?? r)
            })
          }}
          onSyncAnchors={(newAnchors) => setAnchors(prev => ({ ...prev, ...newAnchors }))}
          selectedContract={selectedContract ?? undefined}
          onTogglePortfolio={() => setShowPortfolio(true)}
        />
      )}
    </>
  )
}
