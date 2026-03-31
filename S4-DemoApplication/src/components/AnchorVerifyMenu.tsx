import { CDRLRow } from '../types'

interface Props {
  row: CDRLRow
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
      <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded-lg shadow-2xl py-1 min-w-[180px] animate-fadeIn">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-semibold text-white truncate">{row.id}</p>
        </div>
        <button
          onClick={onAnchor}
          disabled={isAnchored}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
        >
          <i className="fas fa-link text-accent text-xs w-4"></i>
          <span className="text-white">{isAnchored ? 'Already Anchored' : 'Anchor to XRPL'}</span>
        </button>
        <button
          onClick={onVerify}
          disabled={!isAnchored}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
        >
          <i className="fas fa-check-double text-green-400 text-xs w-4"></i>
          <span className="text-white">Verify Integrity</span>
        </button>
        <button
          onClick={onAIAssist}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors text-left"
        >
          <i className="fas fa-brain text-accent text-xs w-4"></i>
          <span className="text-white">AI Analysis</span>
        </button>
      </div>
    </>
  )
}
