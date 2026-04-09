/**
 * ChatPanel — Unified chat panel with two tabs: AI (with integrated agents + model picker) and Team
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
  parseMentions,
  loadChatHistory,
  DEFAULT_CHANNELS,
  DEFAULT_AGENTS,
  TEAM_ROSTER,
  createDMChannel,
  type ChatMessage,
  type ChatChannel,
  type AIAgent,
  type TeamMember,
} from '../services/chatService'

/* ─── Types ─────────────────────────────────────────────── */

type ChatTab = 'ai' | 'team'

interface SavedConversation {
  id: string
  title: string
  messages: AIChatMessage[]
  pinned: boolean
  agentId?: string
  agentName?: string
  createdAt: string
  updatedAt: string
  tokenCount: number
}

/** Estimate token count from text (rough: ~4 chars per token) */
function estimateTokens(messages: AIChatMessage[]): number {
  return Math.ceil(messages.reduce((sum, m) => sum + m.text.length, 0) / 4)
}

/** Available AI models */
const AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI', tier: 'Standard', inputPer1k: 0.00015, outputPer1k: 0.0006, description: 'Fast answers & status checks' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', tier: 'Advanced', inputPer1k: 0.0025, outputPer1k: 0.01, description: 'Complex analysis & drafting' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', tier: 'Advanced', inputPer1k: 0.003, outputPer1k: 0.015, description: 'Nuanced analysis & reasoning' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', tier: 'Premium', inputPer1k: 0.015, outputPer1k: 0.075, description: 'Highest capability' },
  { id: 'o1-pro', name: 'o1-pro', provider: 'OpenAI', tier: 'Reasoning', inputPer1k: 0.15, outputPer1k: 0.60, description: 'Multi-step reasoning & risk' },
] as const

const STORAGE_KEY = 's4-chat-saved-conversations'

function loadSavedConversations(): SavedConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function persistConversations(convos: SavedConversation[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convos)) } catch { /* quota */ }
}

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

/* ─── AI Chat Tab (with integrated agents + model picker) ── */

function AIChatTab({ data, anchors, aiInsights, role, displayName }: {
  data: DRLRow[]; anchors: Record<string, AnchorRecord>; aiInsights: Record<string, AIRowInsight>
  role: UserRole; displayName: string
}) {
  // --- Model selection ---
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini')
  const [showModelPicker, setShowModelPicker] = useState(false)

  // --- Agent selection ---
  const [agents, setAgents] = useState<AIAgent[]>(() => DEFAULT_AGENTS)
  const [activeAgent, setActiveAgent] = useState<AIAgent | null>(null)
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [newAgent, setNewAgent] = useState({ name: '', description: '', focusArea: '', instructions: '' })

  // --- Messages ---
  const makeGreeting = useCallback(() =>
    `Hello, ${displayName}. I'm your S4 Ledger AI Assistant. I have full context on all ${data.length} DRL deliverables, seal records, and compliance status.\n\nAsk me about deadlines, risk, status summaries, drafting communications, or anything else.`
  , [displayName, data.length])

  const [generalMessages, setGeneralMessages] = useState<AIChatMessage[]>(() => [
    { role: 'ai', text: `Hello, ${displayName}. I'm your S4 Ledger AI Assistant. I have full context on all ${data.length} DRL deliverables, seal records, and compliance status.\n\nAsk me about deadlines, risk, status summaries, drafting communications, or anything else.` },
  ])
  const [agentMessages, setAgentMessages] = useState<Record<string, AIChatMessage[]>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // --- Save / Pin ---
  const [savedConvos, setSavedConvos] = useState<SavedConversation[]>(() => loadSavedConversations())
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null)
  const [showSaved, setShowSaved] = useState(false)
  const [showTokens, setShowTokens] = useState(false)
  const [saveToast, setSaveToast] = useState<string | null>(null)

  // Current conversation messages (general AI or agent)
  const makeAgentGreeting = useCallback((agent: AIAgent) =>
    `I'm ${agent.name}. ${agent.description}\n\nHow can I help you today?`
  , [])

  const currentMessages = useMemo(() => {
    if (!activeAgent) return generalMessages
    return agentMessages[activeAgent.id] || [{ role: 'ai' as const, text: makeAgentGreeting(activeAgent) }]
  }, [activeAgent, generalMessages, agentMessages, makeAgentGreeting])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [currentMessages])

  const tokenCount = useMemo(() => estimateTokens(currentMessages), [currentMessages])
  const selectedModelInfo = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0]

  const buildContext = useCallback(() => {
    const green = data.filter(r => r.status === 'green').length
    const yellow = data.filter(r => r.status === 'yellow').length
    const red = data.filter(r => r.status === 'red').length
    const sealed = Object.keys(anchors).length
    return `S4 Ledger DRL Tracker for PMS 300 (U.S. Navy Boats & Craft). ` +
      `${data.length} deliverables: ${green} green, ${yellow} yellow, ${red} red. ` +
      `${sealed} records sealed to trust layer. User: ${displayName} (${role}). ` +
      `AI Model: ${selectedModelInfo.name} (${selectedModelInfo.provider}).`
  }, [data, anchors, displayName, role, selectedModelInfo])

  // --- Unified send handler ---
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)

    const green = data.filter(r => r.status === 'green').length
    const yellow = data.filter(r => r.status === 'yellow').length
    const red = data.filter(r => r.status === 'red').length
    const sealed = Object.keys(anchors).length

    if (activeAgent) {
      const agentId = activeAgent.id
      const prev = agentMessages[agentId] || [{ role: 'ai' as const, text: makeAgentGreeting(activeAgent) }]
      const withUser = [...prev, { role: 'user' as const, text }]
      setAgentMessages(p => ({ ...p, [agentId]: withUser }))

      try {
        const contextMsg = `${activeAgent.instructions}\n\nModel: ${selectedModelInfo.name}. Current data: ${data.length} deliverables (${green} green, ${yellow} yellow, ${red} red), ${sealed} sealed. User: ${displayName} (${role}).\n\nUser: ${text}`

        const result = await chatWithAI({
          message: contextMsg,
          conversation: prev,
          tool_context: 'ai_agent',
          analysis_data: { agentName: activeAgent.name, focusArea: activeAgent.focusArea, totalRows: data.length, statusBreakdown: { green, yellow, red }, sealedCount: sealed },
        })

        const response = result.fallback ? generateAgentFallback(activeAgent, text, data, aiInsights) : result.response
        setAgentMessages(p => ({ ...p, [agentId]: [...withUser, { role: 'ai' as const, text: response }] }))
      } catch {
        setAgentMessages(p => ({ ...p, [agentId]: [...withUser, { role: 'ai' as const, text: 'I encountered an error. Please try again.' }] }))
      }
    } else {
      setGeneralMessages(prev => [...prev, { role: 'user', text }])
      try {
        const result = await chatWithAI({
          message: text,
          conversation: generalMessages,
          tool_context: 'drl_tracker',
          analysis_data: {
            context: buildContext(),
            totalRows: data.length,
            statusBreakdown: { green, yellow, red },
            sealedCount: sealed,
            role,
          },
        })

        if (!result.fallback && result.response) {
          setGeneralMessages(prev => [...prev, { role: 'ai', text: result.response }])
        } else {
          const fallback = generateLocalResponse(text, data, aiInsights, anchors)
          setGeneralMessages(prev => [...prev, { role: 'ai', text: fallback }])
        }
      } catch {
        setGeneralMessages(prev => [...prev, { role: 'ai', text: 'I encountered an error processing your request. Please try again.' }])
      }
    }

    setLoading(false)
  }, [input, loading, activeAgent, agentMessages, generalMessages, data, anchors, aiInsights, role, displayName, buildContext, selectedModelInfo, makeAgentGreeting])

  // --- Save toast ---
  const showSaveMsg = useCallback((msg: string) => {
    setSaveToast(msg)
    setTimeout(() => setSaveToast(null), 2500)
  }, [])

  // --- Save ---
  const handleSave = useCallback(() => {
    if (currentMessages.length <= 1) return
    const firstUserMsg = currentMessages.find(m => m.role === 'user')?.text || 'Untitled'
    const titleBase = activeAgent ? `${activeAgent.name}: ${firstUserMsg}` : firstUserMsg
    const title = titleBase.length > 50 ? titleBase.slice(0, 50) + '...' : titleBase
    const now = new Date().toISOString()

    if (activeConvoId) {
      const all = loadSavedConversations()
      const updated = all.map(c => c.id === activeConvoId ? { ...c, messages: currentMessages, tokenCount: estimateTokens(currentMessages), updatedAt: now } : c)
      persistConversations(updated)
      setSavedConvos(updated)
      showSaveMsg('Conversation updated')
    } else {
      const convo: SavedConversation = {
        id: `conv-${Date.now()}`,
        title,
        messages: currentMessages,
        pinned: false,
        ...(activeAgent ? { agentId: activeAgent.id, agentName: activeAgent.name } : {}),
        createdAt: now,
        updatedAt: now,
        tokenCount: estimateTokens(currentMessages),
      }
      const all = loadSavedConversations()
      all.unshift(convo)
      persistConversations(all)
      setSavedConvos(all)
      setActiveConvoId(convo.id)
      showSaveMsg('Conversation saved')
    }
  }, [currentMessages, activeConvoId, activeAgent, showSaveMsg])

  // --- Pin ---
  const handlePin = useCallback((convoId: string) => {
    const all = loadSavedConversations()
    const wasPinned = all.find(c => c.id === convoId)?.pinned
    const updated = all.map(c => c.id === convoId ? { ...c, pinned: !c.pinned } : c)
    persistConversations(updated)
    setSavedConvos(updated)
    showSaveMsg(wasPinned ? 'Unpinned' : 'Pinned')
  }, [showSaveMsg])

  // --- Load ---
  const handleLoad = useCallback((convo: SavedConversation) => {
    if (convo.agentId) {
      const agent = agents.find(a => a.id === convo.agentId)
      if (agent) {
        setActiveAgent(agent)
        setAgentMessages(prev => ({ ...prev, [agent.id]: convo.messages }))
      }
    } else {
      setActiveAgent(null)
      setGeneralMessages(convo.messages)
    }
    setActiveConvoId(convo.id)
    setShowSaved(false)
  }, [agents])

  // --- Delete ---
  const handleDelete = useCallback((convoId: string) => {
    const all = loadSavedConversations().filter(c => c.id !== convoId)
    persistConversations(all)
    setSavedConvos(all)
    if (activeConvoId === convoId) setActiveConvoId(null)
  }, [activeConvoId])

  // --- New conversation ---
  const handleNew = useCallback(() => {
    if (activeAgent) {
      setAgentMessages(prev => ({
        ...prev,
        [activeAgent.id]: [{ role: 'ai', text: makeAgentGreeting(activeAgent) }],
      }))
    } else {
      setGeneralMessages([{ role: 'ai', text: makeGreeting() }])
    }
    setActiveConvoId(null)
    setShowSaved(false)
  }, [activeAgent, makeGreeting, makeAgentGreeting])

  // --- Create agent ---
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
    setShowCreateAgent(false)
    setActiveAgent(agent)
    setAgentMessages(prev => ({
      ...prev,
      [agent.id]: [{ role: 'ai', text: makeAgentGreeting(agent) }],
    }))
    showSaveMsg(`Agent "${agent.name}" created`)
  }, [newAgent, displayName, showSaveMsg, makeAgentGreeting])

  // --- Switch to agent ---
  const handleSelectAgent = useCallback((agent: AIAgent) => {
    setActiveAgent(agent)
    if (!agentMessages[agent.id]) {
      setAgentMessages(prev => ({
        ...prev,
        [agent.id]: [{ role: 'ai', text: makeAgentGreeting(agent) }],
      }))
    }
    setActiveConvoId(null)
    setShowAgentPicker(false)
  }, [agentMessages, makeAgentGreeting])

  // --- Switch to general AI ---
  const handleSwitchToGeneral = useCallback(() => {
    setActiveAgent(null)
    setActiveConvoId(null)
    setShowAgentPicker(false)
  }, [])

  const suggestions = [
    'Show me all overdue deliverables',
    'What changed since last week?',
    'Draft a status update for leadership',
    'Which items need immediate attention?',
  ]

  // ═══════════════ Saved Conversations View ═══════════════
  if (showSaved) {
    const pinned = savedConvos.filter(c => c.pinned)
    const unpinned = savedConvos.filter(c => !c.pinned)
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gray-50/50">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSaved(false)} className="text-steel hover:text-gray-900 transition-colors">
              <i className="fas fa-arrow-left text-xs"></i>
            </button>
            <span className="text-xs font-semibold text-gray-900">Saved Conversations</span>
          </div>
          <button onClick={handleNew} className="text-[10px] text-accent font-medium hover:underline">+ New Chat</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {savedConvos.length === 0 && (
            <div className="text-center py-8">
              <i className="fas fa-bookmark text-gray-300 text-2xl mb-2"></i>
              <p className="text-xs text-steel">No saved conversations yet</p>
              <p className="text-[10px] text-steel mt-1">Save a conversation using the bookmark icon</p>
            </div>
          )}
          {pinned.length > 0 && (
            <>
              <p className="text-[9px] text-steel font-semibold uppercase tracking-wider px-1 pt-1">Pinned</p>
              {pinned.map(c => (
                <div key={c.id} className={`flex items-start gap-2 p-2.5 rounded-lg border transition-all cursor-pointer group ${activeConvoId === c.id ? 'border-accent/30 bg-accent/5' : 'border-border hover:border-accent/20 hover:bg-gray-50'}`}>
                  <button onClick={() => handlePin(c.id)} className="text-amber-500 mt-0.5 flex-shrink-0"><i className="fas fa-thumbtack text-[10px]"></i></button>
                  <div className="flex-1 min-w-0" onClick={() => handleLoad(c)}>
                    <p className="text-xs font-medium text-gray-900 truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.agentName && <span className="text-[9px] text-purple-600 bg-purple-50 px-1 rounded">{c.agentName}</span>}
                      <span className="text-[9px] text-steel">{new Date(c.updatedAt).toLocaleDateString()}</span>
                      <span className="text-[9px] text-accent bg-accent/10 px-1 rounded">{c.tokenCount.toLocaleString()} tokens</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(c.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all mt-0.5"><i className="fas fa-trash-alt text-[9px]"></i></button>
                </div>
              ))}
            </>
          )}
          {unpinned.length > 0 && (
            <>
              {pinned.length > 0 && <p className="text-[9px] text-steel font-semibold uppercase tracking-wider px-1 pt-2">Recent</p>}
              {unpinned.map(c => (
                <div key={c.id} className={`flex items-start gap-2 p-2.5 rounded-lg border transition-all cursor-pointer group ${activeConvoId === c.id ? 'border-accent/30 bg-accent/5' : 'border-border hover:border-accent/20 hover:bg-gray-50'}`}>
                  <button onClick={() => handlePin(c.id)} className="text-gray-300 hover:text-amber-500 mt-0.5 flex-shrink-0"><i className="fas fa-thumbtack text-[10px]"></i></button>
                  <div className="flex-1 min-w-0" onClick={() => handleLoad(c)}>
                    <p className="text-xs font-medium text-gray-900 truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.agentName && <span className="text-[9px] text-purple-600 bg-purple-50 px-1 rounded">{c.agentName}</span>}
                      <span className="text-[9px] text-steel">{new Date(c.updatedAt).toLocaleDateString()}</span>
                      <span className="text-[9px] text-accent bg-accent/10 px-1 rounded">{c.tokenCount.toLocaleString()} tokens</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(c.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all mt-0.5"><i className="fas fa-trash-alt text-[9px]"></i></button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════ Token Usage & Pricing View ═══════════════
  if (showTokens) {
    const totalSaved = savedConvos.reduce((sum, c) => sum + c.tokenCount, 0)
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-gray-50/50">
          <button onClick={() => setShowTokens(false)} className="text-steel hover:text-gray-900 transition-colors">
            <i className="fas fa-arrow-left text-xs"></i>
          </button>
          <span className="text-xs font-semibold text-gray-900">Token Usage & Pricing</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="bg-accent/5 border border-accent/15 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-1">Current Session</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900">{tokenCount.toLocaleString()}</span>
              <span className="text-[10px] text-steel">tokens</span>
            </div>
            <p className="text-[10px] text-steel mt-0.5">{currentMessages.length} messages · {selectedModelInfo.name}</p>
          </div>
          <div className="bg-gray-50 border border-border rounded-lg p-3">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Total Saved</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900">{(totalSaved + tokenCount).toLocaleString()}</span>
              <span className="text-[10px] text-steel">tokens across {savedConvos.length + 1} conversations</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Available Models</p>
            <div className="space-y-2">
              {AI_MODELS.map(model => (
                <div key={model.id} className={`bg-white border rounded-lg p-3 ${selectedModel === model.id ? 'border-accent/40 ring-1 ring-accent/20' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-900">{model.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-steel bg-gray-100 px-1.5 py-0.5 rounded">{model.provider}</span>
                      <span className="text-[9px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">{model.tier}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-steel mb-2">{model.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-md px-2 py-1.5">
                      <p className="text-[9px] text-steel">Input</p>
                      <p className="text-[11px] font-semibold text-gray-900">${model.inputPer1k}/1K tokens</p>
                    </div>
                    <div className="bg-gray-50 rounded-md px-2 py-1.5">
                      <p className="text-[9px] text-steel">Output</p>
                      <p className="text-[11px] font-semibold text-gray-900">${model.outputPer1k}/1K tokens</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-[9px] text-steel">Est. session cost</span>
                    <span className="text-[11px] font-semibold text-gray-900">
                      ${((tokenCount / 1000) * (model.inputPer1k + model.outputPer1k) / 2).toFixed(4)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════ Agent Picker View ═══════════════
  if (showAgentPicker) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gray-50/50">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAgentPicker(false)} className="text-steel hover:text-gray-900 transition-colors">
              <i className="fas fa-arrow-left text-xs"></i>
            </button>
            <span className="text-xs font-semibold text-gray-900">Choose AI Mode</span>
          </div>
          <button
            onClick={() => setShowCreateAgent(true)}
            className="flex items-center gap-1 text-[10px] text-accent font-medium hover:underline"
          >
            <i className="fas fa-plus text-[8px]"></i>
            Create Agent
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* General AI option */}
          <button
            onClick={handleSwitchToGeneral}
            className={`w-full text-left border rounded-lg p-3 transition-all group ${
              !activeAgent ? 'border-accent/30 bg-accent/5' : 'border-border hover:border-accent/20 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-robot text-accent text-sm"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">General AI Assistant</p>
                <p className="text-[11px] text-steel mt-0.5">Full-context DRL tracker assistant — deadlines, risk, status, drafting</p>
              </div>
              {!activeAgent && <i className="fas fa-check text-accent text-xs mt-3"></i>}
            </div>
          </button>

          <p className="text-[9px] text-steel font-semibold uppercase tracking-wider px-1 pt-2">Specialized Agents</p>

          {/* Agent cards */}
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => handleSelectAgent(agent)}
              className={`w-full text-left border rounded-lg p-3 transition-all group ${
                activeAgent?.id === agent.id ? 'border-accent/30 bg-accent/5' : 'border-border hover:border-accent/20 hover:bg-gray-50'
              }`}
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
                {activeAgent?.id === agent.id && <i className="fas fa-check text-accent text-xs mt-3"></i>}
              </div>
            </button>
          ))}

          {/* Create agent form */}
          {showCreateAgent && (
            <div className="bg-gray-50 border border-border rounded-lg p-3 space-y-2 mt-2">
              <p className="text-xs font-semibold text-gray-900 mb-1">Create Custom Agent</p>
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
                <button onClick={() => setShowCreateAgent(false)} className="text-[11px] text-steel hover:text-gray-900 px-2 py-1">Cancel</button>
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
        </div>
      </div>
    )
  }

  // ═══════════════ Default Chat View ═══════════════
  const chatLabel = activeAgent ? activeAgent.name : 'S4 AI'
  const chatIcon = activeAgent?.icon || 'fa-robot'

  return (
    <div className="flex flex-col h-full relative">
      {/* Save toast notification */}
      {saveToast && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg animate-fade-in flex items-center gap-1.5" role="status" aria-live="polite">
          <i className="fas fa-check-circle text-green-400 text-[10px]"></i>
          {saveToast}
        </div>
      )}

      {/* Toolbar Row 1 — Model + Agent selector */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-gray-50/30">
        {/* Model dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-steel hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors border border-transparent hover:border-border"
          >
            <i className="fas fa-microchip text-[9px]"></i>
            <span className="font-medium">{selectedModelInfo.name}</span>
            <i className={`fas fa-chevron-${showModelPicker ? 'up' : 'down'} text-[7px] ml-0.5`}></i>
          </button>
          {showModelPicker && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
              {AI_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedModel(m.id); setShowModelPicker(false) }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${selectedModel === m.id ? 'bg-accent/5' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-900">{m.name}</span>
                    <span className="text-[9px] text-steel bg-gray-100 px-1.5 py-0.5 rounded">{m.tier}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-steel">{m.provider}</span>
                    <span className="text-[9px] text-steel">·</span>
                    <span className="text-[9px] text-steel">{m.description}</span>
                  </div>
                  {selectedModel === m.id && <i className="fas fa-check text-accent text-[9px] absolute right-3"></i>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-border"></div>

        {/* Agent/Mode selector */}
        <button
          onClick={() => setShowAgentPicker(true)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] hover:bg-gray-100 rounded-md transition-colors border border-transparent hover:border-border group"
        >
          <i className={`fas ${chatIcon} text-[9px] ${activeAgent ? 'text-purple-500' : 'text-accent'}`}></i>
          <span className={`font-medium ${activeAgent ? 'text-purple-700' : 'text-steel'}`}>{activeAgent ? activeAgent.name : 'General AI'}</span>
          {activeAgent && (
            <span
              onClick={e => { e.stopPropagation(); handleSwitchToGeneral() }}
              className="text-[8px] text-gray-400 hover:text-red-500 ml-0.5 transition-colors"
              title="Switch to General AI"
            >
              <i className="fas fa-times"></i>
            </span>
          )}
          <i className="fas fa-chevron-down text-[7px] ml-0.5 text-steel"></i>
        </button>

        <div className="flex-1"></div>

        {/* Token count */}
        <button onClick={() => setShowTokens(true)} className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] text-steel hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors" title="Token usage & pricing">
          <i className="fas fa-coins text-[9px]"></i>
          <span>{tokenCount.toLocaleString()}</span>
        </button>
      </div>

      {/* Toolbar Row 2 — Save / Pin / New / History */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border bg-white">
        <div className="flex items-center gap-0.5">
          <button onClick={handleNew} className="w-7 h-7 flex items-center justify-center text-steel hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors" title="New conversation">
            <i className="fas fa-plus text-[10px]"></i>
          </button>
          <button onClick={handleSave} disabled={currentMessages.length <= 1} className="w-7 h-7 flex items-center justify-center text-steel hover:text-accent hover:bg-accent/5 disabled:opacity-30 rounded-md transition-colors" title={activeConvoId ? 'Update saved conversation' : 'Save conversation'}>
            <i className={`fas ${activeConvoId ? 'fa-save' : 'fa-bookmark'} text-[10px]`}></i>
          </button>
          {activeConvoId && (
            <button onClick={() => handlePin(activeConvoId)} className="w-7 h-7 flex items-center justify-center hover:bg-amber-50 rounded-md transition-colors" title="Pin conversation">
              <i className={`fas fa-thumbtack text-[10px] ${savedConvos.find(c => c.id === activeConvoId)?.pinned ? 'text-amber-500' : 'text-steel hover:text-amber-500'}`}></i>
            </button>
          )}
        </div>
        <button onClick={() => setShowSaved(true)} className="w-7 h-7 flex items-center justify-center text-steel hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors relative" title="Saved conversations">
          <i className="fas fa-history text-[10px]"></i>
          {savedConvos.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent text-white text-[7px] flex items-center justify-center font-bold">{savedConvos.length}</span>}
        </button>
      </div>

      {/* Messages */}
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
                  <i className={`fas ${chatIcon} ${activeAgent ? 'text-purple-500' : 'text-accent'} text-[10px]`}></i>
                  <span className={`text-[10px] font-semibold ${activeAgent ? 'text-purple-600' : 'text-accent'}`}>{chatLabel}</span>
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
                <i className={`fas ${chatIcon} ${activeAgent ? 'text-purple-500' : 'text-accent'} text-[10px]`}></i>
                <span className={`text-[10px] font-semibold ${activeAgent ? 'text-purple-600' : 'text-accent'}`}>{chatLabel}</span>
              </div>
              <div className="flex gap-1 mt-1.5">
                <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions — only on initial greeting */}
        {currentMessages.length <= 1 && !activeAgent && (
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
            placeholder={activeAgent ? `Ask ${activeAgent.name}...` : 'Ask about deliverables, risk, status...'}
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
  const [channels, setChannels] = useState<ChatChannel[]>(() => DEFAULT_CHANNELS)
  const [activeChannel, setActiveChannel] = useState('general')
  const [allMessages, setAllMessages] = useState<ChatMessage[]>(() => initChatMessages())
  const [input, setInput] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'critical'>('normal')
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionCursorStart, setMentionCursorStart] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showChannels, setShowChannels] = useState(true)
  const [showTeamRoster, setShowTeamRoster] = useState(false)

  // Build roster with online status from collabUsers
  const teamRoster: (TeamMember & { isOnline: boolean })[] = useMemo(() => {
    const onlineIds = new Set(collabUsers.map(u => u.userId))
    const onlineNames = new Set(collabUsers.map(u => u.displayName))
    return TEAM_ROSTER.map(m => ({
      ...m,
      isOnline: onlineIds.has(m.userId) || onlineNames.has(m.displayName),
    }))
  }, [collabUsers])

  // Mentionable users = roster + current online collab users not in roster
  const mentionableUsers = useMemo(() => {
    const rosterIds = new Set(TEAM_ROSTER.map(m => m.userId))
    const extra = collabUsers
      .filter(u => u.userId !== userId && !rosterIds.has(u.userId))
      .map(u => ({ userId: u.userId, displayName: u.displayName }))
    const base = TEAM_ROSTER.map(m => ({ userId: m.userId, displayName: m.displayName }))
    return [...base, ...extra]
  }, [collabUsers, userId])

  // Subscribe to real-time messages
  useEffect(() => {
    let unsub: (() => void) | null = null
    try {
      unsub = subscribeToChatMessages(userId, (msg) => {
        setAllMessages(prev => [...prev, msg])
      })
    } catch (e) {
      console.warn('Team chat subscription failed:', e)
    }
    return () => { unsub?.() }
  }, [userId])

  // Load persisted chat history from Supabase on mount
  useEffect(() => {
    const channelIds = channels.map(c => c.id)
    loadChatHistory(channelIds).then(history => {
      if (history.length > 0) {
        setAllMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const newMsgs = history.filter(m => !existingIds.has(m.id))
          if (newMsgs.length === 0) return prev
          return [...prev, ...newMsgs].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        })
      }
    }).catch(() => {})
  }, [channels])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [allMessages, activeChannel])

  const channelMessages = useMemo(
    () => allMessages.filter(m => m.channelId === activeChannel),
    [allMessages, activeChannel],
  )

  const activeChannelInfo = channels.find(c => c.id === activeChannel)
  const isDM = activeChannelInfo?.type === 'direct'

  // @ mention detection in input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    // Detect @ trigger
    const cursorPos = e.target.selectionStart || val.length
    const textBefore = val.slice(0, cursorPos)
    const atIdx = textBefore.lastIndexOf('@')
    if (atIdx >= 0 && (atIdx === 0 || textBefore[atIdx - 1] === ' ')) {
      const partial = textBefore.slice(atIdx + 1)
      if (!partial.includes(' ') || partial.length < 20) {
        setMentionFilter(partial.toLowerCase())
        setMentionCursorStart(atIdx)
        setShowMentions(true)
        return
      }
    }
    setShowMentions(false)
  }, [])

  const filteredMentions = useMemo(() => {
    if (!showMentions) return []
    return mentionableUsers.filter(u =>
      u.displayName.toLowerCase().includes(mentionFilter)
    ).slice(0, 6)
  }, [showMentions, mentionFilter, mentionableUsers])

  const insertMention = useCallback((user: { userId: string; displayName: string }) => {
    const before = input.slice(0, mentionCursorStart)
    const after = input.slice((inputRef.current?.selectionStart || input.length))
    setInput(`${before}@${user.displayName} ${after}`)
    setShowMentions(false)
    inputRef.current?.focus()
  }, [input, mentionCursorStart])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setPriority('normal')
    setShowMentions(false)

    const mentions = parseMentions(text, mentionableUsers)

    try {
      const msg = await sendChatMessage({
        channelId: activeChannel,
        senderId: userId,
        senderName: displayName,
        senderRole: role,
        senderOrg: org,
        text,
        priority,
        mentions,
      })

      setAllMessages(prev => [...prev, msg])
    } catch (e) {
      console.warn('Failed to send message:', e)
    }
  }, [input, activeChannel, userId, displayName, role, org, priority, mentionableUsers])

  // Open DM with a team member
  const openDM = useCallback((member: TeamMember) => {
    const dmChannel = createDMChannel(userId, displayName, member.userId, member.displayName)
    // Add channel if not already present
    setChannels(prev => {
      if (prev.find(c => c.id === dmChannel.id)) return prev
      return [...prev, dmChannel]
    })
    setActiveChannel(dmChannel.id)
    setShowTeamRoster(false)
    setShowChannels(false)
  }, [userId, displayName])

  const getOrgColor = (o: Organization | string) => o === 'Government' ? 'text-blue-600' : o === 'Contractor' ? 'text-amber-600' : 'text-emerald-600'

  const priorityConfig = {
    normal: { icon: 'fa-minus-circle', color: 'text-steel', label: 'Normal' },
    urgent: { icon: 'fa-bolt', color: 'text-amber-500', label: 'Urgent' },
    critical: { icon: 'fa-exclamation-circle', color: 'text-red-500', label: 'Critical' },
  }

  // ─── Team Roster View ───
  if (showTeamRoster) {
    const online = teamRoster.filter(m => m.isOnline)
    const offline = teamRoster.filter(m => !m.isOnline)
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-gray-50/50">
          <button onClick={() => setShowTeamRoster(false)} className="text-steel hover:text-gray-900 transition-colors">
            <i className="fas fa-arrow-left text-xs"></i>
          </button>
          <span className="text-xs font-semibold text-gray-900">Team Directory</span>
          <span className="text-[9px] text-steel ml-auto">{teamRoster.length} members</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {online.length > 0 && (
            <>
              <p className="text-[9px] text-steel font-semibold uppercase tracking-wider px-1 pt-1">Online ({online.length})</p>
              {online.map(m => (
                <button
                  key={m.userId}
                  onClick={() => openDM(m)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors group text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-[11px] font-bold text-accent">
                      {m.displayName.charAt(0)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{m.displayName}</p>
                    <p className="text-[10px] text-steel truncate">{m.role} &middot; {m.org}</p>
                  </div>
                  <i className="fas fa-comment text-accent text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </button>
              ))}
            </>
          )}
          {offline.length > 0 && (
            <>
              <p className="text-[9px] text-steel font-semibold uppercase tracking-wider px-1 pt-2">Offline ({offline.length})</p>
              {offline.map(m => (
                <button
                  key={m.userId}
                  onClick={() => openDM(m)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors group text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500">
                      {m.displayName.charAt(0)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-600 truncate">{m.displayName}</p>
                    <p className="text-[10px] text-steel truncate">{m.role} &middot; {m.org}</p>
                  </div>
                  <i className="fas fa-comment text-steel text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Channel selector / header */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setShowChannels(!showChannels)}
            className="flex items-center gap-2 hover:bg-gray-50 px-1 py-0.5 rounded transition-colors"
          >
            <i className={`fas ${isDM ? 'fa-user' : activeChannelInfo?.type === 'craft' ? 'fa-ship' : 'fa-hashtag'} text-steel text-xs`}></i>
            <span className="text-sm font-semibold text-gray-900">{activeChannelInfo?.name || 'General'}</span>
            <i className={`fas fa-chevron-${showChannels ? 'up' : 'down'} text-steel text-[10px]`}></i>
          </button>
          <button
            onClick={() => setShowTeamRoster(true)}
            className="w-7 h-7 flex items-center justify-center text-steel hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Team directory / Direct message"
          >
            <i className="fas fa-user-plus text-[10px]"></i>
          </button>
        </div>

        {showChannels && (
          <div className="px-2 pb-2 space-y-0.5 max-h-52 overflow-y-auto">
            <p className="text-[9px] text-steel font-semibold uppercase tracking-wider px-2.5 mb-0.5">Channels</p>
            {channels.filter(c => c.type !== 'direct').map(ch => {
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

            {/* DM channels */}
            {channels.filter(c => c.type === 'direct').length > 0 && (
              <>
                <p className="text-[9px] text-steel font-semibold uppercase tracking-wider px-2.5 mt-2 mb-0.5">Direct Messages</p>
                {channels.filter(c => c.type === 'direct').map(ch => {
                  const unread = allMessages.filter(m => m.channelId === ch.id && !m.readBy.includes(userId)).length
                  const isOnline = teamRoster.find(m => ch.participants?.includes(m.userId))?.isOnline
                  return (
                    <button
                      key={ch.id}
                      onClick={() => { setActiveChannel(ch.id); setShowChannels(false) }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        activeChannel === ch.id ? 'bg-accent/10 text-accent font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative">
                        <i className="fas fa-user text-[10px]"></i>
                        <div className={`absolute -bottom-0.5 -right-1 w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </div>
                      <span className="flex-1 text-left truncate">{ch.name}</span>
                      {unread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{unread}</span>
                      )}
                    </button>
                  )
                })}
              </>
            )}

            {/* Online presence summary */}
            <div className="pt-2 mt-1 border-t border-border">
              <div className="flex items-center justify-between px-2.5 mb-1">
                <p className="text-[9px] text-steel font-semibold uppercase tracking-wider">Online ({collabUsers.filter(u => u.userId !== userId).length})</p>
                <button
                  onClick={() => { setShowTeamRoster(true); setShowChannels(false) }}
                  className="text-[9px] text-accent hover:underline"
                >
                  View all
                </button>
              </div>
              {collabUsers.filter(u => u.userId !== userId).slice(0, 5).map(u => (
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
            <i className={`fas ${isDM ? 'fa-user' : 'fa-comments'} text-gray-300 text-2xl mb-2`}></i>
            <p className="text-xs text-steel">
              {isDM ? `Start a conversation with ${activeChannelInfo?.name}` : 'No messages in this channel yet'}
            </p>
          </div>
        )}
        {channelMessages.map((msg) => {
          const isMe = msg.senderId === userId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%]">
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-0.5 px-1">
                    <span className={`text-[10px] font-semibold ${getOrgColor(msg.senderOrg)}`}>{msg.senderName}</span>
                    <span className="text-[9px] text-steel">&middot;</span>
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
                  <div className="whitespace-pre-wrap">{renderMessageText(msg.text, msg.mentions)}</div>
                </div>
                <div className={`text-[9px] text-steel mt-0.5 ${isMe ? 'text-right' : ''} px-1`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-3">
        {/* Priority indicator */}
        {priority !== 'normal' && (
          <div className={`flex items-center gap-1.5 px-2 py-1 mb-2 rounded-md text-[10px] font-medium ${
            priority === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <i className={`fas ${priorityConfig[priority].icon} text-[9px]`}></i>
            <span>{priorityConfig[priority].label} priority</span>
            <button onClick={() => setPriority('normal')} className="ml-auto text-[9px] opacity-60 hover:opacity-100">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* @mention autocomplete dropdown */}
        {showMentions && filteredMentions.length > 0 && (
          <div className="mb-2 bg-white border border-border rounded-lg shadow-lg py-1 max-h-36 overflow-y-auto">
            {filteredMentions.map(u => {
              const isOnline = teamRoster.find(m => m.userId === u.userId)?.isOnline
              return (
                <button
                  key={u.userId}
                  onClick={() => insertMention(u)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center text-[8px] font-bold text-accent">
                    {u.displayName.charAt(0)}
                  </div>
                  <span className="text-xs text-gray-900 font-medium">{u.displayName}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ml-auto ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Priority toggle */}
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                priority !== 'normal'
                  ? priority === 'critical' ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-amber-50 text-amber-500 border border-amber-200'
                  : 'text-steel hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Set message priority"
            >
              <i className={`fas ${priorityConfig[priority].icon} text-xs`}></i>
            </button>
            {showPriorityMenu && (
              <div className="absolute bottom-full left-0 mb-1 w-36 bg-white border border-border rounded-lg shadow-xl py-1 z-50">
                <button onClick={() => { setPriority('normal'); setShowPriorityMenu(false) }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 ${priority === 'normal' ? 'text-accent font-semibold' : 'text-gray-700'}`}>
                  <i className="fas fa-minus-circle text-steel text-[10px]"></i> Normal
                </button>
                <button onClick={() => { setPriority('urgent'); setShowPriorityMenu(false) }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 ${priority === 'urgent' ? 'text-accent font-semibold' : 'text-gray-700'}`}>
                  <i className="fas fa-bolt text-amber-500 text-[10px]"></i> Urgent
                </button>
                <button onClick={() => { setPriority('critical'); setShowPriorityMenu(false) }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 ${priority === 'critical' ? 'text-accent font-semibold' : 'text-gray-700'}`}>
                  <i className="fas fa-exclamation-circle text-red-500 text-[10px]"></i> Critical
                </button>
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              if (e.key === 'Escape') { setShowMentions(false); setShowPriorityMenu(false) }
            }}
            placeholder={isDM ? `Message ${activeChannelInfo?.name}...` : `Message #${activeChannelInfo?.name || 'General'}... (type @ to mention)`}
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

/** Render message text with @mention highlighting */
function renderMessageText(text: string, _mentions: string[]) {
  if (!text.includes('@')) return text
  // Split on @mentions and highlight them
  const parts = text.split(/(@\S+(?:\s\S+)?)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} className="text-accent font-semibold bg-accent/10 px-0.5 rounded">{part}</span>
    }
    return part
  })
}

/* ─── Main ChatPanel Component ──────────────────────────── */

export default function ChatPanel({
  data, anchors, aiInsights, role, org, userId, displayName, collabUsers, onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<ChatTab>('ai')

  const tabs: { id: ChatTab; label: string; icon: string }[] = [
    { id: 'ai', label: 'AI', icon: 'fa-robot' },
    { id: 'team', label: 'Team', icon: 'fa-comments' },
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
    if (red.length === 0) return 'All deliverables are currently on track \u2014 no overdue items detected.'
    return `There are ${red.length} overdue deliverable${red.length !== 1 ? 's' : ''}:\n\n${red.map(r =>
      `\u2022 **${r.id}** \u2014 ${r.title} (Due: ${r.contractDueFinish})`
    ).join('\n')}\n\nRecommend escalating any items overdue by more than 30 days to the Contracting Officer for cure notice consideration per FAR 52.249-8.`
  }

  if (q.includes('status') || q.includes('summary') || q.includes('overview')) {
    return `**DRL Status Summary (PMS 300)**\n\n\u2705 Green: ${green.length} deliverables on track\n\u26A0\uFE0F Yellow: ${yellow.length} deliverables with compliance issues\n\uD83D\uDD34 Red: ${red.length} deliverables overdue\n\uD83D\uDD12 Sealed: ${Object.keys(anchors).length} records anchored to trust layer\n\nOverall compliance rate: ${((green.length / data.length) * 100).toFixed(0)}%`
  }

  if (q.includes('attention') || q.includes('priority') || q.includes('urgent') || q.includes('immediate')) {
    const critical = data.filter(r => {
      const insight = aiInsights[r.id]
      return insight?.priority === 'High' || r.status === 'red'
    })
    if (critical.length === 0) return 'No items require immediate attention. All deliverables are tracking within acceptable parameters.'
    return `${critical.length} item${critical.length !== 1 ? 's' : ''} need immediate attention:\n\n${critical.slice(0, 5).map(r => {
      const insight = aiInsights[r.id]
      return `\u2022 **${r.id}** \u2014 ${r.title}\n  ${insight?.statusExplanation || `Status: ${r.status}`}`
    }).join('\n\n')}`
  }

  if (q.includes('change') || q.includes('recent') || q.includes('update') || q.includes('week')) {
    return `**Recent Activity Summary**\n\n\u2022 ${data.length} total deliverables tracked\n\u2022 ${Object.keys(anchors).length} records sealed to trust layer\n\u2022 ${red.length} items flagged for attention\n\u2022 ${yellow.length} items under review\n\nAll edits are logged in the Audit Trail with change-level granularity. Open Tools \u2192 Audit Trail for full history.`
  }

  if (q.includes('draft') || q.includes('email') || q.includes('leadership') || q.includes('brief')) {
    return `**Status Briefing \u2014 PMS 300 DRL Tracker**\n\nSir/Ma'am,\n\nDRL compliance stands at ${((green.length / data.length) * 100).toFixed(0)}% (${green.length}/${data.length} deliverables green).\n\n${red.length > 0 ? `${red.length} item${red.length !== 1 ? 's are' : ' is'} overdue and require${red.length === 1 ? 's' : ''} attention:\n${red.slice(0, 3).map(r => `  - ${r.id}: ${r.title}`).join('\n')}\n\n` : 'All deliverables are on track. No overdue items.\n\n'}${yellow.length > 0 ? `${yellow.length} item${yellow.length !== 1 ? 's' : ''} under review.\n\n` : ''}V/R,\n${data.length > 0 ? 'DRL Program Office' : ''}`
  }

  return `I can help with that. Currently tracking ${data.length} deliverables for PMS 300 (Boats & Craft):\n\n\u2022 ${green.length} green (compliant)\n\u2022 ${yellow.length} yellow (review needed)\n\u2022 ${red.length} red (overdue)\n\nTry asking about:\n\u2022 "Show me all overdue deliverables"\n\u2022 "Draft a status update for leadership"\n\u2022 "Which items need immediate attention?"\n\u2022 "What changed since last week?"`
}

function generateAgentFallback(agent: AIAgent, query: string, data: DRLRow[], aiInsights: Record<string, AIRowInsight>): string {
  const q = query.toLowerCase()
  const red = data.filter(r => r.status === 'red')
  const yellow = data.filter(r => r.status === 'yellow')

  if (agent.id === 'compliance-monitor') {
    if (q.includes('check') || q.includes('scan') || q.includes('status') || q.includes('issue')) {
      const issues: string[] = []
      if (red.length > 0) issues.push(`\uD83D\uDD34 ${red.length} overdue deliverable${red.length !== 1 ? 's' : ''} \u2014 immediate action required`)
      if (yellow.length > 0) issues.push(`\u26A0\uFE0F ${yellow.length} item${yellow.length !== 1 ? 's' : ''} with compliance findings`)
      const unsealed = data.filter(r => !Object.keys(aiInsights).includes(r.id))
      if (unsealed.length > 0) issues.push(`\uD83D\uDD13 ${unsealed.length} record${unsealed.length !== 1 ? 's' : ''} pending seal verification`)
      return issues.length > 0
        ? `**Compliance Scan Results:**\n\n${issues.join('\n')}\n\nRecommend reviewing overdue items first. Items >30 days overdue may warrant cure notice per FAR 52.249-8.`
        : 'All compliance checks passed. No issues detected at this time.'
    }
  }

  if (agent.id === 'status-briefer') {
    return `**Executive Status Brief \u2014 PMS 300**\n\nBOTTOM LINE: ${red.length === 0 ? 'Program on track' : `${red.length} item${red.length !== 1 ? 's' : ''} require attention`}\n\nGreen: ${data.filter(r => r.status === 'green').length} | Yellow: ${yellow.length} | Red: ${red.length}\n\n${red.length > 0 ? `TOP RISKS:\n${red.slice(0, 3).map(r => `  - ${r.id}: ${r.title}`).join('\n')}\n\n` : ''}RECOMMENDATION: ${red.length > 0 ? 'Schedule tiger team review for overdue items within 48 hours.' : 'Continue current trajectory. Next review per regular schedule.'}`
  }

  if (agent.id === 'contract-advisor') {
    if (q.includes('cure') || q.includes('notice') || q.includes('far')) {
      return `Per FAR 52.249-8 (Default for Fixed-Price Supply):\n\n1. Issue Cure Notice when deliverable exceeds contractual due date\n2. Contractor has 10 calendar days to cure after receipt\n3. If no cure, Contracting Officer may terminate for default\n4. Document all communications in contract file\n\nCurrently ${red.length} item${red.length !== 1 ? 's' : ''} may be eligible for cure notice consideration.`
    }
  }

  return `Based on my analysis as ${agent.name}:\n\n${data.filter(r => r.status === 'red').length > 0 ? `There are ${red.length} items needing attention in my focus area (${agent.focusArea}).` : 'Everything in my focus area looks good.'}\n\nWhat specific aspect would you like me to look into?`
}
