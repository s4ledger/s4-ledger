import { useState } from 'react'
import DraggableModal from './DraggableModal'
import { DRLRow, AnchorRecord } from '../types'
import { diffRow, analyzeMismatch, getSealed } from '../utils/sealedVault'

interface Props {
  row: DRLRow
  anchor: AnchorRecord
  onReseal: (row: DRLRow) => Promise<void>
  onClose: () => void
}

export default function MismatchModal({ row, anchor, onReseal, onClose }: Props) {
  const sealed = getSealed(row.id)
  const diffs = sealed ? diffRow(row, sealed) : []
  const analysis = analyzeMismatch(row, diffs)
  const [resealing, setResealing] = useState(false)
  const [resealDone, setResealDone] = useState(false)

  const riskColors = {
    Low: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
    Medium: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
    High: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  }
  const rc = riskColors[analysis.risk]

  async function handleReseal() {
    setResealing(true)
    try {
      await onReseal(row)
      setResealDone(true)
    } finally {
      setResealing(false)
    }
  }

  return (
    <DraggableModal className="bg-white border border-border rounded-card shadow-2xl" defaultWidth={860}>
      <div className="p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-red-400 text-lg"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Integrity Mismatch Analysis</h3>
              <p className="text-steel text-xs">{row.id} — {row.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {resealDone ? (
          <div className="p-5 rounded-lg border bg-green-500/10 border-green-500/30 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <i className="fas fa-shield-alt text-green-500"></i>
              <span className="font-semibold text-green-600">Record re-sealed successfully. Trust restored.</span>
            </div>
            <p className="text-steel text-xs mt-1">
              A new cryptographic hash has been anchored to XRPL reflecting the current data state.
            </p>
          </div>
        ) : (
          <>
            {/* AI Analysis */}
            <div className={`p-4 rounded-lg border ${rc.bg} ${rc.border} mb-4`}>
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-brain text-accent"></i>
                <span className="font-semibold text-gray-900 text-sm">AI Risk Assessment</span>
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${rc.badge}`}>
                  {analysis.risk} Risk
                </span>
              </div>
              <p className="text-gray-700 text-xs leading-relaxed mb-2">{analysis.summary}</p>
              <div className="flex items-start gap-1.5 mt-2">
                <i className="fas fa-arrow-right text-accent text-[10px] mt-0.5"></i>
                <p className="text-gray-600 text-xs italic">{analysis.recommendation}</p>
              </div>
            </div>

            {/* Side-by-side comparison */}
            {diffs.length > 0 && sealed ? (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <i className="fas fa-columns text-accent"></i>
                  Side-by-Side Comparison — {diffs.length} field{diffs.length > 1 ? 's' : ''} changed
                </p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[140px_1fr_1fr] bg-[#f5f5f7] border-b border-border text-[10px] font-bold text-steel uppercase tracking-wider">
                    <div className="px-3 py-2">Field</div>
                    <div className="px-3 py-2 border-l border-border">Sealed Version</div>
                    <div className="px-3 py-2 border-l border-border">Current Version</div>
                  </div>
                  {diffs.map(d => (
                    <div key={d.field} className="grid grid-cols-[140px_1fr_1fr] border-b border-border last:border-b-0">
                      <div className="px-3 py-2.5 text-xs font-medium text-gray-700 bg-[#f5f5f7]/50">{d.label}</div>
                      <div className="px-3 py-2.5 text-xs text-gray-600 border-l border-border bg-green-50/50 break-words">
                        {d.sealed || <span className="text-steel italic">empty</span>}
                      </div>
                      <div className="px-3 py-2.5 text-xs text-gray-900 font-medium border-l border-border bg-red-50/50 break-words">
                        {d.current || <span className="text-steel italic">empty</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : !sealed ? (
              <div className="p-3 rounded-lg bg-[#f5f5f7] text-xs text-steel mb-4">
                <i className="fas fa-info-circle mr-1"></i>
                Sealed snapshot not available for field-level comparison. The hash mismatch confirms the record was modified after sealing.
              </div>
            ) : null}

            {/* XRPL Details */}
            <div className="bg-[#f5f5f7] rounded-lg p-4 space-y-2 text-xs font-mono mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-steel mb-0.5">TX Hash:</p>
                  {anchor.explorerUrl ? (
                    <a href={anchor.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all text-[11px]">
                      {anchor.txHash.slice(0, 24)}…
                    </a>
                  ) : (
                    <p className="text-gray-900 break-all text-[11px]">{anchor.txHash.slice(0, 24)}…</p>
                  )}
                </div>
                <div>
                  <p className="text-steel mb-0.5">Ledger Index:</p>
                  <p className="text-gray-900">{anchor.ledgerIndex.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-steel mb-0.5">Sealed At:</p>
                  <p className="text-gray-900">{new Date(anchor.timestamp).toLocaleString()}</p>
                </div>
                {anchor.slsFee && (
                  <div>
                    <p className="text-steel mb-0.5">Anchor Fee:</p>
                    <p className="text-gray-900">{anchor.slsFee} SLS</p>
                  </div>
                )}
              </div>
            </div>

            {/* Re-Seal CTA */}
            <button
              onClick={handleReseal}
              disabled={resealing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-60"
            >
              {resealing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Re-Sealing to XRPL…
                </>
              ) : (
                <>
                  <i className="fas fa-shield-alt"></i>
                  Re-Seal This Record — 0.01 SLS
                </>
              )}
            </button>
          </>
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
    </DraggableModal>
  )
}
