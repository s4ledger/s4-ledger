import { useState, useRef, useCallback, useEffect, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Initial width class or px — overridden once user resizes */
  defaultWidth?: number
  defaultHeight?: number
  minWidth?: number
  minHeight?: number
  /** If true, start centered on screen */
  centered?: boolean
  /** Extra classes on the inner panel */
  className?: string
  /** zIndex for the backdrop */
  zIndex?: number
}

/**
 * A wrapper that makes any modal draggable (by its header area)
 * and resizable (via a corner handle). Works with the existing
 * modal-backdrop pattern.
 *
 * Usage:
 *   <DraggableModal>
 *     <div className="your-modal-panel">…</div>
 *   </DraggableModal>
 *
 * The FIRST child element that has [data-drag-handle] will be the
 * drag handle. If none is found, the entire top 48px is draggable.
 */
export default function DraggableModal({
  children,
  defaultWidth,
  defaultHeight,
  minWidth = 320,
  minHeight = 200,
  centered = true,
  className = '',
  zIndex = 1000,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Position state — null means "centered"
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  // Size state — null means "use natural/default size"
  const [size, setSize] = useState<{ w: number; h: number } | null>(
    defaultWidth && defaultHeight ? { w: defaultWidth, h: defaultHeight } : null
  )

  // Drag state
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const posStart = useRef({ x: 0, y: 0 })

  // Resize state
  const resizing = useRef(false)
  const resizeStart = useRef({ x: 0, y: 0 })
  const sizeStart = useRef({ w: 0, h: 0 })

  // Initialize centered position on mount
  useEffect(() => {
    if (centered && !pos && containerRef.current) {
      const el = containerRef.current
      const rect = el.getBoundingClientRect()
      setPos({
        x: Math.max(0, (window.innerWidth - rect.width) / 2),
        y: Math.max(0, (window.innerHeight - rect.height) / 2),
      })
    }
  }, [centered, pos])

  /* ─── Drag handlers ─────────────────────────────────────────── */
  const onDragStart = useCallback((e: React.MouseEvent) => {
    // Only start drag from header area or [data-drag-handle]
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('select') || target.closest('[data-no-drag]')) return

    e.preventDefault()
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    const el = containerRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      posStart.current = pos || { x: rect.left, y: rect.top }
    }
  }, [pos])

  const onDragMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 100, posStart.current.x + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 50, posStart.current.y + dy)),
    })
  }, [])

  const onDragEnd = useCallback(() => {
    dragging.current = false
  }, [])

  /* ─── Resize handlers ──────────────────────────────────────── */
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = true
    resizeStart.current = { x: e.clientX, y: e.clientY }
    const el = containerRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      sizeStart.current = { w: rect.width, h: rect.height }
    }
  }, [])

  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing.current) return
    const dx = e.clientX - resizeStart.current.x
    const dy = e.clientY - resizeStart.current.y
    setSize({
      w: Math.max(minWidth, sizeStart.current.w + dx),
      h: Math.max(minHeight, sizeStart.current.h + dy),
    })
  }, [minWidth, minHeight])

  const onResizeEnd = useCallback(() => {
    resizing.current = false
  }, [])

  /* ─── Global mouse listeners ────────────────────────────────── */
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      onDragMove(e)
      onResizeMove(e)
    }
    const handleUp = () => {
      onDragEnd()
      onResizeEnd()
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [onDragMove, onResizeMove, onDragEnd, onResizeEnd])

  const style: React.CSSProperties = {
    position: 'fixed',
    ...(pos ? { left: pos.x, top: pos.y } : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }),
    ...(size ? { width: size.w, height: size.h } : {}),
    zIndex: zIndex + 1,
    maxHeight: '95vh',
    maxWidth: '95vw',
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm"
      style={{ zIndex }}
    >
      <div
        ref={containerRef}
        className={`flex flex-col overflow-hidden ${className}`}
        style={style}
      >
        {/* Drag handle: top bar */}
        <div
          className="h-1.5 cursor-move bg-gradient-to-r from-transparent via-steel/20 to-transparent hover:via-accent/30 transition-colors flex-shrink-0"
          onMouseDown={onDragStart}
          title="Drag to move"
        />
        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0">
          {children}
        </div>
        {/* Resize handle: bottom-right corner */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize group"
          onMouseDown={onResizeStart}
          title="Drag to resize"
        >
          <svg className="w-3 h-3 absolute bottom-1 right-1 text-steel/30 group-hover:text-accent/50 transition-colors" viewBox="0 0 12 12">
            <path d="M11 1v10H1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M11 5v6H5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M11 9v2H9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
