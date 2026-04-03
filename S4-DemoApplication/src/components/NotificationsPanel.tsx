import DraggableModal from './DraggableModal'
import { SyncNotification } from '../utils/externalSync'

interface Props {
  notifications: SyncNotification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onSendEmail: (notification: SyncNotification) => void
  onClose: () => void
}

function priorityColor(p: string): string {
  if (p === 'critical') return 'text-red-500 bg-red-500/15'
  if (p === 'high') return 'text-orange-500 bg-orange-500/15'
  if (p === 'medium') return 'text-yellow-600 bg-yellow-500/15'
  return 'text-green-500 bg-green-500/15'
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationsPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onSendEmail,
  onClose,
}: Props) {
  const unread = notifications.filter(n => !n.read).length

  return (
    <DraggableModal className="bg-white border border-border rounded-card shadow-2xl" defaultWidth={400} zIndex={50}>
      <div className="flex flex-col max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <i className="fas fa-bell text-accent text-sm"></i>
          <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[10px] text-accent hover:text-accent/80 font-medium transition-colors"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors">
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <i className="fas fa-check-circle text-green-400 text-2xl mb-2"></i>
            <p className="text-sm text-steel">All clear — no notifications</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`px-4 py-3 border-b border-border/50 transition-colors cursor-pointer hover:bg-black/[0.02] ${
                !n.read ? 'bg-accent/[0.03]' : ''
              }`}
              onClick={() => onMarkRead(n.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${priorityColor(n.priority)}`}>
                  <i className={`fas ${
                    n.priority === 'critical' ? 'fa-exclamation-triangle' :
                    n.priority === 'high' ? 'fa-exclamation-circle' :
                    n.priority === 'medium' ? 'fa-info-circle' :
                    'fa-check-circle'
                  } text-[10px]`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-xs font-semibold ${!n.read ? 'text-gray-900' : 'text-steel'}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-steel leading-relaxed line-clamp-2">{n.body}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${priorityColor(n.priority)}`}>
                      {n.priority}
                    </span>
                    <span className="text-[10px] text-steel">{timeAgo(n.timestamp)}</span>
                    <span className="text-[10px] text-steel">·</span>
                    <span className="text-[10px] text-steel truncate">
                      {n.stakeholders.slice(0, 2).join(', ')}{n.stakeholders.length > 2 ? ` +${n.stakeholders.length - 2}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onSendEmail(n) }}
                  className="flex-shrink-0 w-7 h-7 rounded-md bg-accent/10 hover:bg-accent/20 text-accent transition-all flex items-center justify-center"
                  title="Compose Update Email"
                >
                  <i className="fas fa-envelope text-[10px]"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-gray-50/50">
          <p className="text-[10px] text-steel text-center">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''} · Powered by NSERC IDE Auto-Sync
          </p>
        </div>
      )}
      </div>
    </DraggableModal>
  )
}
