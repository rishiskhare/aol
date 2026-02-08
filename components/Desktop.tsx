'use client'

import { useEffect } from 'react'
import { useAOL, WindowState } from '@/lib/store'
import { BuddyList } from './BuddyList'
import { RoomList } from './RoomList'
import { PreferencesWindow } from './PreferencesWindow'
import { AwayMessage } from './AwayMessage'
import { ChatRoomWindow } from './ChatRoomWindow'
import { IMWindowWrapper } from './IMWindowWrapper'
import { ProfileWindow } from './ProfileWindow'
import { PeopleHereWindow } from './PeopleHereWindow'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface DesktopProps {
  onSignOut: () => void
}

export function Desktop({ onSignOut }: DesktopProps) {
  const { windows, openWindow, username, closeWindow } = useAOL()

  // Register user as online
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const registerOnline = async () => {
      await supabase.from('online_users').upsert({
        username,
        last_seen: new Date().toISOString()
      })
    }

    registerOnline()

    const interval = setInterval(registerOnline, 30000)

    return () => {
      clearInterval(interval)
      supabase.from('online_users').delete().eq('username', username)
    }
  }, [username])

  // Open default windows on first load - matching the screenshot layout
  useEffect(() => {
    // Calculate window sizes based on viewport
    const viewportWidth = typeof globalThis !== 'undefined' && globalThis.innerWidth ? globalThis.innerWidth : 1200
    const viewportHeight = typeof globalThis !== 'undefined' && globalThis.innerHeight ? globalThis.innerHeight : 800

    const peopleWindowWidth = 160
    const chatWindowWidth = viewportWidth - peopleWindowWidth - 30
    const windowHeight = viewportHeight - 20

    // Open main chat window on the left (takes most of the screen)
    openWindow({
      id: 'chat-main',
      type: 'chat',
      title: 'Town Square - AOL Chat',
      isMinimized: false,
      position: { x: 10, y: 10 },
      size: { width: chatWindowWidth, height: windowHeight }
    })

    // Open People Here window on the right
    openWindow({
      id: 'people-here',
      type: 'roomlist', // reusing type for rendering
      title: 'People Here',
      isMinimized: false,
      position: { x: chatWindowWidth + 20, y: 10 },
      size: { width: peopleWindowWidth, height: windowHeight }
    })
  }, [openWindow])

  const handleOpenIM = (recipient: string) => {
    openWindow({
      id: `im-${recipient}`,
      type: 'im',
      title: `IM - ${recipient}`,
      isMinimized: false,
      position: { x: 300 + Math.random() * 100, y: 100 + Math.random() * 100 },
      size: { width: 400, height: 350 },
      data: { recipient }
    })
  }

  const handleViewProfile = (targetUsername: string) => {
    openWindow({
      id: `profile-${targetUsername}`,
      type: 'profile',
      title: `${targetUsername}'s Profile`,
      isMinimized: false,
      position: { x: 200 + Math.random() * 100, y: 80 + Math.random() * 100 },
      size: { width: 400, height: 400 },
      data: { targetUsername }
    })
  }

  const renderWindow = (window: WindowState) => {
    switch (window.type) {
      case 'buddylist':
        return (
          <BuddyList
            key={window.id}
            onOpenIM={handleOpenIM}
            onViewProfile={handleViewProfile}
          />
        )
      case 'roomlist':
        if (window.id === 'people-here') {
          return (
            <PeopleHereWindow
              key={window.id}
              onOpenIM={handleOpenIM}
              onViewProfile={handleViewProfile}
              onSignOut={onSignOut}
            />
          )
        }
        return <RoomList key={window.id} />
      case 'preferences':
        return <PreferencesWindow key={window.id} />
      case 'away':
        return <AwayMessage key={window.id} />
      case 'chat':
        return (
          <ChatRoomWindow
            key={window.id}
            windowId={window.id}
            onOpenIM={handleOpenIM}
            onViewProfile={handleViewProfile}
          />
        )
      case 'im':
        return (
          <IMWindowWrapper
            key={window.id}
            windowId={window.id}
            recipient={(window.data?.recipient as string) || ''}
          />
        )
      case 'profile':
        return (
          <ProfileWindow
            key={window.id}
            username={(window.data?.targetUsername as string) || ''}
            isOwnProfile={(window.data?.targetUsername as string) === username}
            onClose={() => closeWindow(window.id)}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#008080] overflow-hidden">
      {/* Windows */}
      {windows.map(renderWindow)}
    </div>
  )
}
