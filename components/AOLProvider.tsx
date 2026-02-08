'use client'

import { useState, useCallback, useEffect, ReactNode } from 'react'
import {
  AOLContext,
  WindowState,
  Buddy,
  BlockedUser,
  UserWarning,
  Preferences,
  defaultPreferences,
  ChatRoom
} from '@/lib/store'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface AOLProviderProps {
  children: ReactNode
  username: string
}

export function AOLProvider({ children, username }: AOLProviderProps) {
  const [windows, setWindows] = useState<WindowState[]>([])
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const [nextZIndex, setNextZIndex] = useState(100)
  const [buddies, setBuddies] = useState<Buddy[]>([])
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [warnings, setWarnings] = useState<UserWarning[]>([])
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [currentRoom, setCurrentRoom] = useState('Town Square')
  const [availableRooms, setAvailableRooms] = useState<ChatRoom[]>([
    { id: '1', name: 'Town Square', category: 'General', userCount: 0, maxUsers: 50, createdBy: 'AOL', isPrivate: false },
    { id: '2', name: 'Teen Chat', category: 'General', userCount: 0, maxUsers: 30, createdBy: 'AOL', isPrivate: false },
    { id: '3', name: 'Romance', category: 'Lifestyle', userCount: 0, maxUsers: 30, createdBy: 'AOL', isPrivate: false },
    { id: '4', name: 'Gaming', category: 'Entertainment', userCount: 0, maxUsers: 40, createdBy: 'AOL', isPrivate: false },
    { id: '5', name: 'Music', category: 'Entertainment', userCount: 0, maxUsers: 40, createdBy: 'AOL', isPrivate: false },
  ])

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aol_preferences')
    if (saved) {
      try {
        setPreferences({ ...defaultPreferences, ...JSON.parse(saved) })
      } catch {
        // ignore
      }
    }

    const savedBuddies = localStorage.getItem('aol_buddies')
    if (savedBuddies) {
      try {
        setBuddies(JSON.parse(savedBuddies))
      } catch {
        // ignore
      }
    }

    const savedBlocked = localStorage.getItem('aol_blocked')
    if (savedBlocked) {
      try {
        setBlockedUsers(JSON.parse(savedBlocked))
      } catch {
        // ignore
      }
    }
  }, [])

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('aol_preferences', JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    localStorage.setItem('aol_buddies', JSON.stringify(buddies))
  }, [buddies])

  useEffect(() => {
    localStorage.setItem('aol_blocked', JSON.stringify(blockedUsers))
  }, [blockedUsers])

  // Fetch room user counts
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const fetchRoomCounts = async () => {
      const { data } = await supabase
        .from('online_users')
        .select('*')

      if (data) {
        // For now, all users are in the same room
        setAvailableRooms(prev => prev.map(room => ({
          ...room,
          userCount: room.name === currentRoom ? data.length : room.userCount
        })))
      }
    }

    fetchRoomCounts()
  }, [currentRoom])

  // Window management
  const openWindow = useCallback((window: Omit<WindowState, 'zIndex'>) => {
    setWindows(prev => {
      // Check if window already exists
      const existing = prev.find(w => w.id === window.id)
      if (existing) {
        // Just focus it
        return prev.map(w => ({
          ...w,
          isMinimized: w.id === window.id ? false : w.isMinimized,
          zIndex: w.id === window.id ? nextZIndex : w.zIndex
        }))
      }
      return [...prev, { ...window, zIndex: nextZIndex }]
    })
    setActiveWindowId(window.id)
    setNextZIndex(prev => prev + 1)
  }, [nextZIndex])

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id))
    setActiveWindowId(prev => prev === id ? null : prev)
  }, [])

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, isMinimized: true } : w
    ))
  }, [])

  const restoreWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w
    ))
    setActiveWindowId(id)
    setNextZIndex(prev => prev + 1)
  }, [nextZIndex])

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, zIndex: nextZIndex } : w
    ))
    setActiveWindowId(id)
    setNextZIndex(prev => prev + 1)
  }, [nextZIndex])

  const updateWindowPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, position } : w
    ))
  }, [])

  // Buddy management
  const addBuddy = useCallback((buddyUsername: string, category: string) => {
    setBuddies(prev => {
      if (prev.find(b => b.username === buddyUsername)) return prev
      return [...prev, {
        username: buddyUsername,
        category,
        isOnline: false,
        isAway: false
      }]
    })
  }, [])

  const removeBuddy = useCallback((buddyUsername: string) => {
    setBuddies(prev => prev.filter(b => b.username !== buddyUsername))
  }, [])

  // Block management
  const blockUser = useCallback((blockedUsername: string) => {
    setBlockedUsers(prev => {
      if (prev.find(b => b.username === blockedUsername)) return prev
      return [...prev, { username: blockedUsername, blockedAt: new Date().toISOString() }]
    })
  }, [])

  const unblockUser = useCallback((blockedUsername: string) => {
    setBlockedUsers(prev => prev.filter(b => b.username !== blockedUsername))
  }, [])

  const isBlocked = useCallback((checkUsername: string) => {
    return blockedUsers.some(b => b.username === checkUsername)
  }, [blockedUsers])

  // Warning management
  const warnUser = useCallback((warnedUsername: string) => {
    setWarnings(prev => {
      const existing = prev.find(w => w.username === warnedUsername)
      if (existing) {
        return prev.map(w =>
          w.username === warnedUsername
            ? { ...w, level: Math.min(100, w.level + 20) }
            : w
        )
      }
      return [...prev, { username: warnedUsername, level: 20 }]
    })
  }, [])

  const getWarningLevel = useCallback((checkUsername: string) => {
    return warnings.find(w => w.username === checkUsername)?.level || 0
  }, [warnings])

  // Preferences
  const updatePreferences = useCallback((prefs: Partial<Preferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }))
  }, [])

  return (
    <AOLContext.Provider value={{
      windows,
      activeWindowId,
      openWindow,
      closeWindow,
      minimizeWindow,
      restoreWindow,
      focusWindow,
      updateWindowPosition,
      buddies,
      addBuddy,
      removeBuddy,
      blockedUsers,
      blockUser,
      unblockUser,
      isBlocked,
      warnings,
      warnUser,
      getWarningLevel,
      preferences,
      updatePreferences,
      username,
      currentRoom,
      setCurrentRoom,
      availableRooms
    }}>
      {children}
    </AOLContext.Provider>
  )
}
