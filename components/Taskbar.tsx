'use client'

import { useState, useEffect } from 'react'
import { useAOL } from '@/lib/store'

interface TaskbarProps {
  onSignOut: () => void
}

export function Taskbar({ onSignOut }: TaskbarProps) {
  const { windows, restoreWindow, focusWindow, activeWindowId, openWindow, username, currentRoom } = useAOL()
  const [showStartMenu, setShowStartMenu] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleWindowClick = (windowId: string, isMinimized: boolean) => {
    if (isMinimized) {
      restoreWindow(windowId)
    } else {
      focusWindow(windowId)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#c0c0c0] border-t-2 border-white flex items-center z-[9999]">
      {/* Start Button */}
      <div className="relative">
        <button
          className={`win95-btn h-6 mx-1 flex items-center gap-1 ${showStartMenu ? 'border-inset' : ''}`}
          style={{ minWidth: 'auto', padding: '2px 6px' }}
          onClick={() => setShowStartMenu(!showStartMenu)}
        >
          <AOLLogo />
          <span className="font-bold text-xs">AOL</span>
        </button>

        {/* Start Menu */}
        {showStartMenu && (
          <div
            className="absolute bottom-full left-1 mb-1 win95-window"
            style={{ width: '200px' }}
          >
            <div className="bg-[#000080] text-white p-2 text-xs font-bold writing-mode-vertical">
              <span>AOL 5.0</span>
            </div>
            <div className="py-1">
              <MenuItem
                icon="👥"
                label="Buddy List"
                onClick={() => {
                  openWindow({
                    id: 'buddylist',
                    type: 'buddylist',
                    title: 'Buddy List',
                    isMinimized: false,
                    position: { x: 50, y: 50 },
                    size: { width: 200, height: 400 }
                  })
                  setShowStartMenu(false)
                }}
              />
              <MenuItem
                icon="💬"
                label="Chat Rooms"
                onClick={() => {
                  openWindow({
                    id: 'roomlist',
                    type: 'roomlist',
                    title: 'AOL Chat Rooms',
                    isMinimized: false,
                    position: { x: 100, y: 80 },
                    size: { width: 400, height: 350 }
                  })
                  setShowStartMenu(false)
                }}
              />
              <MenuItem
                icon="✉️"
                label="Write Mail"
                onClick={() => setShowStartMenu(false)}
              />
              <div className="win95-separator mx-2" />
              <MenuItem
                icon="⚙️"
                label="Preferences"
                onClick={() => {
                  openWindow({
                    id: 'preferences',
                    type: 'preferences',
                    title: 'Preferences',
                    isMinimized: false,
                    position: { x: 150, y: 100 },
                    size: { width: 350, height: 300 }
                  })
                  setShowStartMenu(false)
                }}
              />
              <MenuItem
                icon="❓"
                label="Help"
                onClick={() => setShowStartMenu(false)}
              />
              <div className="win95-separator mx-2" />
              <MenuItem
                icon="🚪"
                label="Sign Off"
                onClick={() => {
                  setShowStartMenu(false)
                  onSignOut()
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Launch */}
      <div className="flex items-center gap-1 px-2 border-l border-[#808080] border-r border-white h-6">
        <QuickLaunchButton
          icon="👥"
          title="Buddy List"
          onClick={() => openWindow({
            id: 'buddylist',
            type: 'buddylist',
            title: 'Buddy List',
            isMinimized: false,
            position: { x: 50, y: 50 },
            size: { width: 200, height: 400 }
          })}
        />
        <QuickLaunchButton
          icon="💬"
          title="Chat"
          onClick={() => openWindow({
            id: 'chat-main',
            type: 'chat',
            title: `${currentRoom} - AOL Chat`,
            isMinimized: false,
            position: { x: 100, y: 50 },
            size: { width: 700, height: 500 }
          })}
        />
      </div>

      {/* Window Buttons */}
      <div className="flex-1 flex items-center gap-1 px-1 overflow-x-auto">
        {windows.map(window => (
          <button
            key={window.id}
            className={`win95-btn h-6 text-xs truncate flex items-center gap-1 ${
              window.id === activeWindowId && !window.isMinimized ? 'border-inset' : ''
            }`}
            style={{ minWidth: '120px', maxWidth: '160px', padding: '2px 6px' }}
            onClick={() => handleWindowClick(window.id, window.isMinimized)}
          >
            <span className="truncate">{window.title}</span>
          </button>
        ))}
      </div>

      {/* System Tray */}
      <div className="flex items-center gap-2 px-2 border-l border-[#808080] h-6">
        <span className="text-xs">{username}</span>
        <div className="win95-border-inset px-2 text-xs">
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showStartMenu && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setShowStartMenu(false)}
        />
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-1 hover:bg-[#000080] hover:text-white cursor-pointer text-xs"
      onClick={onClick}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

function QuickLaunchButton({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return (
    <button
      className="w-6 h-5 flex items-center justify-center hover:bg-[#dfdfdf] text-xs"
      title={title}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}

function AOLLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#FFD700" stroke="#CC9900" strokeWidth="1"/>
      <path d="M5 11 L8 5 L11 11" stroke="#000080" strokeWidth="1.5" fill="none"/>
      <circle cx="8" cy="12" r="1" fill="#000080"/>
    </svg>
  )
}
