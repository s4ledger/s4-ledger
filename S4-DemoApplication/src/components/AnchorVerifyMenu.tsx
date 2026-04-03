import { DRLRow } from '../types'

interface Props {
  row: DRLRow
  isAnchored: boolean
  onAnchor: () => void
  onVerify: () => void
  onAIAssist: () => void
  onClose: () => void
}

export default function AnchorVerifyMenu({ row, isAnchored, onAnchor, onVerify, onAIAssist, onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-border rounded-lg shadow-2xl py-1 min-w-[180px] animate-fadeIn">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-semibold text-gray-900 truncate">{row.id}</p>
        </div>
        <button
          onClick={onAnchor}
          disabled={isAnchored}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/[0.03] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
        >
          <i className="fas fa-link text-accent text-xs w-4"></i>
          <span className="text-gray-900">{isAnchored ? 'Already Sealed' : 'Seal to Ledger'}</span>
        </button>
        <button
          onClick={onVerify}
          disabled={!isAnchored}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/[0.03] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
        >
          <i className="fas fa-check-double text-green-400 text-xs w-4"></i>
          <span className="text-gray-900">Verify Against Previous Seal</span>
        </button>
        <button
          onClick={onAIAssist}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/[0.03] transition-colors text-left"
        >
          <i className="fas fa-brain text-accent text-xs w-4"></i>
          <span className="text-gray-900">AI Analysis</span>
        </button>
      </div>
    </>
  )
}
