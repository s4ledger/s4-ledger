interface Props {
  onContinue: () => void
}

export default function WelcomeCard({ onContinue }: Props) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 animate-fadeIn">
      <div className="bg-white border border-border rounded-card p-8 max-w-lg w-full mx-4 animate-slideUp">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-shield-alt text-accent text-xl"></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome, SSgt. Mitchell</h2>
            <p className="text-steel text-sm">S4 Ledger · Deliverables Tracker</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 bg-black/[0.03] rounded-lg p-3">
            <i className="fas fa-lock text-green-400 mt-0.5"></i>
            <div>
              <p className="text-gray-900 text-sm font-medium">Blockchain-Verified Records</p>
              <p className="text-steel text-xs">Every deliverable is sealed to the XRP Ledger for tamper-proof accountability.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-black/[0.03] rounded-lg p-3">
            <i className="fas fa-brain text-accent mt-0.5"></i>
            <div>
              <p className="text-gray-900 text-sm font-medium">AI-Assisted Analysis</p>
              <p className="text-steel text-xs">Get instant risk assessments and compliance insights powered by AI.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-black/[0.03] rounded-lg p-3">
            <i className="fas fa-file-pdf text-red-400 mt-0.5"></i>
            <div>
              <p className="text-gray-900 text-sm font-medium">One-Click PDF Reports</p>
              <p className="text-steel text-xs">Generate professional deliverables status reports instantly.</p>
            </div>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3 px-6 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition-all"
        >
          Continue
          <i className="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    </div>
  )
}
