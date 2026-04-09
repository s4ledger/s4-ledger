/**
 * ═══════════════════════════════════════════════════════════════
 *  Chat Service — Team Messaging + AI Chat
 *  Supabase Realtime: Broadcast channels for team messaging
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '../lib/supabaseClient'
import type { Organization, UserRole } from '../types'
import type { RealtimeChannel } from '@supabase/supabase-js'

/* ─── Types ──────────────────────────────────────────────────── */

export interface ChatMessage {
  id: string
  channelId: string
  senderId: string
  senderName: string
  senderRole: UserRole
  senderOrg: Organization
  text: string
  timestamp: string
  priority: 'normal' | 'urgent' | 'critical'
  /** Row reference for contextual messages */
  rowRef?: { rowId: string; title: string }
  /** Mentions — userId strings */
  mentions: string[]
  /** Read receipt tracking */
  readBy: string[]
}

export interface ChatChannel {
  id: string
  name: string
  type: 'general' | 'craft' | 'direct'
  /** For craft channels — which craft/hull */
  craftLabel?: string
  /** For DM channels — the two participant IDs */
  participants?: string[]
  unreadCount: number
  lastMessage?: ChatMessage
}

export interface AIAgent {
  id: string
  name: string
  description: string
  icon: string
  focusArea: string
  instructions: string
  createdBy: string
  createdAt: string
}

/* ─── Default Channels (config-driven) ───────────────────── */

import { getConfigOrDemo } from '../config/appConfig'

function buildDefaultChannels(): ChatChannel[] {
  const config = getConfigOrDemo()
  const craftLabels = config.chatCraftChannels ?? config.craftRegistry.slice(0, 3).map(c => c.label)
  return [
    { id: 'general', name: 'General', type: 'general', unreadCount: 0 },
    ...craftLabels.map(label => ({
      id: `craft-${label.toLowerCase().replace(/\s+/g, '-')}`,
      name: label,
      type: 'craft' as const,
      craftLabel: label,
      unreadCount: 0,
    })),
  ]
}

export const DEFAULT_CHANNELS: ChatChannel[] = buildDefaultChannels()

/* ─── Team Roster (all known users — online + offline) ──── */

export interface TeamMember {
  userId: string
  displayName: string
  role: UserRole
  org: Organization
  /** Static status for demo roster — real status comes from presence */
  online: boolean
}

export const TEAM_ROSTER: TeamMember[] = [
  { userId: 'sim-cdr-martinez', displayName: 'CDR J. Martinez', role: 'Program Manager', org: 'Government', online: false },
  { userId: 'sim-lisa-chen', displayName: 'Lisa Chen', role: 'Contracting Officer', org: 'Government', online: false },
  { userId: 'sim-mike-torres', displayName: 'Mike Torres', role: 'Quality Assurance', org: 'Contractor', online: false },
  { userId: 'sim-sarah-kim', displayName: 'Sarah Kim', role: 'Logistics Specialist', org: 'Government', online: false },
  { userId: 'sim-rob-jenkins', displayName: 'Rob Jenkins', role: 'Shipbuilder Representative', org: 'Shipbuilder', online: false },
  { userId: 'sim-patel', displayName: 'R. Patel', role: 'Quality Assurance', org: 'Government', online: false },
  { userId: 'sim-nguyen', displayName: 'T. Nguyen', role: 'Logistics Specialist', org: 'Contractor', online: false },
  { userId: 'sim-davis', displayName: 'J. Davis', role: 'Program Manager', org: 'Government', online: false },
]

/** Create a DM channel for two participants */
export function createDMChannel(myUserId: string, _myName: string, targetUserId: string, targetName: string): ChatChannel {
  const participants = [myUserId, targetUserId].sort()
  const id = `dm-${participants.join('-')}`
  return {
    id,
    name: targetName,
    type: 'direct',
    participants,
    unreadCount: 0,
  }
}

/* ─── Default AI Agents ─────────────────────────────────────── */

export const DEFAULT_AGENTS: AIAgent[] = [
  {
    id: 'compliance-monitor',
    name: 'Compliance Monitor',
    description: 'Watches all DRL submissions for overdue items, SLA breaches, and compliance drift. Alerts when action is needed.',
    icon: 'fa-shield-alt',
    focusArea: 'Compliance & SLA tracking',
    instructions: 'You are a compliance monitoring agent for PMS 300 (U.S. Navy & FMS Boats and Craft). Monitor all DRL deliverables for overdue submissions, SLA breaches, status regressions, and compliance drift. Be concise and action-oriented. Use Navy terminology. Flag issues with severity levels. Reference specific contract requirements when possible.',
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'status-briefer',
    name: 'Status Briefer',
    description: 'Generates executive-level status summaries for leadership meetings. Summarizes by craft type, risk level, and action items.',
    icon: 'fa-chart-bar',
    focusArea: 'Executive reporting & briefings',
    instructions: 'You are a status briefing agent for PMS 300. Generate concise executive summaries suitable for leadership meetings. Organize by craft type, highlight top risks, pending actions, and recent progress. Use professional military briefing format. Keep it under 200 words unless asked for detail.',
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'contract-advisor',
    name: 'Contract Advisor',
    description: 'Answers questions about contract requirements, FAR/DFARS clauses, submission schedules, and compliance obligations.',
    icon: 'fa-file-contract',
    focusArea: 'Contract & regulatory guidance',
    instructions: 'You are a contract advisory agent for PMS 300 (U.S. Navy service craft & small boats contracts). Answer questions about contract requirements, FAR/DFARS clauses, DRL submission schedules, and compliance obligations. Reference specific contract clauses when possible. Advise on cure notices, corrective actions, and escalation procedures per FAR 52.249.',
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00Z',
  },
]

/* ─── Simulated Team Messages (Demo Mode) ──────────────────── */

const SIMULATED_MESSAGES: Omit<ChatMessage, 'id' | 'timestamp' | 'readBy'>[] = [
  {
    channelId: 'general',
    senderId: 'sim-cdr-martinez',
    senderName: 'CDR J. Martinez',
    senderRole: 'Program Manager',
    senderOrg: 'Government',
    text: 'Team — weekly DRL review meeting moved to Thursday 1400. All craft leads please have status updates ready.',
    priority: 'normal',
    mentions: [],
  },
  {
    channelId: 'general',
    senderId: 'sim-lisa-chen',
    senderName: 'Lisa Chen',
    senderRole: 'Contracting Officer',
    senderOrg: 'Government',
    text: 'Reminder: Hull 3 ILS plan is approaching the 30-day contract deadline. @Rob Jenkins — please confirm submission timeline.',
    priority: 'urgent',
    mentions: ['sim-rob-jenkins'],
  },
  {
    channelId: 'craft-40ft-patrol',
    senderId: 'sim-mike-torres',
    senderName: 'Mike Torres',
    senderRole: 'Quality Assurance',
    senderOrg: 'Contractor',
    text: 'Completed QA review on the Systems Engineering Plan (SEP) Rev B for Hull 1. No findings — recommending approval.',
    priority: 'normal',
    mentions: [],
  },
  {
    channelId: 'craft-40ft-patrol',
    senderId: 'sim-rob-jenkins',
    senderName: 'Rob Jenkins',
    senderRole: 'Shipbuilder Representative',
    senderOrg: 'Shipbuilder',
    text: 'Hull 2 test procedures will be uploaded by EOD. Had to coordinate with the subcontractor on the updated propulsion test sequence.',
    priority: 'normal',
    mentions: [],
  },
  {
    channelId: 'general',
    senderId: 'sim-sarah-kim',
    senderName: 'Sarah Kim',
    senderRole: 'Logistics Specialist',
    senderOrg: 'Government',
    text: '⚠️ CRITICAL: Spare parts list for Harbor Tug YTB is 15 days overdue. This is blocking the provisioning conference. Need immediate action.',
    priority: 'critical',
    mentions: [],
  },
  {
    channelId: 'craft-harbor-tug',
    senderId: 'sim-sarah-kim',
    senderName: 'Sarah Kim',
    senderRole: 'Logistics Specialist',
    senderOrg: 'Government',
    text: 'Following up on the Harbor Tug ILS conference — we need the updated weight report before we can finalize the provisioning plan.',
    priority: 'urgent',
    mentions: [],
  },
  {
    channelId: 'craft-11m-rhib',
    senderId: 'sim-cdr-martinez',
    senderName: 'CDR J. Martinez',
    senderRole: 'Program Manager',
    senderOrg: 'Government',
    text: 'Good progress on the 11m RHIB program. All Hull 1 deliverables are tracking green. Let\'s keep it up.',
    priority: 'normal',
    mentions: [],
  },
]

/* ─── Chat State Manager ─────────────────────────────────────── */

let chatChannel: RealtimeChannel | null = null
let messageCallback: ((msg: ChatMessage) => void) | null = null

export function initChatMessages(): ChatMessage[] {
  const now = Date.now()
  return SIMULATED_MESSAGES.map((m, i) => ({
    ...m,
    id: `msg-${i}-${now}`,
    timestamp: new Date(now - (SIMULATED_MESSAGES.length - i) * 300000).toISOString(), // stagger 5 min apart
    readBy: [],
  }))
}

/** Load persisted chat messages from Supabase for a set of channels */
export async function loadChatHistory(channelIds: string[]): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .in('channel_id', channelIds)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error || !data) {
      console.warn('Failed to load chat history:', error?.message)
      return []
    }

    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      channelId: row.channel_id as string,
      senderId: row.sender_id as string,
      senderName: row.sender_name as string,
      senderRole: row.sender_role as UserRole,
      senderOrg: row.sender_org as Organization,
      text: row.text as string,
      timestamp: row.created_at as string,
      priority: (row.priority as ChatMessage['priority']) || 'normal',
      rowRef: row.row_ref as ChatMessage['rowRef'],
      mentions: (row.mentions as string[]) || [],
      readBy: (row.read_by as string[]) || [],
    }))
  } catch (e) {
    console.warn('Failed to load chat history:', e)
    return []
  }
}

export function subscribeToChatMessages(
  _userId: string,
  onMessage: (msg: ChatMessage) => void,
): () => void {
  // Clean up any existing channel before creating a new one
  if (chatChannel) {
    try { supabase.removeChannel(chatChannel) } catch { /* ignore */ }
    chatChannel = null
  }

  messageCallback = onMessage

  try {
    chatChannel = supabase.channel('s4-team-chat')

    chatChannel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      if (payload) {
        messageCallback?.(payload as ChatMessage)
      }
    })

    chatChannel.subscribe((_status, err) => {
      if (err) {
        console.warn('S4 Chat subscription error:', err)
      }
    })
  } catch (e) {
    console.warn('S4 Chat channel setup failed:', e)
  }

  // Capture channel reference for cleanup closure
  const channelToClean = chatChannel
  return () => {
    if (channelToClean) {
      try { supabase.removeChannel(channelToClean) } catch { /* ignore */ }
    }
    if (chatChannel === channelToClean) {
      chatChannel = null
      messageCallback = null
    }
  }
}

export async function sendChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp' | 'readBy'>): Promise<ChatMessage> {
  const fullMsg: ChatMessage = {
    ...msg,
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    readBy: [msg.senderId],
  }

  // Broadcast via Supabase Realtime (instant delivery)
  try {
    if (chatChannel) {
      await chatChannel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: fullMsg,
      })
    }
  } catch (e) {
    console.warn('Failed to broadcast chat message:', e)
  }

  // Persist to Supabase chat_messages table (durable storage)
  try {
    await supabase.from('chat_messages').insert({
      id: fullMsg.id,
      channel_id: fullMsg.channelId,
      sender_id: fullMsg.senderId,
      sender_name: fullMsg.senderName,
      sender_role: fullMsg.senderRole,
      sender_org: fullMsg.senderOrg,
      text: fullMsg.text,
      priority: fullMsg.priority,
      mentions: fullMsg.mentions,
      read_by: fullMsg.readBy,
      row_ref: fullMsg.rowRef || null,
      created_at: fullMsg.timestamp,
    })
  } catch (e) {
    console.warn('Failed to persist chat message:', e)
  }

  return fullMsg
}

/** Parse @mentions from message text */
export function parseMentions(text: string, knownUsers: Array<{ userId: string; displayName: string }>): string[] {
  const mentioned: string[] = []
  for (const u of knownUsers) {
    if (text.includes(`@${u.displayName}`)) {
      mentioned.push(u.userId)
    }
  }
  return mentioned
}
