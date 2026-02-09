'use client'

import { useState, useEffect } from 'react'
import { AOLWindow } from './AOLWindow'
import { supabase, Room, isSupabaseConfigured } from '@/lib/supabase'

interface PublicRoom {
  id: string
  name: string
  category: string
  userCount: number
}

interface PrivateRoomEntry {
  room: Room
  userCount: number
}

interface RoomListWindowProps {
  username: string
  currentRoom: string
  onJoinRoom: (roomName: string, roomData?: Room) => void
  onClose: () => void
}

const DEFAULT_ROOMS: PublicRoom[] = [
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

const CATEGORIES = ['All', 'General', 'Lifestyle', 'Entertainment', 'Sports', 'Computers', 'My Private Rooms']

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function RoomListWindow({ username, currentRoom, onJoinRoom, onClose }: RoomListWindowProps) {
  const [rooms, setRooms] = useState<PublicRoom[]>(DEFAULT_ROOMS)
  const [privateRooms, setPrivateRooms] = useState<PrivateRoomEntry[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [isPrivateRoom, setIsPrivateRoom] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState<{ inviteCode: string; roomName: string } | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)

  // Fetch room user counts and private rooms
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const fetchData = async () => {
      // Fetch user counts
      const { data: usersData } = await supabase.from('online_users').select('current_room')
      const counts: Record<string, number> = {}
      if (usersData) {
        usersData.forEach(u => {
          const room = u.current_room || 'Town Square'
          counts[room] = (counts[room] || 0) + 1
        })
        setRooms(prev => prev.map(r => ({
          ...r,
          userCount: counts[r.name] || 0
        })))
      }

      // Fetch user's private rooms
      const { data: memberships } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('username', username)

      if (memberships && memberships.length > 0) {
        const roomIds = memberships.map(m => m.room_id)
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('*')
          .in('id', roomIds)

        if (roomsData) {
          setPrivateRooms(roomsData.map((r: Room) => ({
            room: r,
            userCount: counts[`room:${r.id}`] || 0
          })))
        }
      }
    }

    fetchData()

    const channel = supabase
      .channel('room-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_users' }, fetchData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [username])

  const filteredRooms = selectedCategory === 'All'
    ? rooms
    : selectedCategory === 'My Private Rooms'
    ? []
    : rooms.filter(r => r.category === selectedCategory)

  const showPrivateRooms = selectedCategory === 'All' || selectedCategory === 'My Private Rooms'

  const handleJoin = () => {
    if (!selectedRoom) {
      const room = filteredRooms[0]?.name
      if (room) onJoinRoom(room)
      return
    }
    // Check if it's a private room
    if (selectedRoom.startsWith('room:')) {
      const roomId = selectedRoom.replace('room:', '')
      const entry = privateRooms.find(pr => pr.room.id === roomId)
      if (entry) {
        onJoinRoom(selectedRoom, entry.room)
      }
    } else {
      onJoinRoom(selectedRoom)
    }
  }

  const handleCreateRoom = async () => {
    const name = newRoomName.trim()
    if (!name) return

    if (isPrivateRoom && isSupabaseConfigured()) {
      const inviteCode = generateInviteCode()

      const { data: roomData, error } = await supabase
        .from('rooms')
        .insert({
          name,
          invite_code: inviteCode,
          created_by: username,
          is_private: true,
        })
        .select()
        .single()

      if (error || !roomData) return

      // Add creator as member
      await supabase.from('room_members').insert({
        room_id: roomData.id,
        username,
      })

      const room = roomData as Room

      // Add to private rooms list
      setPrivateRooms(prev => [...prev, { room, userCount: 0 }])

      setNewRoomName('')
      setIsPrivateRoom(false)
      setShowCreateRoom(false)

      // Show invite dialog
      setShowInviteDialog({ inviteCode, roomName: name })

      // Join the room
      onJoinRoom(`room:${room.id}`, room)
    } else {
      // Public room (existing behavior)
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
  }

  const handleCopyInvite = (inviteCode: string) => {
    const url = `${window.location.origin}/invite/${inviteCode}`
    navigator.clipboard.writeText(url)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
      <AOLWindow title="AOL Chat Rooms" width="450px" onClose={onClose}>
        <div className="flex flex-col" style={{ height: '400px' }}>
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
                  {cat === 'My Private Rooms' ? `🔒 ${cat}` : cat}
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
                    {/* Public rooms */}
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

                    {/* Private rooms section */}
                    {showPrivateRooms && privateRooms.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={2} className="px-2 py-1 bg-[#c0c0c0] font-bold text-xs border-y border-[#808080]">
                            🔒 My Private Rooms
                          </td>
                        </tr>
                        {privateRooms.map(({ room, userCount }) => {
                          const roomKey = `room:${room.id}`
                          return (
                            <tr
                              key={room.id}
                              className={`cursor-pointer ${
                                selectedRoom === roomKey
                                  ? 'bg-[#000080] text-white'
                                  : roomKey === currentRoom
                                  ? 'bg-blue-100'
                                  : 'hover:bg-blue-50'
                              }`}
                              onClick={() => setSelectedRoom(roomKey)}
                              onDoubleClick={() => onJoinRoom(roomKey, room)}
                            >
                              <td className="px-2 py-1">
                                {roomKey === currentRoom ? '→ ' : ''}🔒 {room.name}
                              </td>
                              <td className="text-center px-2 py-1">
                                {userCount}
                              </td>
                            </tr>
                          )
                        })}
                      </>
                    )}

                    {selectedCategory === 'My Private Rooms' && privateRooms.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-2 py-3 text-center text-gray-500">
                          No private rooms yet. Create one!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="p-1 text-xs border-t border-[#808080] bg-[#c0c0c0]">
            Double-click a room to join • Current: {currentRoom.startsWith('room:') ? (privateRooms.find(pr => `room:${pr.room.id}` === currentRoom)?.room.name || 'Private Room') : currentRoom}
          </div>
        </div>
      </AOLWindow>

      {/* Create Room Dialog */}
      {showCreateRoom && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black/30">
          <AOLWindow title="Create Chat Room" width="300px" onClose={() => { setShowCreateRoom(false); setIsPrivateRoom(false) }}>
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="private-room"
                  checked={isPrivateRoom}
                  onChange={(e) => setIsPrivateRoom(e.target.checked)}
                />
                <label htmlFor="private-room" className="text-xs cursor-pointer">
                  🔒 Private (invite only)
                </label>
              </div>
              {isPrivateRoom && (
                <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 p-2">
                  A unique invite link will be generated. Only users with the link can join.
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button className="win95-btn" onClick={() => { setShowCreateRoom(false); setIsPrivateRoom(false) }}>Cancel</button>
                <button className="win95-btn" onClick={handleCreateRoom}>Create</button>
              </div>
            </div>
          </AOLWindow>
        </div>
      )}

      {/* Invite Link Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[70] bg-black/30">
          <AOLWindow title="Invite Link" width="350px" onClose={() => setShowInviteDialog(null)}>
            <div className="p-3 space-y-3">
              <p className="text-xs">
                Your private room <strong>&quot;{showInviteDialog.roomName}&quot;</strong> has been created!
              </p>
              <p className="text-xs">Share this link to invite friends:</p>
              <div className="win95-input p-2 text-xs break-all select-all bg-white">
                {typeof window !== 'undefined' ? `${window.location.origin}/invite/${showInviteDialog.inviteCode}` : ''}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="win95-btn"
                  onClick={() => handleCopyInvite(showInviteDialog.inviteCode)}
                >
                  {inviteCopied ? 'Copied!' : 'Copy Link'}
                </button>
                <button className="win95-btn" onClick={() => setShowInviteDialog(null)}>
                  OK
                </button>
              </div>
            </div>
          </AOLWindow>
        </div>
      )}
    </div>
  )
}
