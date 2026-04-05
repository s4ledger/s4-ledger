/**
 * ═══════════════════════════════════════════════════════════════
 *  Real-Time Collaboration Service
 *  Supabase Realtime: Presence + Broadcast
 * ═══════════════════════════════════════════════════════════════
 *
 * Enables multi-user collaboration on the Deliverables Tracker:
 * • Presence — who's online, what cell/row they're viewing/editing
 * • Broadcast — push cell edits, workflow transitions, and notes
 *   to all connected clients in real-time
 *
 * Uses Supabase Realtime channels (built into @supabase/supabase-js v2).
 * No additional server infrastructure required.
 */

import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Organization, UserRole } from '../types'

/* ─── Types ──────────────────────────────────────────────────── */

export interface PresenceUser {
  /** Unique user ID (Supabase auth uid or demo-mode generated) */
  userId: string
  /** Display name */
  displayName: string
  /** User's role */
  role: UserRole
  /** User's organization */
  organization: Organization
  /** Which row the user is currently focused on (null = overview) */
  focusedRowId: string | null
  /** Which cell the user is actively editing (null = not editing) */
  editingCell: { rowId: string; field: string } | null
  /** ISO timestamp of last activity */
  lastSeen: string
  /** Avatar color for visual identification */
  color: string
}

export interface BroadcastEvent {
  type: 'cell_edit' | 'workflow_transition' | 'notes_update' | 'row_focus' | 'cursor_move'
  payload: Record<string, unknown>
  sender: {
    userId: string
    displayName: string
    organization: Organization
  }
  timestamp: string
}

/* ─── Constants ──────────────────────────────────────────────── */

const CHANNEL_NAME = 's4-drl-tracker'
const AVATAR_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
]

/* ─── Service ────────────────────────────────────────────────── */

let channel: RealtimeChannel | null = null
let currentPresence: PresenceUser | null = null

/** Callbacks registered by the consuming component */
let onPresenceChange: ((users: PresenceUser[]) => void) | null = null
let onBroadcast: ((event: BroadcastEvent) => void) | null = null

function getAvatarColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/**
 * Join the real-time collaboration channel.
 * Call once when the tracker mounts.
 */
export function joinCollaboration(
  user: { userId: string; displayName: string; role: UserRole; organization: Organization },
  callbacks: {
    onPresenceChange: (users: PresenceUser[]) => void
    onBroadcast: (event: BroadcastEvent) => void
  },
): void {
  if (channel) return // already joined

  onPresenceChange = callbacks.onPresenceChange
  onBroadcast = callbacks.onBroadcast

  currentPresence = {
    ...user,
    focusedRowId: null,
    editingCell: null,
    lastSeen: new Date().toISOString(),
    color: getAvatarColor(user.userId),
  }

  channel = supabase.channel(CHANNEL_NAME, {
    config: { presence: { key: user.userId } },
  })

  // ── Presence sync ──
  channel.on('presence', { event: 'sync' }, () => {
    if (!channel) return
    const state = channel.presenceState<PresenceUser>()
    const users: PresenceUser[] = []
    for (const key of Object.keys(state)) {
      const presences = state[key]
      if (presences && presences.length > 0) {
        users.push(presences[0] as unknown as PresenceUser)
      }
    }
    onPresenceChange?.(users)
  })

  // ── Broadcast receive ──
  channel.on('broadcast', { event: 'tracker_event' }, ({ payload }) => {
    if (!payload) return
    onBroadcast?.(payload as BroadcastEvent)
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED' && currentPresence) {
      await channel?.track(currentPresence)
    }
  })
}

/**
 * Leave the collaboration channel.
 * Call when the tracker unmounts.
 */
export async function leaveCollaboration(): Promise<void> {
  if (channel) {
    await channel.untrack()
    await supabase.removeChannel(channel)
    channel = null
    currentPresence = null
    onPresenceChange = null
    onBroadcast = null
  }
}

/**
 * Update the user's focus (which row they're looking at).
 */
export async function updateFocus(rowId: string | null): Promise<void> {
  if (!channel || !currentPresence) return
  currentPresence = {
    ...currentPresence,
    focusedRowId: rowId,
    editingCell: null,
    lastSeen: new Date().toISOString(),
  }
  await channel.track(currentPresence)
}

/**
 * Signal that the user is editing a specific cell.
 */
export async function startEditing(rowId: string, field: string): Promise<void> {
  if (!channel || !currentPresence) return
  currentPresence = {
    ...currentPresence,
    editingCell: { rowId, field },
    focusedRowId: rowId,
    lastSeen: new Date().toISOString(),
  }
  await channel.track(currentPresence)
}

/**
 * Signal that the user finished editing.
 */
export async function stopEditing(): Promise<void> {
  if (!channel || !currentPresence) return
  currentPresence = {
    ...currentPresence,
    editingCell: null,
    lastSeen: new Date().toISOString(),
  }
  await channel.track(currentPresence)
}

/**
 * Broadcast a data change event to all other connected clients.
 */
export async function broadcastChange(event: Omit<BroadcastEvent, 'timestamp'>): Promise<void> {
  if (!channel) return
  await channel.send({
    type: 'broadcast',
    event: 'tracker_event',
    payload: {
      ...event,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Get the current user's presence object.
 */
export function getCurrentPresence(): PresenceUser | null {
  return currentPresence
}
