/**
 * PresenceBar — Collaboration presence indicator
 * Shows as a slim status bar below the main header.
 * Expandable to show full user list with roles/activity.
 */

import { useState, memo } from 'react'
import type { PresenceUser } from '../services/realtimeService'

interface Props {
  users: PresenceUser[]
  currentUserId: string
}

export default memo(function PresenceBar({ users, currentUserId }: Props) {
  const [expanded, setExpanded] = useState(false)

  const otherUsers = users.filter(u => u.userId !== currentUserId)
  if (otherUsers.length === 0) return null

  const editing = otherUsers.filter(u => u.editingCell)

  return (
    <div className="bg-white border-b border-border">
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-1.5 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] text-green-700 font-semibold uppercase tracking-wider">Live</span>
          </div>
          <div className="flex items-center -space-x-1.5">
            {otherUsers.slice(0, 8).map(u => (
              <div
                key={u.userId}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                style={{ backgroundColor: u.color }}
                title={`${u.displayName} (${u.organization})`}
              >
                {u.displayName.charAt(0).toUpperCase()}
              </div>
            ))}
            {otherUsers.length > 8 && (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-[9px] font-bold text-gray-600 shadow-sm">
                +{otherUsers.length - 8}
              </div>
            )}
          </div>
          <span className="text-[11px] text-steel">
            {otherUsers.length} team member{otherUsers.length !== 1 ? 's' : ''} online
            {editing.length > 0 && (
              <span className="text-amber-600 ml-1.5">
                &middot; {editing.length} editing
              </span>
            )}
          </span>
        </div>
        <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-[9px] text-steel`}></i>
      </button>

      {/* Expanded user list */}
      {expanded && (
        <div className="px-6 pb-3 pt-1 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {otherUsers.map(u => (
              <div
                key={u.userId}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-border/50"
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.displayName.charAt(0).toUpperCase()}
                  </div>
                  {u.editingCell && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 border border-white rounded-full flex items-center justify-center">
                      <i className="fas fa-pen text-[5px] text-white"></i>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-gray-900 truncate">{u.displayName}</p>
                  <p className="text-[9px] text-steel truncate">
                    {u.editingCell ? (
                      <span className="text-amber-600">Editing {u.editingCell.field}</span>
                    ) : u.focusedRowId ? (
                      <span className="text-blue-600">Viewing {u.focusedRowId}</span>
                    ) : (
                      <span>{u.role} &middot; {u.organization}</span>
                    )}
                  </p>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

/* ─── Cell-level editing indicator (inline in table cells) ─── */

interface CellEditIndicatorProps {
  users: PresenceUser[]
  currentUserId: string
  rowId: string
  field: string
}

export function CellEditIndicator({ users, currentUserId, rowId, field }: CellEditIndicatorProps) {
  const editing = users.filter(
    u => u.userId !== currentUserId && u.editingCell?.rowId === rowId && u.editingCell?.field === field
  )
  if (editing.length === 0) return null

  return (
    <div className="absolute top-0 right-0 flex items-center gap-0.5 px-1 py-0.5 bg-amber-100 border border-amber-300 rounded-bl-md text-[8px] text-amber-700 font-medium z-10">
      <div className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold text-white" style={{ backgroundColor: editing[0].color }}>
        {editing[0].displayName.charAt(0)}
      </div>
      editing
    </div>
  )
}

/* ─── Row-level presence dots (shown in row hover) ─── */

interface RowPresenceProps {
  users: PresenceUser[]
  currentUserId: string
  rowId: string
}

export function RowPresence({ users, currentUserId, rowId }: RowPresenceProps) {
  const viewing = users.filter(
    u => u.userId !== currentUserId && u.focusedRowId === rowId
  )
  if (viewing.length === 0) return null

  return (
    <div className="flex items-center -space-x-1">
      {viewing.slice(0, 3).map(u => (
        <div
          key={u.userId}
          className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[7px] font-bold text-white"
          style={{ backgroundColor: u.color }}
          title={`${u.displayName} is viewing this row`}
        >
          {u.displayName.charAt(0)}
        </div>
      ))}
      {viewing.length > 3 && (
        <div className="w-4 h-4 rounded-full border border-white bg-gray-300 flex items-center justify-center text-[7px] font-bold text-gray-600">
          +{viewing.length - 3}
        </div>
      )}
    </div>
  )
}
