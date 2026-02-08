'use client'

import { ReactNode } from 'react'

interface AOLWindowProps {
  title: string
  children: ReactNode
  width?: string
  height?: string
  onClose?: () => void
  className?: string
}

export function AOLWindow({
  title,
  children,
  width = 'auto',
  height = 'auto',
  onClose,
  className = ''
}: AOLWindowProps) {
  return (
    <div
      className={`win95-window flex flex-col ${className}`}
      style={{ width, height }}
    >
      {/* Title Bar */}
      <div className="win95-titlebar">
        <div className="flex items-center gap-2">
          <AOLIcon />
          <span>{title}</span>
        </div>
        <div className="flex gap-1">
          <button className="win95-btn-titlebar" title="Minimize">_</button>
          <button className="win95-btn-titlebar" title="Maximize">□</button>
          <button
            className="win95-btn-titlebar"
            title="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {children}
      </div>
    </div>
  )
}

function AOLIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#FFD700" stroke="#CC9900" strokeWidth="1"/>
      <path d="M5 10 L8 5 L11 10" stroke="#000080" strokeWidth="2" fill="none"/>
      <circle cx="8" cy="11" r="1" fill="#000080"/>
    </svg>
  )
}
