'use client'

import { useState, useEffect } from 'react'
import { AOLWindow } from './AOLWindow'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface Buddy {
  username: string
  addedAt: string
}

interface BuddyListWindowProps {
  currentUser: string
  onOpenIM: (username: string) => void
  onViewProfile: (username: string) => void
  onClose: () => void
}

export function BuddyListWindow({ currentUser, onOpenIM, onViewProfile, onClose }: BuddyListWindowProps) {
  const [buddies, setBuddies] = useState<Buddy[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [showAddBuddy, setShowAddBuddy] = useState(false)
  const [newBuddyName, setNewBuddyName] = useState('')
  const [selectedBuddy, setSelectedBuddy] = useState<string | null>(null)

  // Load buddies from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`aol_buddies_${currentUser}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Handle migration from old format with categories
        const migrated = parsed.map((b: Buddy & { category?: string }) => ({
          username: b.username,
          addedAt: b.addedAt
        }))
        setBuddies(migrated)
      } catch {
        // ignore
      }
    }
  }, [currentUser])

  // Save buddies to localStorage
  useEffect(() => {
    localStorage.setItem(`aol_buddies_${currentUser}`, JSON.stringify(buddies))
  }, [buddies, currentUser])

  // Fetch online users
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const fetchOnline = async () => {
      const { data } = await supabase.from('online_users').select('username')
      if (data) {
        setOnlineUsers(new Set(data.map(u => u.username)))
      }
    }

    fetchOnline()

    const channel = supabase
      .channel('buddylist-online')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_users' }, fetchOnline)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const addBuddy = () => {
    const name = newBuddyName.trim()
    if (!name || name === currentUser) return
    if (buddies.some(b => b.username.toLowerCase() === name.toLowerCase())) return

    setBuddies(prev => [...prev, {
      username: name,
      addedAt: new Date().toISOString()
    }])
    setNewBuddyName('')
    setShowAddBuddy(false)
  }

  const removeBuddy = (username: string) => {
    setBuddies(prev => prev.filter(b => b.username !== username))
    if (selectedBuddy === username) setSelectedBuddy(null)
  }

  // Sort buddies: online first, then alphabetically
  const sortedBuddies = [...buddies].sort((a, b) => {
    const aOnline = onlineUsers.has(a.username)
    const bOnline = onlineUsers.has(b.username)
    if (aOnline && !bOnline) return -1
    if (!aOnline && bOnline) return 1
    return a.username.localeCompare(b.username)
  })

  const onlineCount = buddies.filter(b => onlineUsers.has(b.username)).length

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <AOLWindow title="Buddy List" width="220px" onClose={onClose}>
        <div className="flex flex-col" style={{ height: '350px' }}>
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-1 bg-[#c0c0c0] border-b border-[#808080]">
            <button
              className="win95-btn text-xs"
              style={{ minWidth: 'auto', padding: '2px 8px' }}
              onClick={() => setShowAddBuddy(true)}
            >
              Add
            </button>
            <button
              className="win95-btn text-xs"
              style={{ minWidth: 'auto', padding: '2px 8px' }}
              onClick={() => selectedBuddy && removeBuddy(selectedBuddy)}
              disabled={!selectedBuddy}
            >
              Remove
            </button>
          </div>

          {/* Friends Header */}
          <div className="flex items-center gap-1 py-1 px-2 text-xs font-bold bg-[#e0e0e0] border-b border-[#808080]">
            <span>Friends ({onlineCount}/{buddies.length})</span>
          </div>

          {/* Friends List */}
          <div className="flex-1 overflow-y-auto bg-white m-1 border-2" style={{ borderColor: '#808080 #fff #fff #808080' }}>
            {sortedBuddies.length === 0 ? (
              <div className="text-xs text-gray-400 py-4 px-2 text-center italic">
                No friends added yet.<br />Click Add to add a friend.
              </div>
            ) : (
              sortedBuddies.map(buddy => {
                const isOnline = onlineUsers.has(buddy.username)
                return (
                  <div
                    key={buddy.username}
                    className={`flex items-center gap-2 py-1 px-2 cursor-pointer text-xs ${
                      selectedBuddy === buddy.username ? 'bg-[#000080] text-white' : 'hover:bg-blue-100'
                    } ${!isOnline ? 'text-gray-400' : ''}`}
                    onClick={() => setSelectedBuddy(buddy.username)}
                    onDoubleClick={() => isOnline && onOpenIM(buddy.username)}
                  >
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span>{buddy.username}</span>
                    {isOnline && <span className="ml-auto text-[10px] text-green-600">online</span>}
                  </div>
                )
              })
            )}
          </div>

          {/* Status */}
          <div className="p-1 text-xs text-center border-t border-[#808080]">
            {onlineCount}/{buddies.length} friends online
          </div>

          {/* Action Buttons */}
          <div className="p-1 flex gap-1">
            <button
              className="win95-btn text-xs flex-1"
              onClick={() => selectedBuddy && onlineUsers.has(selectedBuddy) && onOpenIM(selectedBuddy)}
              disabled={!selectedBuddy || !onlineUsers.has(selectedBuddy || '')}
            >
              IM
            </button>
            <button
              className="win95-btn text-xs flex-1"
              onClick={() => selectedBuddy && onViewProfile(selectedBuddy)}
              disabled={!selectedBuddy}
            >
              Info
            </button>
          </div>
        </div>
      </AOLWindow>

      {/* Add Buddy Dialog */}
      {showAddBuddy && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black/30">
          <AOLWindow title="Add Friend" width="250px" onClose={() => setShowAddBuddy(false)}>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-xs block mb-1">Screen Name:</label>
                <input
                  type="text"
                  value={newBuddyName}
                  onChange={(e) => setNewBuddyName(e.target.value)}
                  className="win95-input w-full"
                  placeholder="Enter username..."
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && addBuddy()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button className="win95-btn" onClick={() => setShowAddBuddy(false)}>Cancel</button>
                <button className="win95-btn" onClick={addBuddy}>Add</button>
              </div>
            </div>
          </AOLWindow>
        </div>
      )}
    </div>
  )
}
