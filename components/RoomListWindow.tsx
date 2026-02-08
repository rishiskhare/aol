'use client'

import { useState, useEffect } from 'react'
import { AOLWindow } from './AOLWindow'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface ChatRoom {
  id: string
  name: string
  category: string
  userCount: number
}

interface RoomListWindowProps {
  currentRoom: string
  onJoinRoom: (roomName: string) => void
  onClose: () => void
}

const DEFAULT_ROOMS: ChatRoom[] = [
  { id: '1', name: 'Town Square', category: 'General', userCount: 0 },
  { id: '2', name: 'Teen Chat', category: 'General', userCount: 0 },
  { id: '3', name: 'Thirty Something', category: 'General', userCount: 0 },
  { id: '4', name: 'Romance', category: 'Lifestyle', userCount: 0 },
  { id: '5', name: 'Singles', category: 'Lifestyle', userCount: 0 },
  { id: '6', name: 'Gaming', category: 'Entertainment', userCount: 0 },
  { id: '7', name: 'Music', category: 'Entertainment', userCount: 0 },
  { id: '8', name: 'Movies', category: 'Entertainment', userCount: 0 },
  { id: '9', name: 'Sports', category: 'Sports', userCount: 0 },
  { id: '10', name: 'Tech Talk', category: 'Computers', userCount: 0 },
]

const CATEGORIES = ['All', 'General', 'Lifestyle', 'Entertainment', 'Sports', 'Computers']

export function RoomListWindow({ currentRoom, onJoinRoom, onClose }: RoomListWindowProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>(DEFAULT_ROOMS)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')

  // Fetch room user counts
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const fetchCounts = async () => {
      const { data } = await supabase.from('online_users').select('current_room')
      if (data) {
        const counts: Record<string, number> = {}
        data.forEach(u => {
          const room = u.current_room || 'Town Square'
          counts[room] = (counts[room] || 0) + 1
        })
        setRooms(prev => prev.map(r => ({
          ...r,
          userCount: counts[r.name] || 0
        })))
      }
    }

    fetchCounts()

    const channel = supabase
      .channel('room-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_users' }, fetchCounts)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredRooms = selectedCategory === 'All'
    ? rooms
    : rooms.filter(r => r.category === selectedCategory)

  const handleJoin = () => {
    const room = selectedRoom || filteredRooms[0]?.name
    if (room) {
      onJoinRoom(room)
    }
  }

  const handleCreateRoom = () => {
    const name = newRoomName.trim()
    if (!name) return
    if (rooms.some(r => r.name.toLowerCase() === name.toLowerCase())) return

    setRooms(prev => [...prev, {
      id: `custom-${Date.now()}`,
      name,
      category: 'General',
      userCount: 0
    }])
    setNewRoomName('')
    setShowCreateRoom(false)
    onJoinRoom(name)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
      <AOLWindow title="AOL Chat Rooms" width="450px" onClose={onClose}>
        <div className="flex flex-col" style={{ height: '350px' }}>
          {/* Toolbar */}
          <div className="flex items-center gap-2 p-2 bg-[#c0c0c0] border-b border-[#808080]">
            <button className="win95-btn text-xs" onClick={handleJoin}>
              Go Chat
            </button>
            <button className="win95-btn text-xs" onClick={() => setShowCreateRoom(true)}>
              Create Room
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Category List */}
            <div className="w-28 border-r border-[#808080] bg-white overflow-y-auto">
              <div className="p-1 bg-[#000080] text-white text-xs font-bold">
                Categories
              </div>
              {CATEGORIES.map(cat => (
                <div
                  key={cat}
                  className={`px-2 py-1 text-xs cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#000080] text-white'
                      : 'hover:bg-blue-100'
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </div>
              ))}
            </div>

            {/* Room List */}
            <div className="flex-1 flex flex-col bg-white">
              <div className="p-1 bg-[#000080] text-white text-xs font-bold">
                Chat Rooms
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#c0c0c0] sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1 border-b border-[#808080]">Room Name</th>
                      <th className="text-center px-2 py-1 border-b border-[#808080] w-16">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.map(room => (
                      <tr
                        key={room.id}
                        className={`cursor-pointer ${
                          selectedRoom === room.name
                            ? 'bg-[#000080] text-white'
                            : room.name === currentRoom
                            ? 'bg-blue-100'
                            : 'hover:bg-blue-50'
                        }`}
                        onClick={() => setSelectedRoom(room.name)}
                        onDoubleClick={() => onJoinRoom(room.name)}
                      >
                        <td className="px-2 py-1">
                          {room.name === currentRoom ? '→ ' : ''}{room.name}
                        </td>
                        <td className="text-center px-2 py-1">
                          {room.userCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="p-1 text-xs border-t border-[#808080] bg-[#c0c0c0]">
            Double-click a room to join • Current: {currentRoom}
          </div>
        </div>
      </AOLWindow>

      {/* Create Room Dialog */}
      {showCreateRoom && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black/30">
          <AOLWindow title="Create Chat Room" width="280px" onClose={() => setShowCreateRoom(false)}>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-xs block mb-1">Room Name:</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="win95-input w-full"
                  placeholder="Enter room name..."
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button className="win95-btn" onClick={() => setShowCreateRoom(false)}>Cancel</button>
                <button className="win95-btn" onClick={handleCreateRoom}>Create</button>
              </div>
            </div>
          </AOLWindow>
        </div>
      )}
    </div>
  )
}
