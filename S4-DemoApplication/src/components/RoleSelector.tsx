import { UserRole } from '../types'

interface Props {
  onSelect: (role: UserRole) => void
}

const roles: { role: UserRole; icon: string; desc: string }[] = [
  {
    role: 'Program Manager',
    icon: 'fa-user-tie',
    desc: 'Full visibility into all deliverables, anchoring, and AI analysis.',
  },
  {
    role: 'Contracting Officer',
    icon: 'fa-file-contract',
    desc: 'Track contract compliance, review submissions, and generate reports.',
  },
  {
    role: 'Quality Assurance',
    icon: 'fa-clipboard-check',
    desc: 'Verify deliverable integrity and review blockchain-anchored records.',
  },
  {
    role: 'Logistics Specialist',
    icon: 'fa-truck',
    desc: 'Monitor supply-chain deliverables and submission timelines.',
  },
]

export default function RoleSelector({ onSelect }: Props) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 animate-fadeIn">
      <div className="bg-surface border border-border rounded-card p-8 max-w-lg w-full mx-4 animate-slideUp">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Select Your Role</h2>
        <p className="text-steel text-sm text-center mb-6">
          Choose a role to configure your Deliverables Tracker view.
        </p>

        <div className="space-y-3">
          {roles.map(r => (
            <button
              key={r.role}
              onClick={() => onSelect(r.role)}
              className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-accent/15 border border-transparent hover:border-accent/40 rounded-lg transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-accent/20 group-hover:bg-accent/30 flex items-center justify-center flex-shrink-0">
                <i className={`fas ${r.icon} text-accent`}></i>
              </div>
              <div>
                <p className="text-white font-medium">{r.role}</p>
                <p className="text-steel text-xs">{r.desc}</p>
              </div>
              <i className="fas fa-chevron-right text-steel/40 group-hover:text-accent ml-auto"></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
