/**
 * PresenceBar — Shows who's online in the Deliverables Tracker
 * Displays avatar circles with tooltips for each connected user.
 * Editing indicators shown per-row.
 */

import { useState } from 'react'
import type { PresenceUser } from '../services/realtimeService'

interface Props {
  users: PresenceUser[]
  currentUserId: string
}

export default function PresenceBar({ users, currentUserId }: Props) {
  const [expanded, setExpanded] = useState(false)

  // Exclude current user from the display
  const otherUsers = users.filter(u => u.userId !== currentUserId)
  if (otherUsers.length === 0) return null

  const displayUsers = expanded ? otherUsers : otherUsers.slice(0, 5)
  const overflow = otherUsers.length - 5

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mr-1">Online</span>
      <div className="flex items-center -space-x-1.5">
        {displayUsers.map(u => (
          <div
            key={u.userId}
            className="relative group"
          >
            {/* Avatar circle */}
            <div
              className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white cursor-default shadow-sm"
              style={{ backgroundColor: u.color }}
              title={`${u.displayName} (${u.organization})`}
            >
              {u.displayName.charAt(0).toUpperCase()}
            </div>
            {/* Editing indicator */}
            {u.editingCell && (
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 border border-white rounded-full flex items-center justify-center">
                <i className="fas fa-pen text-[5px] text-white"></i>
              </div>
            )}
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              <p className="font-semibold">{u.displayName}</p>
              <p className="text-gray-300">{u.role} · {u.organization}</p>
              {u.editingCell && (
                <p className="text-amber-300 mt-0.5">
                  <i className="fas fa-pen text-[8px] mr-0.5"></i>
                  Editing {u.editingCell.field}
                </p>
              )}
              {u.focusedRowId && !u.editingCell && (
                <p className="text-blue-300 mt-0.5">
                  <i className="fas fa-eye text-[8px] mr-0.5"></i>
                  Viewing {u.focusedRowId}
                </p>
              )}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        ))}
        {!expanded && overflow > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-7 h-7 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600 hover:bg-gray-400 transition-colors shadow-sm"
            title={`${overflow} more user${overflow !== 1 ? 's' : ''}`}
          >
            +{overflow}
          </button>
        )}
      </div>
      {/* Green "Live" indicator */}
      <div className="flex items-center gap-1 ml-1">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
        <span className="text-[10px] text-green-600 font-medium">Live</span>
      </div>
    </div>
  )
}

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
