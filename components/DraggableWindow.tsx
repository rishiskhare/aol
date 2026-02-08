'use client'

import { ReactNode, useRef, useState, useEffect, useCallback } from 'react'
import { useAOL } from '@/lib/store'

interface DraggableWindowProps {
  id: string
  title: string
  children: ReactNode
  width?: number
  height?: number
  initialPosition?: { x: number; y: number }
  onClose?: () => void
  resizable?: boolean
  className?: string
}

export function DraggableWindow({
  id,
  title,
  children,
  width = 400,
  height = 300,
  initialPosition,
  onClose,
  resizable = false,
  className = ''
}: DraggableWindowProps) {
  const { focusWindow, minimizeWindow, updateWindowPosition, activeWindowId, windows } = useAOL()
  const windowRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ isDragging: false, offsetX: 0, offsetY: 0 })
  const [size, setSize] = useState({ width, height })
  const [isMaximized, setIsMaximized] = useState(false)
  const [preMaximizeState, setPreMaximizeState] = useState({ position: { x: 0, y: 0 }, size: { width: 0, height: 0 } })

  const windowState = windows.find(w => w.id === id)
  const isActive = activeWindowId === id
  const isMinimized = windowState?.isMinimized || false
  const zIndex = windowState?.zIndex || 100

  // Use size from window state if available, otherwise fall back to props
  const actualWidth = windowState?.size?.width || width
  const actualHeight = windowState?.size?.height || height

  // Set initial position directly on mount
  useEffect(() => {
    if (windowRef.current) {
      const pos = windowState?.position || initialPosition
      if (pos) {
        windowRef.current.style.left = `${pos.x}px`
        windowRef.current.style.top = `${pos.y}px`
      }
    }
  }, [])

  // Update size when window state changes
  useEffect(() => {
    if (windowState?.size) {
      setSize({ width: windowState.size.width, height: windowState.size.height })
    }
  }, [windowState?.size])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-controls')) return
    focusWindow(id)

    const rect = windowRef.current?.getBoundingClientRect()
    if (rect) {
      dragRef.current = {
        isDragging: true,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top
      }
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    }
  }, [focusWindow, id])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging || !windowRef.current) return

      const newX = Math.max(0, Math.min(globalThis.innerWidth - 100, e.clientX - dragRef.current.offsetX))
      const newY = Math.max(0, Math.min(globalThis.innerHeight - 50, e.clientY - dragRef.current.offsetY))

      // Direct DOM manipulation for smooth dragging
      windowRef.current.style.left = `${newX}px`
      windowRef.current.style.top = `${newY}px`
    }

    const handleMouseUp = () => {
      if (dragRef.current.isDragging && windowRef.current) {
        dragRef.current.isDragging = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''

        // Save final position to store
        const rect = windowRef.current.getBoundingClientRect()
        updateWindowPosition(id, { x: rect.left, y: rect.top })
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [id, updateWindowPosition])

  const handleMinimize = () => {
    minimizeWindow(id)
  }

  const handleMaximize = () => {
    if (!windowRef.current) return

    if (isMaximized) {
      windowRef.current.style.left = `${preMaximizeState.position.x}px`
      windowRef.current.style.top = `${preMaximizeState.position.y}px`
      setSize(preMaximizeState.size)
      setIsMaximized(false)
    } else {
      const rect = windowRef.current.getBoundingClientRect()
      setPreMaximizeState({ position: { x: rect.left, y: rect.top }, size })
      windowRef.current.style.left = '0px'
      windowRef.current.style.top = '0px'
      setSize({ width: globalThis.innerWidth, height: globalThis.innerHeight - 40 })
      setIsMaximized(true)
    }
  }

  const handleClose = () => {
    onClose?.()
  }

  if (isMinimized) return null

  return (
    <div
      ref={windowRef}
      className={`fixed win95-window flex flex-col ${className}`}
      style={{
        left: initialPosition?.x ?? 100,
        top: initialPosition?.y ?? 100,
        width: size.width,
        height: size.height,
        zIndex
      }}
      onClick={() => focusWindow(id)}
    >
      {/* Title Bar */}
      <div
        className={`win95-titlebar ${!isActive ? 'win95-titlebar-inactive' : ''}`}
        onMouseDown={handleMouseDown}
        style={{ cursor: 'grab' }}
      >
        <div className="flex items-center gap-2">
          <AOLIcon />
          <span className="truncate">{title}</span>
        </div>
        <div className="flex gap-0.5 window-controls">
          <button
            className="win95-btn-titlebar"
            onClick={handleMinimize}
            title="Minimize"
          >
            _
          </button>
          <button
            className="win95-btn-titlebar"
            onClick={handleMaximize}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? '❐' : '□'}
          </button>
          <button
            className="win95-btn-titlebar"
            onClick={handleClose}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Resize handle */}
      {resizable && !isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, #808080 50%, #808080 60%, transparent 60%, transparent 70%, #808080 70%)'
          }}
        />
      )}
    </div>
  )
}

function AOLIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#FFD700" stroke="#CC9900" strokeWidth="1"/>
      <path d="M5 11 L8 5 L11 11" stroke="#000080" strokeWidth="1.5" fill="none"/>
      <circle cx="8" cy="12" r="1" fill="#000080"/>
    </svg>
  )
}
