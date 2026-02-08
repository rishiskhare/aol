'use client'

import { useState, useEffect } from 'react'
import { useAOL } from '@/lib/store'
import { DraggableWindow } from './DraggableWindow'
import { supabase, User, isSupabaseConfigured } from '@/lib/supabase'

interface PeopleHereWindowProps {
  onOpenIM: (username: string) => void
  onViewProfile: (username: string) => void
  onSignOut: () => void
}

export function PeopleHereWindow({ onOpenIM, onViewProfile, onSignOut }: PeopleHereWindowProps) {
  const { closeWindow, username, openWindow } = useAOL()
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setOnlineUsers([{ username, joined_at: new Date().toISOString() }])
      return
    }

    const fetchUsers = async () => {
      const { data } = await supabase
        .from('online_users')
        .select('*')
        .order('joined_at', { ascending: true })

      if (data) {
        setOnlineUsers(data)
      }
    }

    fetchUsers()

    const channel = supabase
      .channel('people-here')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_users' }, fetchUsers)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [username])

  const handleUserClick = (user: User) => {
    setSelectedUser(user.username)
  }

  const handleDoubleClick = (user: User) => {
    if (user.username !== username) {
      onOpenIM(user.username)
    }
  }

  return (
    <DraggableWindow
      id="people-here"
      title="People Here"
      width={160}
      height={600}
      initialPosition={{ x: 920, y: 10 }}
      onClose={() => closeWindow('people-here')}
    >
      <div className="flex flex-col h-full p-1">
        <div className="text-xs mb-1 text-gray-600">
          {onlineUsers.length} people in room
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto bg-white border-2 mb-2" style={{ borderColor: '#808080 #fff #fff #808080' }}>
          {onlineUsers.map((user) => (
            <div
              key={user.username}
              className={`flex items-center gap-2 p-1 cursor-pointer text-xs ${
                selectedUser === user.username ? 'bg-[#000080] text-white' : 'hover:bg-blue-100'
              } ${user.username === username ? 'font-bold' : ''}`}
              onClick={() => handleUserClick(user)}
              onDoubleClick={() => handleDoubleClick(user)}
            >
              <BuddyIcon username={user.username} isAway={!!user.away_message} />
              <span className={user.away_message ? 'opacity-60' : ''}>
                {user.username}
              </span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-1">
          <button
            className="win95-btn text-xs"
            onClick={() => {
              const target = selectedUser || onlineUsers.find(u => u.username !== username)?.username
              if (target) onViewProfile(target)
            }}
          >
            Get Profile
          </button>
          <button
            className="win95-btn text-xs"
            onClick={() => {
              const target = selectedUser || onlineUsers.find(u => u.username !== username)?.username
              if (target && target !== username) onOpenIM(target)
            }}
          >
            Send IM
          </button>
          <button className="win95-btn text-xs">
            Ignore
          </button>
          <div className="win95-separator" />
          <button
            className="win95-btn text-xs"
            onClick={() => openWindow({
              id: 'away',
              type: 'away',
              title: 'Away Message',
              isMinimized: false,
              position: { x: 200, y: 150 },
              size: { width: 300, height: 280 }
            })}
          >
            Set Away
          </button>
          <button className="win95-btn text-xs" onClick={onSignOut}>
            Sign Off
          </button>
        </div>
      </div>
    </DraggableWindow>
  )
}

function BuddyIcon({ username, isAway }: { username: string; isAway?: boolean }) {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  const colorIndex = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length

  return (
    <div
      className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold"
      style={{
        backgroundColor: isAway ? '#999' : colors[colorIndex],
        border: '1px solid rgba(0,0,0,0.2)'
      }}
    >
      {username[0].toUpperCase()}
    </div>
  )
}
