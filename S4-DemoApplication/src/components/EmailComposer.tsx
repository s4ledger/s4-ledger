import { useState } from 'react'
import { SyncNotification, generateEmailBody } from '../utils/externalSync'
import { UserRole } from '../types'

interface Props {
  notification: SyncNotification
  role: UserRole
  onClose: () => void
}

export default function EmailComposer({ notification, role, onClose }: Props) {
  const email = generateEmailBody(notification, role)
  const [subject, setSubject] = useState(email.subject)
  const [body, setBody] = useState(email.body)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  function handleSend() {
    setSending(true)
    // Simulated send
    setTimeout(() => {
      setSending(false)
      setSent(true)
    }, 1500)
  }

  if (sent) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="bg-white border border-border rounded-card p-6 max-w-lg w-full mx-4 animate-slideUp text-center"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-green-500/15 flex items-center justify-center mb-4">
            <i className="fas fa-check-circle text-green-500 text-2xl"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Email Sent Successfully</h3>
          <p className="text-sm text-steel mb-1">
            Notification delivered to {email.to.length} stakeholder{email.to.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-steel mb-4">
            {email.to.join(', ')}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-all"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-white border border-border rounded-card p-6 max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
              <i className="fas fa-envelope text-accent text-sm"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Compose Stakeholder Update</h3>
              <p className="text-steel text-xs">{notification.rowId} — RACI-Based Distribution</p>
            </div>
          </div>
          <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Recipients */}
        <div className="mb-3">
          <label className="text-[10px] text-steel uppercase tracking-wide block mb-1">To (RACI Stakeholders)</label>
          <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 border border-border rounded-lg">
            {email.to.map(recipient => (
              <span
                key={recipient}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent text-xs font-medium rounded-md"
              >
                <i className="fas fa-user text-[9px]"></i>
                {recipient}
              </span>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="mb-3">
          <label className="text-[10px] text-steel uppercase tracking-wide block mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-accent"
          />
        </div>

        {/* Priority badge */}
        <div className="mb-3 flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
            notification.priority === 'critical' ? 'bg-red-500/15 text-red-500' :
            notification.priority === 'high' ? 'bg-orange-500/15 text-orange-500' :
            notification.priority === 'medium' ? 'bg-yellow-500/15 text-yellow-600' :
            'bg-green-500/15 text-green-500'
          }`}>
            {notification.priority} Priority
          </span>
          <span className="text-[10px] text-steel">
            {new Date(notification.timestamp).toLocaleString()}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 mb-4">
          <label className="text-[10px] text-steel uppercase tracking-wide block mb-1">Message Body</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={14}
            className="w-full bg-gray-50 border border-border rounded-lg px-3 py-2.5 text-xs text-gray-700 font-mono leading-relaxed focus:outline-none focus:border-accent resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <p className="text-[10px] text-steel">
            <i className="fas fa-lock mr-1"></i>
            Encrypted · FOUO Simulation
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-black/[0.03] hover:bg-black/[0.06] border border-border rounded-lg text-sm text-steel transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white rounded-lg text-sm font-medium transition-all"
            >
              {sending ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Sending…
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Send Update
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
