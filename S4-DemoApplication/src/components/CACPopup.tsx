import { useState } from 'react'

interface Props {
  onAuthenticated: () => void
}

export default function CACPopup({ onAuthenticated }: Props) {
  const [inserting, setInserting] = useState(false)
  const [reading, setReading] = useState(false)

  function handleInsert() {
    setInserting(true)
    setTimeout(() => {
      setReading(true)
      setTimeout(() => {
        onAuthenticated()
      }, 1400)
    }, 1000)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 animate-fadeIn">
      <div className="bg-surface border border-border rounded-card p-8 max-w-md w-full mx-4 text-center animate-slideUp">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
          <i className="fas fa-id-card text-accent text-3xl"></i>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">CAC Authentication</h2>
        <p className="text-steel mb-6">
          Insert your Common Access Card to access the S4 Ledger Deliverables Tracker.
        </p>

        {!inserting && (
          <button
            onClick={handleInsert}
            className="w-full py-3 px-6 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition-all"
          >
            <i className="fas fa-id-card mr-2"></i>
            Insert CAC
          </button>
        )}

        {inserting && !reading && (
          <div className="flex items-center justify-center gap-3 text-yellow-400">
            <i className="fas fa-spinner fa-spin"></i>
            <span>Detecting CAC reader…</span>
          </div>
        )}

        {reading && (
          <div className="flex items-center justify-center gap-3 text-green-400">
            <i className="fas fa-check-circle"></i>
            <span>CAC authenticated — SSgt. Jordan Mitchell</span>
          </div>
        )}

        <p className="text-steel/50 text-xs mt-6">
          DoD PKI · NIPR · FOUO Simulation Environment
        </p>
      </div>
    </div>
  )
}
