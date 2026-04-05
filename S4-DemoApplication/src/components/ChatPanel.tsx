/**
 * ChatPanel — Unified chat panel with three tabs: AI, Team, Agents
 * Collapsible right-side panel for the Deliverables Tracker.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { DRLRow, AnchorRecord, UserRole, Organization } from '../types'
import type { PresenceUser } from '../services/realtimeService'
import type { AIRowInsight } from '../utils/aiAnalysis'
import { chatWithAI, type AIChatMessage } from '../utils/aiService'
import {
  initChatMessages,
  subscribeToChatMessages,
  sendChatMessage,
  DEFAULT_CHANNELS,
  DEFAULT_AGENTS,
  type ChatMessage,
  type ChatChannel,
  type AIAgent,
} from '../services/chatService'

/* ─── Types ─────────────────────────────────────────────── */

type ChatTab = 'ai' | 'team' | 'agents'

interface Props {
  data: DRLRow[]
  anchors: Record<string, AnchorRecord>
  aiInsights: Record<string, AIRowInsight>
  role: UserRole
  org: Organization
  userId: string
  displayName: string
  collabUsers: PresenceUser[]
  onClose: () => void
}

/* ─── AI Chat Tab ───────────────────────────────────────── */

function AIChatTab({ data, anchors, aiInsights, role, userId, displayName }: {
  data: DRLRow[]; anchors: Record<string, AnchorRecord>; aiInsights: Record<string, AIRowInsight>
  role: UserRole; userId: string; displayName: string
}) {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    { role: 'ai', text: `Hello, ${displayName}. I'm your S4 Ledger AI Assistant. I have full context on all ${data.length} DRL deliverables, seal records, and compliance status.\n\nAsk me about deadlines, risk, status summaries, drafting communications, or anything else.` },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const buildContext = useCallback(() => {
    const green = data.filter(r => r.status === 'green').length
    const yellow = data.filter(r => r.status === 'yellow').length
    const red = data.filter(r => r.status === 'red').length
    const sealed = Object.keys(anchors).length
    return `S4 Ledger DRL Tracker for PMS 300 (U.S. Navy Boats & Craft). ` +
      `${data.length} deliverables: ${green} green, ${yellow} yellow, ${red} red. ` +
      `${sealed} records sealed to trust layer. User: ${displayName} (${role}).`
  }, [data, anchors, displayName, role])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      const result = await chatWithAI({
        message: text,
        conversation: messages,
        tool_context: 'drl_tracker',
        analysis_data: {
          context: buildContext(),
          totalRows: data.length,
          statusBreakdown: {
            green: data.filter(r => r.status === 'green').length,
            yellow: data.filter(r => r.status === 'yellow').length,
            red: data.filter(r => r.status === 'red').length,
          },
          sealedCount: Object.keys(anchors).length,
          role,
        },
      })

      if (!result.fallback && result.response) {
        setMessages(prev => [...prev, { role: 'ai', text: result.response }])
      } else {
        // Local fallback — summarize based on query
        const fallback = generateLocalResponse(text, data, aiInsights, anchors)
        setMessages(prev => [...prev, { role: 'ai', text: fallback }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'I encountered an error processing your request. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, data, anchors, aiInsights, role, buildContext])

  const suggestions = [
    'Show me all overdue deliverables',
    'What changed since last week?',
    'Draft a status update for leadership',
    'Which items need immediate attention?',
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}>
              {msg.role !== 'user' && (
                <div className="flex items-center gap-1.5 mb-1">
                  <i className="fas fa-robot text-accent text-[10px]"></i>
                  <span className="text-[10px] font-semibold text-accent">S4 AI</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-3.5 py-2.5 rounded-bl-sm">
              <div className="flex items-center gap-1.5">
                <i className="fas fa-robot text-accent text-[10px]"></i>
                <span className="text-[10px] font-semibold text-accent">S4 AI</span>
              </div>
              <div className="flex gap-1 mt-1.5">
                <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions — only show on first message */}
        {messages.length <= 1 && (
          <div className="space-y-1.5 pt-2">
            <p className="text-[10px] text-steel font-medium uppercase tracking-wider">Suggestions</p>
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => { setInput(s); }}
                className="block w-full text-left text-xs px-3 py-2 bg-accent/5 hover:bg-accent/10 border border-accent/15 rounded-lg text-accent transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Ask about deliverables, risk, status..."
            className="flex-1 text-sm bg-gray-50 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-9 h-9 flex items-center justify-center bg-accent hover:bg-accent/90 disabled:bg-accent/40 text-white rounded-lg transition-colors"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Team Chat Tab ─────────────────────────────────────── */

function TeamChatTab({ userId, displayName, role, org, collabUsers }: {
  userId: string; displayName: string; role: UserRole; org: Organization; collabUsers: PresenceUser[]
}) {
  const [channels] = useState<ChatChannel[]>(() => DEFAULT_CHANNELS)
  const [activeChannel, setActiveChannel] = useState('general')
  const [allMessages, setAllMessages] = useState<ChatMessage[]>(() => initChatMessages())
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showChannels, setShowChannels] = useState(true)

  // Subscribe to real-time messages
  useEffect(() => {
    const unsub = subscribeToChatMessages(userId, (msg) => {
      setAllMessages(prev => [...prev, msg])
    })
    return unsub
  }, [userId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [allMessages, activeChannel])

  const channelMessages = useMemo(
    () => allMessages.filter(m => m.channelId === activeChannel),
    [allMessages, activeChannel],
  )

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text) return
    setInput('')

    const msg = await sendChatMessage({
      channelId: activeChannel,
      senderId: userId,
      senderName: displayName,
      senderRole: role,
      senderOrg: org,
      text,
      priority: text.includes('⚠️') || text.includes('CRITICAL') ? 'critical' : text.includes('URGENT') ? 'urgent' : 'normal',
      mentions: [],
    })

    setAllMessages(prev => [...prev, msg])
  }, [input, activeChannel, userId, displayName, role, org])

  const activeChannelInfo = channels.find(c => c.id === activeChannel)

  const getOrgColor = (o: Organization) => o === 'Government' ? 'text-blue-600' : o === 'Contractor' ? 'text-amber-600' : 'text-emerald-600'

  return (
    <div className="flex flex-col h-full">
      {/* Channel selector / header */}
      <div className="border-b border-border">
        <button
          onClick={() => setShowChannels(!showChannels)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <i className={`fas ${activeChannelInfo?.type === 'craft' ? 'fa-ship' : 'fa-hashtag'} text-steel text-xs`}></i>
            <span className="text-sm font-semibold text-gray-900">{activeChannelInfo?.name || 'General'}</span>
          </div>
          <i className={`fas fa-chevron-${showChannels ? 'up' : 'down'} text-steel text-[10px]`}></i>
        </button>

        {showChannels && (
          <div className="px-2 pb-2 space-y-0.5 max-h-40 overflow-y-auto">
            {channels.map(ch => {
              const unread = allMessages.filter(m => m.channelId === ch.id && !m.readBy.includes(userId)).length
              return (
                <button
                  key={ch.id}
                  onClick={() => { setActiveChannel(ch.id); setShowChannels(false) }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeChannel === ch.id ? 'bg-accent/10 text-accent font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <i className={`fas ${ch.type === 'craft' ? 'fa-ship' : 'fa-hashtag'} text-[10px]`}></i>
                  <span className="flex-1 text-left truncate">{ch.name}</span>
                  {unread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>
                  )}
                </button>
              )
            })}
            {/* Online users */}
            <div className="pt-2 mt-1 border-t border-border">
              <p className="text-[9px] text-steel font-semibold uppercase tracking-wider px-2.5 mb-1">Online ({collabUsers.length})</p>
              {collabUsers.slice(0, 8).map(u => (
                <div key={u.userId} className="flex items-center gap-2 px-2.5 py-1">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ backgroundColor: u.color }}>
                    {u.displayName.charAt(0)}
                  </div>
                  <span className="text-[11px] text-gray-700 truncate">{u.displayName}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {channelMessages.length === 0 && (
          <div className="text-center py-8">
            <i className="fas fa-comments text-gray-300 text-2xl mb-2"></i>
            <p className="text-xs text-steel">No messages in this channel yet</p>
          </div>
        )}
        {channelMessages.map((msg) => {
          const isMe = msg.senderId === userId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${isMe ? '' : ''}`}>
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-0.5 px-1">
                    <span className={`text-[10px] font-semibold ${getOrgColor(msg.senderOrg)}`}>{msg.senderName}</span>
                    <span className="text-[9px] text-steel">·</span>
                    <span className="text-[9px] text-steel">{msg.senderOrg}</span>
                  </div>
                )}
                <div className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  isMe
                    ? 'bg-accent text-white rounded-br-sm'
                    : msg.priority === 'critical'
                      ? 'bg-red-50 border border-red-200 text-gray-800 rounded-bl-sm'
                      : msg.priority === 'urgent'
                        ? 'bg-amber-50 border border-amber-200 text-gray-800 rounded-bl-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.priority === 'critical' && !isMe && (
                    <div className="flex items-center gap-1 mb-1">
                      <i className="fas fa-exclamation-circle text-red-500 text-[10px]"></i>
                      <span className="text-[10px] font-bold text-red-600 uppercase">Critical</span>
                    </div>
                  )}
                  {msg.priority === 'urgent' && !isMe && (
                    <div className="flex items-center gap-1 mb-1">
                      <i className="fas fa-bolt text-amber-500 text-[10px]"></i>
                      <span className="text-[10px] font-bold text-amber-600 uppercase">Urgent</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
                <div className={`text-[9px] text-steel mt-0.5 ${isMe ? 'text-right' : ''} px-1`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center text-steel hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Priority message">
            <i className="fas fa-exclamation-circle text-xs"></i>
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={`Message #${activeChannelInfo?.name || 'General'}...`}
            className="flex-1 text-sm bg-gray-50 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-9 h-9 flex items-center justify-center bg-accent hover:bg-accent/90 disabled:bg-accent/40 text-white rounded-lg transition-colors"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Agents Tab ────────────────────────────────────────── */

function AgentsTab({ data, anchors, aiInsights, role, displayName }: {
  data: DRLRow[]; anchors: Record<string, AnchorRecord>; aiInsights: Record<string, AIRowInsight>
  role: UserRole; displayName: string
}) {
  const [agents, setAgents] = useState<AIAgent[]>(() => DEFAULT_AGENTS)
  const [activeAgent, setActiveAgent] = useState<AIAgent | null>(null)
  const [agentMessages, setAgentMessages] = useState<Record<string, AIChatMessage[]>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newAgent, setNewAgent] = useState({ name: '', description: '', focusArea: '', instructions: '' })
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [agentMessages, activeAgent])

  const currentMessages = activeAgent ? (agentMessages[activeAgent.id] || []) : []

  const handleSendToAgent = useCallback(async () => {
    if (!activeAgent || !input.trim() || loading) return
    const text = input.trim()
    setInput('')

    const agentId = activeAgent.id
    setAgentMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), { role: 'user', text }],
    }))
    setLoading(true)

    try {
      const green = data.filter(r => r.status === 'green').length
      const yellow = data.filter(r => r.status === 'yellow').length
      const red = data.filter(r => r.status === 'red').length
      const sealed = Object.keys(anchors).length

      const contextMsg = `${activeAgent.instructions}\n\nCurrent data: ${data.length} deliverables (${green} green, ${yellow} yellow, ${red} red), ${sealed} sealed. User: ${displayName} (${role}).\n\nUser: ${text}`

      const result = await chatWithAI({
        message: contextMsg,
        conversation: agentMessages[agentId] || [],
        tool_context: 'ai_agent',
        analysis_data: {
          agentName: activeAgent.name,
          focusArea: activeAgent.focusArea,
          totalRows: data.length,
          statusBreakdown: { green, yellow, red },
          sealedCount: sealed,
        },
      })

      const response = result.fallback
        ? generateAgentFallback(activeAgent, text, data, aiInsights)
        : result.response

      setAgentMessages(prev => ({
        ...prev,
        [agentId]: [...(prev[agentId] || []), { role: 'ai', text: response }],
      }))
    } catch {
      setAgentMessages(prev => ({
        ...prev,
        [agentId]: [...(prev[agentId] || []), { role: 'ai', text: 'I encountered an error. Please try again.' }],
      }))
    } finally {
      setLoading(false)
    }
  }, [activeAgent, input, loading, data, anchors, aiInsights, role, displayName, agentMessages])

  const handleCreateAgent = useCallback(() => {
    if (!newAgent.name.trim() || !newAgent.instructions.trim()) return
    const agent: AIAgent = {
      id: `custom-${Date.now()}`,
      name: newAgent.name,
      description: newAgent.description || newAgent.name,
      icon: 'fa-robot',
      focusArea: newAgent.focusArea || 'General',
      instructions: newAgent.instructions,
      createdBy: displayName,
      createdAt: new Date().toISOString(),
    }
    setAgents(prev => [...prev, agent])
    setNewAgent({ name: '', description: '', focusArea: '', instructions: '' })
    setShowCreate(false)
    setActiveAgent(agent)
  }, [newAgent, displayName])

  // Agent gallery view
  if (!activeAgent) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">AI Agents</p>
              <p className="text-[10px] text-steel">Specialized assistants for specific tasks</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
            >
              <i className="fas fa-plus text-[9px]"></i>
              Create Agent
            </button>
          </div>

          {/* Create agent form */}
          {showCreate && (
            <div className="bg-gray-50 border border-border rounded-lg p-3 space-y-2">
              <input
                value={newAgent.name}
                onChange={e => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Agent name"
                className="w-full text-xs bg-white border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                value={newAgent.description}
                onChange={e => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Short description"
                className="w-full text-xs bg-white border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                value={newAgent.focusArea}
                onChange={e => setNewAgent(prev => ({ ...prev, focusArea: e.target.value }))}
                placeholder="Focus area (e.g., QA Review, Hull 3 Tracking)"
                className="w-full text-xs bg-white border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <textarea
                value={newAgent.instructions}
                onChange={e => setNewAgent(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Instructions — tell the agent what it should do, how it should behave, what to focus on..."
                rows={4}
                className="w-full text-xs bg-white border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              />
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setShowCreate(false)} className="text-[11px] text-steel hover:text-gray-900 px-2 py-1">Cancel</button>
                <button
                  onClick={handleCreateAgent}
                  disabled={!newAgent.name.trim() || !newAgent.instructions.trim()}
                  className="text-[11px] font-medium bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50 hover:bg-accent/90 transition-colors"
                >
                  Create Agent
                </button>
              </div>
            </div>
          )}

          {/* Agent cards */}
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => {
                setActiveAgent(agent)
                if (!agentMessages[agent.id]) {
                  setAgentMessages(prev => ({
                    ...prev,
                    [agent.id]: [{ role: 'ai', text: `I'm ${agent.name}. ${agent.description}\n\nHow can I help you today?` }],
                  }))
                }
              }}
              className="w-full text-left bg-white border border-border rounded-lg p-3 hover:border-accent/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                  <i className={`fas ${agent.icon} text-accent text-sm`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                  <p className="text-[11px] text-steel mt-0.5 line-clamp-2">{agent.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] text-accent bg-accent/10 px-1.5 py-0.5 rounded-md font-medium">{agent.focusArea}</span>
                    {agent.createdBy !== 'system' && (
                      <span className="text-[9px] text-steel">by {agent.createdBy}</span>
                    )}
                  </div>
                </div>
                <i className="fas fa-chevron-right text-gray-300 text-xs mt-3 group-hover:text-accent transition-colors"></i>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Active agent chat view
  return (
    <div className="flex flex-col h-full">
      {/* Agent header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-gray-50/50">
        <button onClick={() => setActiveAgent(null)} className="text-steel hover:text-gray-900 transition-colors">
          <i className="fas fa-arrow-left text-xs"></i>
        </button>
        <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center">
          <i className={`fas ${activeAgent.icon} text-accent text-[10px]`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{activeAgent.name}</p>
          <p className="text-[9px] text-steel truncate">{activeAgent.focusArea}</p>
        </div>
      </div>

      {/* Agent messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {currentMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}>
              {msg.role !== 'user' && (
                <div className="flex items-center gap-1.5 mb-1">
                  <i className={`fas ${activeAgent.icon} text-accent text-[10px]`}></i>
                  <span className="text-[10px] font-semibold text-accent">{activeAgent.name}</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-3.5 py-2.5 rounded-bl-sm">
              <div className="flex gap-1 mt-0.5">
                <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Agent input */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendToAgent() } }}
            placeholder={`Ask ${activeAgent.name}...`}
            className="flex-1 text-sm bg-gray-50 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            disabled={loading}
          />
          <button
            onClick={handleSendToAgent}
            disabled={loading || !input.trim()}
            className="w-9 h-9 flex items-center justify-center bg-accent hover:bg-accent/90 disabled:bg-accent/40 text-white rounded-lg transition-colors"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main ChatPanel Component ──────────────────────────── */

export default function ChatPanel({
  data, anchors, aiInsights, role, org, userId, displayName, collabUsers, onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<ChatTab>('ai')

  const tabs: { id: ChatTab; label: string; icon: string }[] = [
    { id: 'ai', label: 'AI', icon: 'fa-robot' },
    { id: 'team', label: 'Team', icon: 'fa-comments' },
    { id: 'agents', label: 'Agents', icon: 'fa-user-cog' },
  ]

  return (
    <div className="w-[380px] h-full border-l border-border bg-white flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gray-50/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
            <i className="fas fa-comments text-accent text-xs"></i>
          </div>
          <span className="text-sm font-bold text-gray-900">S4 Chat</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center text-steel hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
        >
          <i className="fas fa-times text-xs"></i>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-steel hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <i className={`fas ${tab.icon} text-[10px]`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'ai' && (
          <AIChatTab
            data={data}
            anchors={anchors}
            aiInsights={aiInsights}
            role={role}
            userId={userId}
            displayName={displayName}
          />
        )}
        {activeTab === 'team' && (
          <TeamChatTab
            userId={userId}
            displayName={displayName}
            role={role}
            org={org}
            collabUsers={collabUsers}
          />
        )}
        {activeTab === 'agents' && (
          <AgentsTab
            data={data}
            anchors={anchors}
            aiInsights={aiInsights}
            role={role}
            displayName={displayName}
          />
        )}
      </div>
    </div>
  )
}

/* ─── Fallback response generators ─────────────────────── */

function generateLocalResponse(
  query: string,
  data: DRLRow[],
  aiInsights: Record<string, AIRowInsight>,
  anchors: Record<string, AnchorRecord>,
): string {
  const q = query.toLowerCase()
  const red = data.filter(r => r.status === 'red')
  const yellow = data.filter(r => r.status === 'yellow')
  const green = data.filter(r => r.status === 'green')

  if (q.includes('overdue') || q.includes('late') || q.includes('delinquent')) {
    if (red.length === 0) return 'All deliverables are currently on track — no overdue items detected.'
    return `There are ${red.length} overdue deliverable${red.length !== 1 ? 's' : ''}:\n\n${red.map(r =>
      `• **${r.id}** — ${r.title} (Due: ${r.contractDueFinish})`
    ).join('\n')}\n\nRecommend escalating any items overdue by more than 30 days to the Contracting Officer for cure notice consideration per FAR 52.249-8.`
  }

  if (q.includes('status') || q.includes('summary') || q.includes('overview')) {
    return `**DRL Status Summary (PMS 300)**\n\n✅ Green: ${green.length} deliverables on track\n⚠️ Yellow: ${yellow.length} deliverables with compliance issues\n🔴 Red: ${red.length} deliverables overdue\n🔒 Sealed: ${Object.keys(anchors).length} records anchored to trust layer\n\nOverall compliance rate: ${((green.length / data.length) * 100).toFixed(0)}%`
  }

  if (q.includes('attention') || q.includes('priority') || q.includes('urgent') || q.includes('immediate')) {
    const critical = data.filter(r => {
      const insight = aiInsights[r.id]
      return insight?.priority === 'High' || r.status === 'red'
    })
    if (critical.length === 0) return 'No items require immediate attention. All deliverables are tracking within acceptable parameters.'
    return `${critical.length} item${critical.length !== 1 ? 's' : ''} need immediate attention:\n\n${critical.slice(0, 5).map(r => {
      const insight = aiInsights[r.id]
      return `• **${r.id}** — ${r.title}\n  ${insight?.statusExplanation || `Status: ${r.status}`}`
    }).join('\n\n')}`
  }

  if (q.includes('change') || q.includes('recent') || q.includes('update') || q.includes('week')) {
    return `**Recent Activity Summary**\n\n• ${data.length} total deliverables tracked\n• ${Object.keys(anchors).length} records sealed to trust layer\n• ${red.length} items flagged for attention\n• ${yellow.length} items under review\n\nAll edits are logged in the Audit Trail with change-level granularity. Open Tools → Audit Trail for full history.`
  }

  if (q.includes('draft') || q.includes('email') || q.includes('leadership') || q.includes('brief')) {
    return `**Status Briefing — PMS 300 DRL Tracker**\n\nSir/Ma'am,\n\nDRL compliance stands at ${((green.length / data.length) * 100).toFixed(0)}% (${green.length}/${data.length} deliverables green).\n\n${red.length > 0 ? `${red.length} item${red.length !== 1 ? 's are' : ' is'} overdue and require${red.length === 1 ? 's' : ''} attention:\n${red.slice(0, 3).map(r => `  - ${r.id}: ${r.title}`).join('\n')}\n\n` : 'All deliverables are on track. No overdue items.\n\n'}${yellow.length > 0 ? `${yellow.length} item${yellow.length !== 1 ? 's' : ''} under review.\n\n` : ''}V/R,\n${data.length > 0 ? 'DRL Program Office' : ''}`
  }

  return `I can help with that. Currently tracking ${data.length} deliverables for PMS 300 (Boats & Craft):\n\n• ${green.length} green (compliant)\n• ${yellow.length} yellow (review needed)\n• ${red.length} red (overdue)\n\nTry asking about:\n• "Show me all overdue deliverables"\n• "Draft a status update for leadership"\n• "Which items need immediate attention?"\n• "What changed since last week?"`
}

function generateAgentFallback(agent: AIAgent, query: string, data: DRLRow[], aiInsights: Record<string, AIRowInsight>): string {
  const q = query.toLowerCase()
  const red = data.filter(r => r.status === 'red')
  const yellow = data.filter(r => r.status === 'yellow')

  if (agent.id === 'compliance-monitor') {
    if (q.includes('check') || q.includes('scan') || q.includes('status') || q.includes('issue')) {
      const issues: string[] = []
      if (red.length > 0) issues.push(`🔴 ${red.length} overdue deliverable${red.length !== 1 ? 's' : ''} — immediate action required`)
      if (yellow.length > 0) issues.push(`⚠️ ${yellow.length} item${yellow.length !== 1 ? 's' : ''} with compliance findings`)
      const unsealed = data.filter(r => !Object.keys(aiInsights).includes(r.id))
      if (unsealed.length > 0) issues.push(`🔓 ${unsealed.length} record${unsealed.length !== 1 ? 's' : ''} pending seal verification`)
      return issues.length > 0
        ? `**Compliance Scan Results:**\n\n${issues.join('\n')}\n\nRecommend reviewing overdue items first. Items >30 days overdue may warrant cure notice per FAR 52.249-8.`
        : 'All compliance checks passed. No issues detected at this time.'
    }
  }

  if (agent.id === 'status-briefer') {
    return `**Executive Status Brief — PMS 300**\n\nBOTTOM LINE: ${red.length === 0 ? 'Program on track' : `${red.length} item${red.length !== 1 ? 's' : ''} require attention`}\n\nGreen: ${data.filter(r => r.status === 'green').length} | Yellow: ${yellow.length} | Red: ${red.length}\n\n${red.length > 0 ? `TOP RISKS:\n${red.slice(0, 3).map(r => `  - ${r.id}: ${r.title}`).join('\n')}\n\n` : ''}RECOMMENDATION: ${red.length > 0 ? 'Schedule tiger team review for overdue items within 48 hours.' : 'Continue current trajectory. Next review per regular schedule.'}`
  }

  if (agent.id === 'contract-advisor') {
    if (q.includes('cure') || q.includes('notice') || q.includes('far')) {
      return `Per FAR 52.249-8 (Default for Fixed-Price Supply):\n\n1. Issue Cure Notice when deliverable exceeds contractual due date\n2. Contractor has 10 calendar days to cure after receipt\n3. If no cure, Contracting Officer may terminate for default\n4. Document all communications in contract file\n\nCurrently ${red.length} item${red.length !== 1 ? 's' : ''} may be eligible for cure notice consideration.`
    }
  }

  return `Based on my analysis as ${agent.name}:\n\n${data.filter(r => r.status === 'red').length > 0 ? `There are ${red.length} items needing attention in my focus area (${agent.focusArea}).` : 'Everything in my focus area looks good.'}\n\nWhat specific aspect would you like me to look into?`
}
