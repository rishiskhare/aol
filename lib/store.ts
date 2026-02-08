'use client'

import { createContext, useContext } from 'react'

// Window management
export interface WindowState {
  id: string
  type: 'chat' | 'im' | 'buddylist' | 'profile' | 'preferences' | 'roomlist' | 'away'
  title: string
  isMinimized: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  data?: Record<string, unknown>
}

// Buddy management
export interface Buddy {
  username: string
  category: string
  isOnline: boolean
  isAway: boolean
  awayMessage?: string
}

// Preferences
export interface Preferences {
  soundEnabled: boolean
  notificationsEnabled: boolean
  showTimestamps: boolean
  fontSize: number
  fontFamily: string
  autoDetectLinks: boolean
  confirmClose: boolean
}

export const defaultPreferences: Preferences = {
  soundEnabled: true,
  notificationsEnabled: true,
  showTimestamps: true,
  fontSize: 12,
  fontFamily: 'MS Sans Serif',
  autoDetectLinks: true,
  confirmClose: true
}

// Chat room
export interface ChatRoom {
  id: string
  name: string
  category: string
  userCount: number
  maxUsers: number
  createdBy: string
  isPrivate: boolean
}

// Block list
export interface BlockedUser {
  username: string
  blockedAt: string
}

// Warning level
export interface UserWarning {
  username: string
  level: number // 0-100
}

// Context type
export interface AOLContextType {
  // Windows
  windows: WindowState[]
  activeWindowId: string | null
  openWindow: (window: Omit<WindowState, 'zIndex'>) => void
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  restoreWindow: (id: string) => void
  focusWindow: (id: string) => void
  updateWindowPosition: (id: string, position: { x: number; y: number }) => void

  // Buddies
  buddies: Buddy[]
  addBuddy: (username: string, category: string) => void
  removeBuddy: (username: string) => void

  // Block list
  blockedUsers: BlockedUser[]
  blockUser: (username: string) => void
  unblockUser: (username: string) => void
  isBlocked: (username: string) => boolean

  // Warnings
  warnings: UserWarning[]
  warnUser: (username: string) => void
  getWarningLevel: (username: string) => number

  // Preferences
  preferences: Preferences
  updatePreferences: (prefs: Partial<Preferences>) => void

  // Current user
  username: string

  // Rooms
  currentRoom: string
  setCurrentRoom: (room: string) => void
  availableRooms: ChatRoom[]
}

export const AOLContext = createContext<AOLContextType | null>(null)

export function useAOL() {
  const context = useContext(AOLContext)
  if (!context) {
    throw new Error('useAOL must be used within AOLProvider')
  }
  return context
}
