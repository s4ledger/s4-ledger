/**
 * ReportEditor — Full-featured TipTap document editor for report preview / editing.
 * Styled to look like a printed page matching the existing PDF template.
 * Includes a formatting toolbar + collapsible AI chat panel.
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Subscript from '@tiptap/extension-subscript'

/* ─── Custom TableCell / TableHeader that preserve inline style ─── */
const styleAttr = {
  style: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('style'),
    renderHTML: (attrs: Record<string, unknown>) =>
      attrs.style ? { style: attrs.style as string } : {},
  },
}
const StyledTableCell = TableCell.extend({
  addAttributes() { return { ...this.parent?.(), ...styleAttr } },
})
const StyledTableHeader = TableHeader.extend({
  addAttributes() { return { ...this.parent?.(), ...styleAttr } },
})
const StyledTableRow = TableRow.extend({
  addAttributes() { return { ...this.parent?.(), ...styleAttr } },
})
const StyledTable = Table.extend({
  addAttributes() { return { ...this.parent?.(), ...styleAttr } },
})
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { chatWithAI, type AIChatMessage } from '../utils/aiService'
import { TEAM_ROSTER, parseMentions, DEFAULT_AGENTS, type AIAgent } from '../services/chatService'

/* ─── AI Models & Conversation Storage ───────────────────────────── */
const AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI', tier: 'Standard', inputPer1k: 0.00015, outputPer1k: 0.0006, description: 'Fast answers & status checks' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', tier: 'Advanced', inputPer1k: 0.0025, outputPer1k: 0.01, description: 'Complex analysis & drafting' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', tier: 'Advanced', inputPer1k: 0.003, outputPer1k: 0.015, description: 'Nuanced analysis & reasoning' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', tier: 'Premium', inputPer1k: 0.015, outputPer1k: 0.075, description: 'Highest capability' },
  { id: 'o1-pro', name: 'o1-pro', provider: 'OpenAI', tier: 'Reasoning', inputPer1k: 0.15, outputPer1k: 0.60, description: 'Multi-step reasoning & risk' },
] as const

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

function estimateTokens(messages: AIChatMessage[]): number {
  return Math.ceil(messages.reduce((sum, m) => sum + m.text.length, 0) / 4)
}

const REPORT_STORAGE_KEY = 's4-report-saved-conversations'
function loadReportConversations(): SavedConversation[] {
  try { const raw = localStorage.getItem(REPORT_STORAGE_KEY); return raw ? JSON.parse(raw) : [] } catch { return [] }
}
function persistReportConversations(convos: SavedConversation[]): void {
  try { localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(convos)) } catch { /* quota */ }
}

/* ─── Types ──────────────────────────────────────────────────────── */
interface CommentReply {
  id: string
  text: string
  author: string
  timestamp: Date
  mentions: string[]
}

interface ReportComment {
  id: string
  text: string
  author: string
  authorRole: string
  timestamp: Date
  selectedText: string
  mentions: string[]
  replies: CommentReply[]
  resolved: boolean
}

interface Props {
  initialHtml: string
  onExportPdf: (html: string) => void
  onExportExcel: () => void
  onExportCsv: () => void
  onClose: () => void
}

/* ─── Font size options ──────────────────────────────────────────── */
const FONT_SIZES = ['9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']

/* ─── Toolbar Button ─────────────────────────────────────────────── */
function TBtn({ icon, title, active, onClick, className = '' }: {
  icon: string; title: string; active?: boolean; onClick: () => void; className?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-all ${
        active ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-200'
      } ${className}`}
    >
      <i className={`fas fa-${icon}`}></i>
    </button>
  )
}

function TSep() {
  return <div className="w-px h-5 bg-gray-300 mx-0.5" />
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */
export default function ReportEditor({ initialHtml, onExportPdf, onExportExcel, onExportCsv, onClose }: Props) {
  const [showChat, setShowChat] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AI Chat state
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [agents, setAgents] = useState<AIAgent[]>(() => DEFAULT_AGENTS)
  const [activeAgent, setActiveAgent] = useState<AIAgent | null>(null)
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [newAgentForm, setNewAgentForm] = useState({ name: '', description: '', focusArea: '', instructions: '' })
  const [generalMessages, setGeneralMessages] = useState<AIChatMessage[]>([
    { role: 'ai', text: 'Hello! I\'m your Report Assistant. I can help you edit and improve your DRL report. Ask me to rewrite sections, fix formatting, or add content.' },
  ])
  const [agentMessages, setAgentMessages] = useState<Record<string, AIChatMessage[]>>({})
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [savedConvos, setSavedConvos] = useState<SavedConversation[]>(() => loadReportConversations())
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null)
  const [showSaved, setShowSaved] = useState(false)
  const [showTokens, setShowTokens] = useState(false)
  const [saveToast, setSaveToast] = useState<string | null>(null)

  // Collaborative comments
  const [comments, setComments] = useState<ReportComment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [activeMentionField, setActiveMentionField] = useState<'comment' | 'reply'>('comment')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: true }),
      StyledTable.configure({ resizable: true }),
      StyledTableRow,
      StyledTableCell,
      StyledTableHeader,
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Start typing…' }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: 'report-editor-content',
      },
    },
  })

  /* ─── AI Chat (agents, models, save/pin, token tracking) ──── */
  const makeAgentGreeting = useCallback((agent: AIAgent) =>
    `I'm ${agent.name}. ${agent.description}\n\nHow can I help you with the report?`
  , [])

  const currentMessages = useMemo(() => {
    if (!activeAgent) return generalMessages
    return agentMessages[activeAgent.id] || [{ role: 'ai' as const, text: makeAgentGreeting(activeAgent) }]
  }, [activeAgent, generalMessages, agentMessages, makeAgentGreeting])

  const tokenCount = useMemo(() => estimateTokens(currentMessages), [currentMessages])
  const selectedModelInfo = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0]

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages])

  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim() || !editor) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatLoading(true)

    const currentText = editor.getText()

    if (activeAgent) {
      const agentId = activeAgent.id
      const prev = agentMessages[agentId] || [{ role: 'ai' as const, text: makeAgentGreeting(activeAgent) }]
      const withUser: AIChatMessage[] = [...prev, { role: 'user', text: userMsg }]
      setAgentMessages(p => ({ ...p, [agentId]: withUser }))

      try {
        const contextMsg = `${activeAgent.instructions}\n\nYou are helping edit a DRL Weekly Status Report. Model: ${selectedModelInfo.name}.\n\nCurrent report text:\n${currentText.slice(0, 4000)}\n\nUser: ${userMsg}`
        const result = await chatWithAI({
          message: contextMsg, conversation: prev, tool_context: 'report_editor',
          analysis_data: { agentName: activeAgent.name, focusArea: activeAgent.focusArea, reportText: currentText.slice(0, 4000) },
        })
        const response = result.fallback
          ? `I can help with ${activeAgent.focusArea || 'report editing'}. Try asking me to review, rewrite, or analyze specific sections.`
          : result.response
        setAgentMessages(p => ({ ...p, [agentId]: [...withUser, { role: 'ai', text: response }] }))
        const updateMatch = response.match(/<report-update>([\s\S]*?)<\/report-update>/)
        if (updateMatch) editor.commands.setContent(updateMatch[1])
      } catch {
        setAgentMessages(p => ({ ...p, [agentId]: [...withUser, { role: 'ai', text: 'I encountered an error. Please try again.' }] }))
      }
    } else {
      setGeneralMessages(prev => [...prev, { role: 'user', text: userMsg }])
      try {
        const result = await chatWithAI({
          message: `You are an expert report editor assistant for S4 Systems DRL reports. The user is editing a DRL Weekly Status Report. Help them make corrections, add content, rewrite sections, or answer questions. Keep responses concise and professional.\n\nModel: ${selectedModelInfo.name}.\nCurrent report text:\n${currentText.slice(0, 4000)}\n\nUser request: ${userMsg}`,
          conversation: generalMessages, tool_context: 'report_editor',
          analysis_data: { reportText: currentText.slice(0, 4000), model: selectedModelInfo.name },
        })
        if (!result.fallback && result.response) {
          const reply = result.response
          setGeneralMessages(prev => [...prev, { role: 'ai', text: reply }])
          const updateMatch = reply.match(/<report-update>([\s\S]*?)<\/report-update>/)
          if (updateMatch) editor.commands.setContent(updateMatch[1])
        } else {
          const lowerMsg = userMsg.toLowerCase()
          let reply = 'I can help you edit the report. Try asking me to rewrite a section, fix formatting, or add specific content.'
          if (lowerMsg.includes('executive summary')) reply = 'To modify the Executive Summary, scroll to that section and make your changes directly.'
          else if (lowerMsg.includes('add') || lowerMsg.includes('insert')) reply = 'Place your cursor where you\'d like to insert content, then type directly in the editor.'
          else if (lowerMsg.includes('fix') || lowerMsg.includes('correct')) reply = 'Highlight the specific text and make the fix, or describe exactly what needs to change.'
          setGeneralMessages(prev => [...prev, { role: 'ai', text: reply }])
        }
      } catch {
        setGeneralMessages(prev => [...prev, { role: 'ai', text: 'I encountered an error. Please try again.' }])
      }
    }
    setChatLoading(false)
  }, [chatInput, editor, activeAgent, agentMessages, generalMessages, makeAgentGreeting, selectedModelInfo])

  const showSaveMsg = useCallback((msg: string) => {
    setSaveToast(msg)
    setTimeout(() => setSaveToast(null), 2500)
  }, [])

  const handleSaveConvo = useCallback(() => {
    if (currentMessages.length <= 1) return
    const firstUserMsg = currentMessages.find(m => m.role === 'user')?.text || 'Untitled'
    const titleBase = activeAgent ? `${activeAgent.name}: ${firstUserMsg}` : firstUserMsg
    const title = titleBase.length > 50 ? titleBase.slice(0, 50) + '...' : titleBase
    const now = new Date().toISOString()
    if (activeConvoId) {
      const all = loadReportConversations()
      const updated = all.map(c => c.id === activeConvoId ? { ...c, messages: currentMessages, tokenCount: estimateTokens(currentMessages), updatedAt: now } : c)
      persistReportConversations(updated)
      setSavedConvos(updated)
      showSaveMsg('Conversation updated')
    } else {
      const convo: SavedConversation = {
        id: `rpt-conv-${Date.now()}`, title, messages: currentMessages, pinned: false,
        ...(activeAgent ? { agentId: activeAgent.id, agentName: activeAgent.name } : {}),
        createdAt: now, updatedAt: now, tokenCount: estimateTokens(currentMessages),
      }
      const all = loadReportConversations()
      all.unshift(convo)
      persistReportConversations(all)
      setSavedConvos(all)
      setActiveConvoId(convo.id)
      showSaveMsg('Conversation saved')
    }
  }, [currentMessages, activeConvoId, activeAgent, showSaveMsg])

  const handlePinConvo = useCallback((convoId: string) => {
    const all = loadReportConversations()
    const wasPinned = all.find(c => c.id === convoId)?.pinned
    const updated = all.map(c => c.id === convoId ? { ...c, pinned: !c.pinned } : c)
    persistReportConversations(updated)
    setSavedConvos(updated)
    showSaveMsg(wasPinned ? 'Unpinned' : 'Pinned')
  }, [showSaveMsg])

  const handleLoadConvo = useCallback((convo: SavedConversation) => {
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

  const handleDeleteConvo = useCallback((convoId: string) => {
    const all = loadReportConversations().filter(c => c.id !== convoId)
    persistReportConversations(all)
    setSavedConvos(all)
    if (activeConvoId === convoId) setActiveConvoId(null)
  }, [activeConvoId])

  const handleNewConvo = useCallback(() => {
    if (activeAgent) {
      setAgentMessages(prev => ({ ...prev, [activeAgent.id]: [{ role: 'ai', text: makeAgentGreeting(activeAgent) }] }))
    } else {
      setGeneralMessages([{ role: 'ai', text: 'Hello! I\'m your Report Assistant. How can I help you with the report?' }])
    }
    setActiveConvoId(null)
    setShowSaved(false)
  }, [activeAgent, makeAgentGreeting])

  const handleCreateAgent = useCallback(() => {
    if (!newAgentForm.name.trim() || !newAgentForm.instructions.trim()) return
    const agent: AIAgent = {
      id: `custom-${Date.now()}`, name: newAgentForm.name,
      description: newAgentForm.description || newAgentForm.name,
      icon: 'fa-robot', focusArea: newAgentForm.focusArea || 'General',
      instructions: newAgentForm.instructions, createdBy: 'Report Editor',
      createdAt: new Date().toISOString(),
    }
    setAgents(prev => [...prev, agent])
    setNewAgentForm({ name: '', description: '', focusArea: '', instructions: '' })
    setShowCreateAgent(false)
    setActiveAgent(agent)
    setAgentMessages(prev => ({ ...prev, [agent.id]: [{ role: 'ai', text: makeAgentGreeting(agent) }] }))
    showSaveMsg(`Agent "${agent.name}" created`)
  }, [newAgentForm, showSaveMsg, makeAgentGreeting])

  const handleSelectAgent = useCallback((agent: AIAgent) => {
    setActiveAgent(agent)
    if (!agentMessages[agent.id]) {
      setAgentMessages(prev => ({ ...prev, [agent.id]: [{ role: 'ai', text: makeAgentGreeting(agent) }] }))
    }
    setActiveConvoId(null)
    setShowAgentPicker(false)
  }, [agentMessages, makeAgentGreeting])

  const handleSwitchToGeneral = useCallback(() => {
    setActiveAgent(null)
    setActiveConvoId(null)
    setShowAgentPicker(false)
  }, [])

  const reportSuggestions = [
    'Rewrite the executive summary',
    'Make the tone more formal',
    'Add a section about risk assessment',
    'Summarize the overdue items',
  ]

  /* ─── Image insertion ──────────────────────────────────────── */
  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      editor.chain().focus().setImage({ src: base64 }).run()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [editor])

  /* ─── Link insertion ───────────────────────────────────────── */
  const handleLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = window.prompt('Enter URL:', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  /* ─── Table insertion ──────────────────────────────────────── */
  const handleTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  /* ─── Horizontal rule ─────────────────────────────────────── */
  const handleHr = useCallback(() => {
    editor?.chain().focus().setHorizontalRule().run()
  }, [editor])

  /* ─── Font size ────────────────────────────────────────────── */
  const handleFontSize = useCallback((size: string) => {
    if (!editor) return
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run()
  }, [editor])

  /* ─── Color picker ─────────────────────────────────────────── */
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colors = ['#1D1D1F', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#007AFF', '#6E6E73']

  /* ─── Comments ─────────────────────────────────────────────── */
  const handleAddComment = useCallback(() => {
    if (!editor || !commentInput.trim()) return
    const { from, to } = editor.state.selection
    const selectedText = from !== to ? editor.state.doc.textBetween(from, to) : ''
    const knownUsers = TEAM_ROSTER.map(m => ({ userId: m.userId, displayName: m.displayName }))
    const mentions = parseMentions(commentInput, knownUsers)

    // Highlight the selected text in the editor
    if (from !== to) {
      editor.chain().focus().setHighlight({ color: '#FDE68A' }).run()
    }

    const newComment: ReportComment = {
      id: `cmt-${Date.now()}`,
      text: commentInput.trim(),
      author: 'You',
      authorRole: 'Program Manager',
      timestamp: new Date(),
      selectedText,
      mentions,
      replies: [],
      resolved: false,
    }
    setComments(prev => [newComment, ...prev])
    setCommentInput('')
    setShowMentionDropdown(false)
  }, [editor, commentInput])

  const handleAddReply = useCallback((commentId: string) => {
    if (!replyInput.trim()) return
    const knownUsers = TEAM_ROSTER.map(m => ({ userId: m.userId, displayName: m.displayName }))
    const mentions = parseMentions(replyInput, knownUsers)
    const reply: CommentReply = {
      id: `reply-${Date.now()}`,
      text: replyInput.trim(),
      author: 'You',
      timestamp: new Date(),
      mentions,
    }
    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
    ))
    setReplyInput('')
    setReplyingTo(null)
    setShowMentionDropdown(false)
  }, [replyInput])

  const handleResolveComment = useCallback((commentId: string) => {
    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, resolved: !c.resolved } : c
    ))
  }, [])

  const handleMentionInput = useCallback((value: string, field: 'comment' | 'reply') => {
    if (field === 'comment') setCommentInput(value)
    else setReplyInput(value)

    // Detect @mention trigger
    const lastAt = value.lastIndexOf('@')
    if (lastAt >= 0 && lastAt === value.length - 1) {
      setShowMentionDropdown(true)
      setMentionFilter('')
      setActiveMentionField(field)
    } else if (lastAt >= 0) {
      const afterAt = value.slice(lastAt + 1)
      if (!afterAt.includes(' ')) {
        setShowMentionDropdown(true)
        setMentionFilter(afterAt.toLowerCase())
        setActiveMentionField(field)
      } else {
        setShowMentionDropdown(false)
      }
    } else {
      setShowMentionDropdown(false)
    }
  }, [])

  const handleSelectMention = useCallback((displayName: string) => {
    const setter = activeMentionField === 'comment' ? setCommentInput : setReplyInput
    const getter = activeMentionField === 'comment' ? commentInput : replyInput
    const lastAt = getter.lastIndexOf('@')
    if (lastAt >= 0) {
      setter(getter.slice(0, lastAt) + `@${displayName} `)
    }
    setShowMentionDropdown(false)
  }, [activeMentionField, commentInput, replyInput])

  const filteredTeam = TEAM_ROSTER.filter(m =>
    m.displayName.toLowerCase().includes(mentionFilter)
  )

  if (!editor) return null

  return (
    <div className="fixed inset-0 z-[1100] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Main editor area */}
      <div className={`relative flex flex-col bg-gray-100 transition-all duration-300 ${(showChat || showComments) ? 'w-[calc(100%-380px)]' : 'w-full'}`}>
        {/* ═══ Top Bar ═══════════════════════════════════════════ */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors" title="Close">
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Report Editor</h2>
              <p className="text-[10px] text-steel">Edit and preview before exporting</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowComments(!showComments); if (!showComments) setShowChat(false) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showComments ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="fas fa-comments"></i>
              Comments
              {comments.filter(c => !c.resolved).length > 0 && (
                <span className="ml-1 bg-white/30 text-white rounded-full px-1.5 text-[10px] font-bold">{comments.filter(c => !c.resolved).length}</span>
              )}
            </button>
            <button
              onClick={() => { setShowChat(!showChat); if (!showChat) setShowComments(false) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showChat ? 'bg-accent text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="fas fa-robot"></i>
              AI Assistant
            </button>
            <div className="w-px h-6 bg-gray-200" />
            <button
              onClick={() => onExportPdf(editor.getHTML())}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-all"
            >
              <i className="fas fa-file-pdf"></i>
              Export PDF
            </button>
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-all"
            >
              <i className="fas fa-file-excel"></i>
              Excel
            </button>
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-all"
            >
              <i className="fas fa-file-csv"></i>
              CSV
            </button>
          </div>
        </div>

        {/* ═══ Toolbar ═══════════════════════════════════════════ */}
        <div className="bg-white border-b border-gray-200 px-3 py-1.5 flex items-center gap-0.5 flex-wrap flex-shrink-0">
          {/* Undo / Redo */}
          <TBtn icon="undo" title="Undo" onClick={() => editor.chain().focus().undo().run()} />
          <TBtn icon="redo" title="Redo" onClick={() => editor.chain().focus().redo().run()} />
          <TSep />

          {/* Heading level */}
          <select
            onChange={e => {
              const val = e.target.value
              if (val === 'p') editor.chain().focus().setParagraph().run()
              else editor.chain().focus().toggleHeading({ level: parseInt(val) as 1 | 2 | 3 | 4 }).run()
            }}
            value={
              editor.isActive('heading', { level: 1 }) ? '1' :
              editor.isActive('heading', { level: 2 }) ? '2' :
              editor.isActive('heading', { level: 3 }) ? '3' :
              editor.isActive('heading', { level: 4 }) ? '4' : 'p'
            }
            className="h-7 px-1.5 text-xs border border-gray-300 rounded bg-white text-gray-700"
            title="Paragraph style"
          >
            <option value="p">Normal</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="4">Heading 4</option>
          </select>

          {/* Font size */}
          <select
            onChange={e => handleFontSize(e.target.value)}
            defaultValue="12px"
            className="h-7 px-1.5 text-xs border border-gray-300 rounded bg-white text-gray-700 w-16"
            title="Font size"
          >
            {FONT_SIZES.map(s => <option key={s} value={s}>{s.replace('px', '')}</option>)}
          </select>
          <TSep />

          {/* Basic formatting */}
          <TBtn icon="bold" title="Bold (⌘B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
          <TBtn icon="italic" title="Italic (⌘I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <TBtn icon="underline" title="Underline (⌘U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <TBtn icon="strikethrough" title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
          <TBtn icon="subscript" title="Subscript" active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()} />
          <TBtn icon="superscript" title="Superscript" active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()} />
          <TSep />

          {/* Color */}
          <div className="relative">
            <TBtn icon="palette" title="Text Color" onClick={() => setShowColorPicker(!showColorPicker)} />
            {showColorPicker && (
              <div className="absolute top-8 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 grid grid-cols-5 gap-1">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false) }}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <button
                  onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false) }}
                  className="w-6 h-6 rounded border border-gray-200 text-[8px] text-gray-500 hover:bg-gray-100"
                  title="Remove color"
                >
                  <i className="fas fa-ban"></i>
                </button>
              </div>
            )}
          </div>
          <TBtn icon="highlighter" title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#FEF08A' }).run()} />
          <TSep />

          {/* Alignment */}
          <TBtn icon="align-left" title="Align Left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
          <TBtn icon="align-center" title="Align Center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
          <TBtn icon="align-right" title="Align Right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
          <TBtn icon="align-justify" title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} />
          <TSep />

          {/* Lists */}
          <TBtn icon="list-ul" title="Bullet List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <TBtn icon="list-ol" title="Numbered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <TBtn icon="tasks" title="Task List" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} />
          <TSep />

          {/* Insert */}
          <TBtn icon="link" title="Insert Link" active={editor.isActive('link')} onClick={handleLink} />
          <TBtn icon="image" title="Insert Image" onClick={handleImageUpload} />
          <TBtn icon="table" title="Insert Table" onClick={handleTable} />
          <TBtn icon="minus" title="Horizontal Rule" onClick={handleHr} />
          <TBtn icon="code" title="Code Block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
          <TBtn icon="quote-left" title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <TSep />
          <TBtn icon="comment" title="Add Comment" className="text-yellow-600" onClick={() => { setShowComments(true); setShowChat(false) }} />

          {/* Hidden file input for image uploads */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* ═══ Document Canvas ═══════════════════════════════════ */}
        <div className="flex-1 overflow-auto py-8 px-4">
          <div className="mx-auto bg-white shadow-lg border border-gray-200" style={{ width: '8.5in', minHeight: '11in', padding: '1in 1in 1in 1in' }}>
            <EditorContent editor={editor} />
          </div>
          {/* Second page hint */}
          <div className="mx-auto mt-4 bg-white shadow-lg border border-gray-200 opacity-30 flex items-center justify-center text-sm text-gray-400" style={{ width: '8.5in', height: '2in' }}>
            Content continues on next page…
          </div>
        </div>
      </div>

      {/* ═══ AI Chat Panel ═══════════════════════════════════════ */}
      {showChat && (
        <div className="relative w-[380px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
          {/* Save toast */}
          {saveToast && (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5">
              <i className="fas fa-check-circle text-green-400 text-[10px]"></i>
              {saveToast}
            </div>
          )}

          {/* Chat header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <i className={`fas ${activeAgent?.icon || 'fa-robot'} ${activeAgent ? 'text-purple-500' : 'text-accent'} text-sm`}></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{activeAgent ? activeAgent.name : 'Report Assistant'}</h3>
                <p className="text-[10px] text-steel">{activeAgent ? activeAgent.focusArea : 'AI-powered report editing'}</p>
              </div>
            </div>
            <button onClick={() => setShowChat(false)} className="text-steel hover:text-gray-900 transition-colors">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>

          {/* ─── Saved Conversations View ─── */}
          {showSaved ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowSaved(false)} className="text-steel hover:text-gray-900"><i className="fas fa-arrow-left text-xs"></i></button>
                  <span className="text-xs font-semibold text-gray-900">Saved Conversations</span>
                </div>
                <button onClick={handleNewConvo} className="text-[10px] text-accent font-medium hover:underline">+ New Chat</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {savedConvos.length === 0 && (
                  <div className="text-center py-8">
                    <i className="fas fa-bookmark text-gray-300 text-2xl mb-2 block"></i>
                    <p className="text-xs text-steel">No saved conversations yet</p>
                  </div>
                )}
                {savedConvos.filter(c => c.pinned).length > 0 && (
                  <>
                    <p className="text-[9px] text-steel font-semibold uppercase tracking-wider px-1 pt-1">Pinned</p>
                    {savedConvos.filter(c => c.pinned).map(c => (
                      <div key={c.id} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer group ${activeConvoId === c.id ? 'border-accent/30 bg-accent/5' : 'border-gray-200 hover:border-accent/20 hover:bg-gray-50'}`}>
                        <button onClick={() => handlePinConvo(c.id)} className="text-amber-500 mt-0.5 flex-shrink-0"><i className="fas fa-thumbtack text-[10px]"></i></button>
                        <div className="flex-1 min-w-0" onClick={() => handleLoadConvo(c)}>
                          <p className="text-xs font-medium text-gray-900 truncate">{c.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {c.agentName && <span className="text-[9px] text-purple-600 bg-purple-50 px-1 rounded">{c.agentName}</span>}
                            <span className="text-[9px] text-steel">{new Date(c.updatedAt).toLocaleDateString()}</span>
                            <span className="text-[9px] text-accent bg-accent/10 px-1 rounded">{c.tokenCount.toLocaleString()} tokens</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteConvo(c.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 mt-0.5"><i className="fas fa-trash-alt text-[9px]"></i></button>
                      </div>
                    ))}
                  </>
                )}
                {savedConvos.filter(c => !c.pinned).length > 0 && (
                  <>
                    {savedConvos.filter(c => c.pinned).length > 0 && <p className="text-[9px] text-steel font-semibold uppercase tracking-wider px-1 pt-2">Recent</p>}
                    {savedConvos.filter(c => !c.pinned).map(c => (
                      <div key={c.id} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer group ${activeConvoId === c.id ? 'border-accent/30 bg-accent/5' : 'border-gray-200 hover:border-accent/20 hover:bg-gray-50'}`}>
                        <button onClick={() => handlePinConvo(c.id)} className="text-gray-300 hover:text-amber-500 mt-0.5 flex-shrink-0"><i className="fas fa-thumbtack text-[10px]"></i></button>
                        <div className="flex-1 min-w-0" onClick={() => handleLoadConvo(c)}>
                          <p className="text-xs font-medium text-gray-900 truncate">{c.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {c.agentName && <span className="text-[9px] text-purple-600 bg-purple-50 px-1 rounded">{c.agentName}</span>}
                            <span className="text-[9px] text-steel">{new Date(c.updatedAt).toLocaleDateString()}</span>
                            <span className="text-[9px] text-accent bg-accent/10 px-1 rounded">{c.tokenCount.toLocaleString()} tokens</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteConvo(c.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 mt-0.5"><i className="fas fa-trash-alt text-[9px]"></i></button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          ) : showTokens ? (
            /* ─── Token Usage View ─── */
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50/50">
                <button onClick={() => setShowTokens(false)} className="text-steel hover:text-gray-900"><i className="fas fa-arrow-left text-xs"></i></button>
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
                <div>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Available Models</p>
                  <div className="space-y-2">
                    {AI_MODELS.map(model => (
                      <div key={model.id} className={`bg-white border rounded-lg p-3 ${selectedModel === model.id ? 'border-accent/40 ring-1 ring-accent/20' : 'border-gray-200'}`}>
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
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : showAgentPicker ? (
            /* ─── Agent Picker View ─── */
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowAgentPicker(false)} className="text-steel hover:text-gray-900"><i className="fas fa-arrow-left text-xs"></i></button>
                  <span className="text-xs font-semibold text-gray-900">Choose AI Mode</span>
                </div>
                <button onClick={() => setShowCreateAgent(true)} className="flex items-center gap-1 text-[10px] text-accent font-medium hover:underline">
                  <i className="fas fa-plus text-[8px]"></i> Create Agent
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <button onClick={handleSwitchToGeneral} className={`w-full text-left border rounded-lg p-3 transition-all ${!activeAgent ? 'border-accent/30 bg-accent/5' : 'border-gray-200 hover:border-accent/20 hover:bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><i className="fas fa-robot text-accent text-sm"></i></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">General Report Assistant</p>
                      <p className="text-[11px] text-steel mt-0.5">Full-context DRL report editor — rewrite, format, improve</p>
                    </div>
                    {!activeAgent && <i className="fas fa-check text-accent text-xs mt-3"></i>}
                  </div>
                </button>
                <p className="text-[9px] text-steel font-semibold uppercase tracking-wider px-1 pt-2">Specialized Agents</p>
                {agents.map(agent => (
                  <button key={agent.id} onClick={() => handleSelectAgent(agent)} className={`w-full text-left border rounded-lg p-3 transition-all group ${activeAgent?.id === agent.id ? 'border-accent/30 bg-accent/5' : 'border-gray-200 hover:border-accent/20 hover:bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20"><i className={`fas ${agent.icon} text-accent text-sm`}></i></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                        <p className="text-[11px] text-steel mt-0.5 line-clamp-2">{agent.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-accent bg-accent/10 px-1.5 py-0.5 rounded-md font-medium">{agent.focusArea}</span>
                          {agent.createdBy !== 'system' && <span className="text-[9px] text-steel">by {agent.createdBy}</span>}
                        </div>
                      </div>
                      {activeAgent?.id === agent.id && <i className="fas fa-check text-accent text-xs mt-3"></i>}
                    </div>
                  </button>
                ))}
                {showCreateAgent && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2 mt-2">
                    <p className="text-xs font-semibold text-gray-900 mb-1">Create Custom Agent</p>
                    <input value={newAgentForm.name} onChange={e => setNewAgentForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Agent name" className="w-full text-xs bg-white border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent" />
                    <input value={newAgentForm.description} onChange={e => setNewAgentForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Short description" className="w-full text-xs bg-white border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent" />
                    <input value={newAgentForm.focusArea} onChange={e => setNewAgentForm(prev => ({ ...prev, focusArea: e.target.value }))} placeholder="Focus area (e.g., QA Review)" className="w-full text-xs bg-white border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent" />
                    <textarea value={newAgentForm.instructions} onChange={e => setNewAgentForm(prev => ({ ...prev, instructions: e.target.value }))} placeholder="Instructions — tell the agent what it should do..." rows={4} className="w-full text-xs bg-white border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent resize-none" />
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setShowCreateAgent(false)} className="text-[11px] text-steel hover:text-gray-900 px-2 py-1">Cancel</button>
                      <button onClick={handleCreateAgent} disabled={!newAgentForm.name.trim() || !newAgentForm.instructions.trim()} className="text-[11px] font-medium bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50 hover:bg-accent/90">Create Agent</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ─── Default Chat View ─── */
            <>
              {/* Toolbar Row 1 — Model + Agent */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-200 bg-gray-50/30 flex-shrink-0">
                <div className="relative">
                  <button onClick={() => setShowModelPicker(!showModelPicker)} className="flex items-center gap-1 px-2 py-1 text-[10px] text-steel hover:text-gray-900 hover:bg-gray-100 rounded-md border border-transparent hover:border-gray-200">
                    <i className="fas fa-microchip text-[9px]"></i>
                    <span className="font-medium">{selectedModelInfo.name}</span>
                    <i className={`fas fa-chevron-${showModelPicker ? 'up' : 'down'} text-[7px] ml-0.5`}></i>
                  </button>
                  {showModelPicker && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
                      {AI_MODELS.map(m => (
                        <button key={m.id} onClick={() => { setSelectedModel(m.id); setShowModelPicker(false) }} className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selectedModel === m.id ? 'bg-accent/5' : ''}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-900">{m.name}</span>
                            <span className="text-[9px] text-steel bg-gray-100 px-1.5 py-0.5 rounded">{m.tier}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-steel">{m.provider}</span>
                            <span className="text-[9px] text-steel">·</span>
                            <span className="text-[9px] text-steel">{m.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <button onClick={() => setShowAgentPicker(true)} className="flex items-center gap-1 px-2 py-1 text-[10px] hover:bg-gray-100 rounded-md border border-transparent hover:border-gray-200">
                  <i className={`fas ${activeAgent?.icon || 'fa-robot'} text-[9px] ${activeAgent ? 'text-purple-500' : 'text-accent'}`}></i>
                  <span className={`font-medium ${activeAgent ? 'text-purple-700' : 'text-steel'}`}>{activeAgent ? activeAgent.name : 'General AI'}</span>
                  {activeAgent && (
                    <span onClick={e => { e.stopPropagation(); handleSwitchToGeneral() }} className="text-[8px] text-gray-400 hover:text-red-500 ml-0.5" title="Switch to General AI"><i className="fas fa-times"></i></span>
                  )}
                  <i className="fas fa-chevron-down text-[7px] ml-0.5 text-steel"></i>
                </button>
                <div className="flex-1"></div>
                <button onClick={() => setShowTokens(true)} className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] text-steel hover:text-gray-900 hover:bg-gray-100 rounded-md" title="Token usage & pricing">
                  <i className="fas fa-coins text-[9px]"></i>
                  <span>{tokenCount.toLocaleString()}</span>
                </button>
              </div>

              {/* Toolbar Row 2 — Save / Pin / New / History */}
              <div className="flex items-center justify-between px-3 py-1 border-b border-gray-200 bg-white flex-shrink-0">
                <div className="flex items-center gap-0.5">
                  <button onClick={handleNewConvo} className="w-7 h-7 flex items-center justify-center text-steel hover:text-gray-900 hover:bg-gray-100 rounded-md" title="New conversation"><i className="fas fa-plus text-[10px]"></i></button>
                  <button onClick={handleSaveConvo} disabled={currentMessages.length <= 1} className="w-7 h-7 flex items-center justify-center text-steel hover:text-accent hover:bg-accent/5 disabled:opacity-30 rounded-md" title={activeConvoId ? 'Update saved' : 'Save conversation'}><i className={`fas ${activeConvoId ? 'fa-save' : 'fa-bookmark'} text-[10px]`}></i></button>
                  {activeConvoId && (
                    <button onClick={() => handlePinConvo(activeConvoId)} className="w-7 h-7 flex items-center justify-center hover:bg-amber-50 rounded-md" title="Pin conversation">
                      <i className={`fas fa-thumbtack text-[10px] ${savedConvos.find(c => c.id === activeConvoId)?.pinned ? 'text-amber-500' : 'text-steel hover:text-amber-500'}`}></i>
                    </button>
                  )}
                </div>
                <button onClick={() => setShowSaved(true)} className="w-7 h-7 flex items-center justify-center text-steel hover:text-gray-900 hover:bg-gray-100 rounded-md relative" title="Saved conversations">
                  <i className="fas fa-history text-[10px]"></i>
                  {savedConvos.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent text-white text-[7px] flex items-center justify-center font-bold">{savedConvos.length}</span>}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {currentMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user' ? 'bg-accent text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      {msg.role !== 'user' && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <i className={`fas ${activeAgent?.icon || 'fa-robot'} ${activeAgent ? 'text-purple-500' : 'text-accent'} text-[10px]`}></i>
                          <span className={`text-[10px] font-semibold ${activeAgent ? 'text-purple-600' : 'text-accent'}`}>{activeAgent ? activeAgent.name : 'Report Assistant'}</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-xl px-3 py-2 rounded-bl-sm">
                      <div className="flex items-center gap-1.5">
                        <i className={`fas ${activeAgent?.icon || 'fa-robot'} ${activeAgent ? 'text-purple-500' : 'text-accent'} text-[10px]`}></i>
                        <span className={`text-[10px] font-semibold ${activeAgent ? 'text-purple-600' : 'text-accent'}`}>{activeAgent ? activeAgent.name : 'Report Assistant'}</span>
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                {currentMessages.length <= 1 && !activeAgent && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] text-steel font-medium uppercase tracking-wider">Suggestions</p>
                    {reportSuggestions.map(s => (
                      <button key={s} onClick={() => setChatInput(s)} className="block w-full text-left text-xs px-3 py-2 bg-accent/5 hover:bg-accent/10 border border-accent/15 rounded-lg text-accent transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="p-3 border-t border-gray-200 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                    placeholder={activeAgent ? `Ask ${activeAgent.name}...` : 'Ask about or edit the report…'}
                    className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-3 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ Comments Panel ══════════════════════════════════════ */}
      {showComments && (
        <div className="relative w-[380px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
          {/* Comments header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <i className="fas fa-comments text-yellow-600 text-sm"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Comments</h3>
                <p className="text-[10px] text-steel">{comments.filter(c => !c.resolved).length} open · {comments.filter(c => c.resolved).length} resolved</p>
              </div>
            </div>
            <button onClick={() => setShowComments(false)} className="text-steel hover:text-gray-900 transition-colors">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>

          {/* New comment input */}
          <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <p className="text-[10px] text-steel mb-2">
              <i className="fas fa-info-circle mr-1"></i>
              Select text in the editor, then add a comment. Use @name to mention.
            </p>
            <div className="relative">
              <textarea
                value={commentInput}
                onChange={e => handleMentionInput(e.target.value, 'comment')}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && commentInput.trim()) { e.preventDefault(); handleAddComment() } }}
                placeholder="Add a comment… @mention to notify"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 resize-none"
                rows={2}
              />
              {showMentionDropdown && activeMentionField === 'comment' && filteredTeam.length > 0 && (
                <div className="absolute bottom-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg mb-1 max-h-32 overflow-auto z-50">
                  {filteredTeam.map(m => (
                    <button
                      key={m.userId}
                      onClick={() => handleSelectMention(m.displayName)}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-xs"
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${m.online ? 'bg-green-500' : 'bg-gray-400'}`}>
                        {m.displayName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium text-gray-900">{m.displayName}</span>
                      <span className="text-steel text-[10px]">{m.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleAddComment}
              disabled={!commentInput.trim()}
              className="mt-2 w-full px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
            >
              <i className="fas fa-plus mr-1"></i> Add Comment
            </button>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-auto p-3 space-y-3">
            {comments.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-comment-dots text-yellow-500 text-lg"></i>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">No comments yet</p>
                <p className="text-xs text-steel">Select text and add a comment to start a discussion.</p>
              </div>
            )}
            {comments.map(comment => (
              <div
                key={comment.id}
                className={`border rounded-lg p-3 ${comment.resolved ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-yellow-200'}`}
              >
                {/* Comment header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[8px] font-bold text-white">
                      {comment.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{comment.author}</span>
                    <span className="text-[10px] text-steel">{comment.authorRole}</span>
                  </div>
                  <button
                    onClick={() => handleResolveComment(comment.id)}
                    title={comment.resolved ? 'Reopen comment' : 'Resolve comment'}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-all ${comment.resolved ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-400'}`}
                  >
                    <i className={`fas fa-${comment.resolved ? 'check-circle' : 'check'} text-[10px]`}></i>
                  </button>
                </div>

                {/* Selected text reference */}
                {comment.selectedText && (
                  <div className="bg-yellow-50 border-l-2 border-yellow-400 px-2 py-1 mb-2 text-[10px] text-gray-700 italic truncate">
                    "{comment.selectedText.slice(0, 80)}{comment.selectedText.length > 80 ? '…' : ''}"
                  </div>
                )}

                {/* Comment text */}
                <p className="text-xs text-gray-800 leading-relaxed mb-2">{comment.text}</p>

                {/* Timestamp + mentions */}
                <div className="flex items-center gap-2 text-[10px] text-steel">
                  <span>{comment.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  {comment.mentions.length > 0 && (
                    <span className="text-accent">
                      <i className="fas fa-at mr-0.5"></i>
                      {comment.mentions.length} mentioned
                    </span>
                  )}
                </div>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="mt-2 ml-3 border-l-2 border-gray-200 pl-2 space-y-2">
                    {comment.replies.map(reply => (
                      <div key={reply.id}>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-gray-800">{reply.author}</span>
                          <span className="text-[9px] text-steel">{reply.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] text-gray-700">{reply.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input */}
                {replyingTo === comment.id ? (
                  <div className="mt-2 relative">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={replyInput}
                        onChange={e => handleMentionInput(e.target.value, 'reply')}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddReply(comment.id) } else if (e.key === 'Escape') setReplyingTo(null) }}
                        placeholder="Reply… @mention"
                        className="flex-1 px-2 py-1 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500/30"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyInput.trim()}
                        className="px-2 py-1 bg-yellow-500 text-white rounded text-[10px] font-semibold disabled:opacity-40"
                      >
                        <i className="fas fa-reply"></i>
                      </button>
                    </div>
                    {showMentionDropdown && activeMentionField === 'reply' && filteredTeam.length > 0 && (
                      <div className="absolute bottom-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg mb-1 max-h-24 overflow-auto z-50">
                        {filteredTeam.map(m => (
                          <button
                            key={m.userId}
                            onClick={() => handleSelectMention(m.displayName)}
                            className="w-full text-left px-2 py-1 hover:bg-gray-50 flex items-center gap-1.5 text-[11px]"
                          >
                            <span className="font-medium">{m.displayName}</span>
                            <span className="text-steel text-[9px]">{m.role}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="mt-1.5 text-[10px] text-accent hover:text-accent/80 font-medium"
                  >
                    <i className="fas fa-reply mr-1"></i>Reply
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Editor styles ═══════════════════════════════════════ */}
      <style>{`
        .report-editor-content {
          outline: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: #1D1D1F;
        }
        .report-editor-content h1 { font-size: 28px; font-weight: 800; margin: 0 0 8px; }
        .report-editor-content h2 { font-size: 18px; font-weight: 600; margin: 16px 0 8px; }
        .report-editor-content h3 { font-size: 14px; font-weight: 700; margin: 12px 0 6px; }
        .report-editor-content h4 { font-size: 12px; font-weight: 700; margin: 10px 0 4px; }
        .report-editor-content p { margin: 0 0 8px; }
        .report-editor-content ul, .report-editor-content ol { margin: 4px 0 8px 20px; padding: 0; }
        .report-editor-content li { margin: 2px 0; }
        .report-editor-content table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        .report-editor-content th, .report-editor-content td {
          border: 1px solid #ddd; padding: 4px 8px; text-align: left; font-size: 10px;
        }
        .report-editor-content th { font-weight: 600; }
        .report-editor-content img { max-width: 100%; height: auto; margin: 8px 0; border-radius: 4px; }
        .report-editor-content blockquote {
          border-left: 3px solid #007AFF; padding-left: 12px; margin: 8px 0; color: #6E6E73; font-style: italic;
        }
        .report-editor-content code { background: #F5F5F7; padding: 1px 4px; border-radius: 3px; font-size: 10px; }
        .report-editor-content pre { background: #1D1D1F; color: #fff; padding: 12px; border-radius: 6px; overflow-x: auto; }
        .report-editor-content pre code { background: transparent; color: inherit; padding: 0; }
        .report-editor-content hr { border: none; border-top: 2px dashed #ddd; margin: 16px 0; }
        .report-editor-content a { color: #007AFF; text-decoration: underline; }
        .report-editor-content ul[data-type="taskList"] { list-style: none; margin-left: 0; padding: 0; }
        .report-editor-content ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 6px; }
        .report-editor-content ul[data-type="taskList"] li label input[type="checkbox"] { margin-top: 3px; }
        .report-editor-content .is-empty::before {
          content: attr(data-placeholder); color: #aaa; pointer-events: none; float: left; height: 0;
        }
        /* Table resize handle */
        .report-editor-content .tableWrapper { overflow-x: auto; }
        .report-editor-content .selectedCell { background: rgba(0, 122, 255, 0.1); }
        .report-editor-content .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background: #007AFF; pointer-events: none; }
      `}</style>
    </div>
  )
}
