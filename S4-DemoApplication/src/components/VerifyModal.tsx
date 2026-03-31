import { useState, useEffect } from 'react'
import { CDRLRow, AnchorRecord } from '../types'
import { hashRow } from '../utils/hash'
import { recordVerification } from '../utils/auditTrail'

interface Props {
  row: CDRLRow
  anchor: AnchorRecord | undefined
  onReseal: (row: CDRLRow) => Promise<void>
  onClose: () => void
  onShowMismatch?: () => void
}

export default function VerifyModal({ row, anchor, onReseal, onClose, onShowMismatch }: Props) {
  const [currentHash, setCurrentHash] = useState<string>('')
  const [verifying, setVerifying] = useState(true)
  const [match, setMatch] = useState<boolean | null>(null)
  const [resealing, setResealing] = useState(false)
  const [resealSuccess, setResealSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function verify() {
      setVerifying(true)
      setResealSuccess(null)
      const hash = await hashRow(row as unknown as Record<string, unknown>)
      setCurrentHash(hash)

      // Simulate verification delay
      await new Promise(r => setTimeout(r, 1000))

      if (anchor) {
        const isMatch = hash === anchor.hash
        setMatch(isMatch)
        recordVerification(row, isMatch, hash, anchor.hash, anchor.txHash)
      } else {
        setMatch(null)
      }
      setVerifying(false)
    }
    verify()
  }, [row, anchor])

  async function handleReseal() {
    setResealing(true)
    try {
      await onReseal(row)
      setMatch(true)
      setResealSuccess(new Date().toLocaleString())
    } finally {
      setResealing(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-white border border-border rounded-card p-6 max-w-xl w-full mx-4 animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              match === null ? 'bg-steel/20' : match ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              <i className={`fas ${
                verifying ? 'fa-spinner fa-spin text-steel' :
                match ? 'fa-check-circle text-green-400' :
                match === false ? 'fa-exclamation-triangle text-red-400' :
                'fa-question-circle text-steel'
              }`}></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Integrity Verification</h3>
              <p className="text-steel text-xs">{row.id} — {row.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {verifying ? (
          <div className="flex items-center justify-center py-8 gap-3 text-steel">
            <i className="fas fa-spinner fa-spin"></i>
            <span>Computing hash and verifying against blockchain…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Re-seal success */}
            {resealSuccess && (
              <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <i className="fas fa-shield-alt text-green-500"></i>
                  <span className="font-semibold text-green-600">Record re-sealed successfully. Trust restored.</span>
                </div>
                <p className="text-steel text-xs">New seal timestamp: {resealSuccess}</p>
              </div>
            )}

            {match !== null && !resealSuccess && (
              <div className={`p-4 rounded-lg border ${
                match
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <i className={`fas ${match ? 'fa-check-circle text-green-400' : 'fa-exclamation-triangle text-red-400'}`}></i>
                  <span className={`font-semibold ${match ? 'text-green-400' : 'text-red-400'}`}>
                    {match ? 'VERIFIED — Record is tamper-free' : 'MISMATCH — Record may have been altered'}
                  </span>
                </div>
                <p className="text-steel text-xs">
                  {match
                    ? 'The current record hash matches the hash sealed on the XRP Ledger.'
                    : 'The current record hash does NOT match the sealed hash. You can re-seal to create a new immutable version.'}
                </p>
                {match === false && (
                  <div className="flex items-center gap-2 mt-3">
                    {onShowMismatch && (
                      <button
                        onClick={onShowMismatch}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-semibold transition-all"
                      >
                        <i className="fas fa-columns"></i>
                        View Detailed Comparison
                      </button>
                    )}
                    <button
                      onClick={handleReseal}
                      disabled={resealing}
                      className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-60"
                    >
                      {resealing ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Re-Sealing…
                        </>
                      ) : (
                        <>
                          <i className="fas fa-shield-alt"></i>
                          Re-Seal This Record
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!anchor && (
              <div className="p-4 rounded-lg border bg-yellow-500/10 border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <i className="fas fa-info-circle text-yellow-400"></i>
                  <span className="font-semibold text-yellow-400">Not Yet Sealed</span>
                </div>
                <p className="text-steel text-xs mt-1">
                  This record has not been sealed to the ledger. Seal it first to enable verification.
                </p>
              </div>
            )}

            <div className="bg-[#f5f5f7] rounded-lg p-4 space-y-3 text-xs font-mono">
              <div>
                <p className="text-steel mb-1">Current SHA-256 Hash:</p>
                <p className="text-gray-900 break-all">{currentHash}</p>
              </div>
              {anchor && (
                <>
                  <div>
                    <p className="text-steel mb-1">Sealed Hash:</p>
                    <p className="text-gray-900 break-all">{anchor.hash}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-steel mb-1">TX Hash:</p>
                      {anchor.explorerUrl ? (
                        <a
                          href={anchor.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline break-all"
                        >{anchor.txHash}</a>
                      ) : (
                        <p className="text-accent break-all">{anchor.txHash}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-steel mb-1">Ledger Index:</p>
                      <p className="text-gray-900">{anchor.ledgerIndex.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-steel mb-1">Network:</p>
                      <p className="text-gray-900">{anchor.network}</p>
                    </div>
                    <div>
                      <p className="text-steel mb-1">Sealed At:</p>
                      <p className="text-gray-900">{new Date(anchor.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  {anchor.slsFee && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-steel mb-1">Anchor Fee:</p>
                      <p className="text-gray-900">{anchor.slsFee} SLS</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black/[0.03] hover:bg-black/[0.06] border border-border rounded-lg text-sm text-steel transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
