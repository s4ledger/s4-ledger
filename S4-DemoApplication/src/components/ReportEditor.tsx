/**
 * ReportEditor — Full-featured TipTap document editor for report preview / editing.
 * Styled to look like a printed page matching the existing PDF template.
 * Includes a formatting toolbar + collapsible AI chat panel.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
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
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'

/* ─── Types ──────────────────────────────────────────────────────── */
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
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

  /* ─── AI Chat ──────────────────────────────────────────────── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim() || !editor) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatLoading(true)

    // Get current document content for AI context
    const currentHtml = editor.getHTML()
    const currentText = editor.getText()

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an expert report editor assistant for S4 Systems DRL reports. The user is editing a DRL Weekly Status Report. Help them make corrections, add content, rewrite sections, or answer questions about the report. When the user asks you to modify something, describe the changes clearly. Keep responses concise and professional. The current report text content is:\n\n${currentText.slice(0, 4000)}`,
            },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMsg },
          ],
        }),
      })

      if (resp.ok) {
        const data = await resp.json()
        const reply = data.choices?.[0]?.message?.content || data.reply || data.response || 'I can help you edit the report. What would you like to change?'
        setChatMessages(prev => [...prev, { role: 'assistant', content: reply }])

        // If the AI response contains HTML wrapped in <report-update> tags, apply it
        const updateMatch = reply.match(/<report-update>([\s\S]*?)<\/report-update>/)
        if (updateMatch) {
          editor.commands.setContent(updateMatch[1])
        }
      } else {
        // Fallback: provide helpful canned responses
        const lowerMsg = userMsg.toLowerCase()
        let reply = 'I can help you edit the report. Try asking me to rewrite a section, fix formatting, or add specific content.'
        if (lowerMsg.includes('executive summary')) {
          reply = 'To modify the Executive Summary, scroll to that section in the editor and make your changes directly. You can also highlight text and use the toolbar to reformat it.'
        } else if (lowerMsg.includes('add') || lowerMsg.includes('insert')) {
          reply = 'Place your cursor where you\'d like to insert content, then type directly in the editor. Use the toolbar to add tables, images, or formatted text.'
        } else if (lowerMsg.includes('fix') || lowerMsg.includes('correct')) {
          reply = 'I\'ve noted your correction request. Please highlight the specific text in the editor and make the fix directly, or describe exactly what needs to change.'
        }
        setChatMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m available to help with report editing. You can edit the document directly using the toolbar, or ask me specific questions about the report content.',
      }])
    }
    setChatLoading(false)
  }, [chatInput, editor, chatMessages])

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

  if (!editor) return null

  return (
    <div className="fixed inset-0 z-[1100] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Main editor area */}
      <div className={`relative flex flex-col bg-gray-100 transition-all duration-300 ${showChat ? 'w-[calc(100%-380px)]' : 'w-full'}`}>
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
              onClick={() => setShowChat(!showChat)}
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
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <i className="fas fa-robot text-accent text-sm"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Report Assistant</h3>
                <p className="text-[10px] text-steel">Ask me to edit or improve your report</p>
              </div>
            </div>
            <button onClick={() => setShowChat(false)} className="text-steel hover:text-gray-900 transition-colors">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-comments text-accent text-lg"></i>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Report Assistant</p>
                <p className="text-xs text-steel mb-4">I can help you edit and improve your report.</p>
                <div className="space-y-2">
                  {[
                    'Rewrite the executive summary',
                    'Make the tone more formal',
                    'Add a section about risk assessment',
                    'Summarize the overdue items',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => { setChatInput(suggestion); }}
                      className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs text-gray-700 transition-colors"
                    >
                      <i className="fas fa-lightbulb text-accent mr-2"></i>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-3 py-2 rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
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
                placeholder="Ask about or edit the report…"
                className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
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
        .report-editor-content th { background: #007AFF; color: #fff; font-weight: 600; }
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
