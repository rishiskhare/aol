'use client'

import { useState } from 'react'
import { useAOL } from '@/lib/store'
import { DraggableWindow } from './DraggableWindow'

export function RoomList() {
  const { closeWindow, availableRooms, currentRoom, setCurrentRoom, openWindow } = useAOL()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomCategory, setNewRoomCategory] = useState('General')

  const categories = ['All', 'General', 'Entertainment', 'Lifestyle', 'Sports', 'Tech']

  const filteredRooms = selectedCategory === 'All'
    ? availableRooms
    : availableRooms.filter(r => r.category === selectedCategory)

  const handleJoinRoom = (roomName: string) => {
    setCurrentRoom(roomName)
    openWindow({
      id: 'chat-main',
      type: 'chat',
      title: `${roomName} - AOL Chat`,
      isMinimized: false,
      position: { x: 100, y: 50 },
      size: { width: 700, height: 500 }
    })
    closeWindow('roomlist')
  }

  const handleCreateRoom = () => {
    if (newRoomName.trim()) {
      // In a real app, this would create the room in the database
      handleJoinRoom(newRoomName.trim())
      setNewRoomName('')
      setShowCreateRoom(false)
    }
  }

  return (
    <DraggableWindow
      id="roomlist"
      title="AOL Chat Rooms"
      width={450}
      height={400}
      initialPosition={{ x: 100, y: 80 }}
      onClose={() => closeWindow('roomlist')}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-[#c0c0c0] border-b border-[#808080]">
        <button
          className="win95-btn text-xs"
          onClick={() => setShowCreateRoom(true)}
        >
          Create Room
        </button>
        <button
          className="win95-btn text-xs"
          onClick={() => {
            const room = filteredRooms[0]
            if (room) handleJoinRoom(room.name)
          }}
        >
          Go Chat
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Category List */}
        <div className="w-32 border-r border-[#808080] bg-white overflow-y-auto">
          <div className="p-1 bg-[#000080] text-white text-xs font-bold">
            Categories
          </div>
          {categories.map(cat => (
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
        <div className="flex-1 flex flex-col">
          <div className="p-1 bg-[#000080] text-white text-xs font-bold">
            Chat Rooms
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
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
                      room.name === currentRoom
                        ? 'bg-[#000080] text-white'
                        : 'hover:bg-blue-100'
                    }`}
                    onDoubleClick={() => handleJoinRoom(room.name)}
                  >
                    <td className="px-2 py-1">
                      {room.isPrivate ? '🔒 ' : ''}{room.name}
                    </td>
                    <td className="text-center px-2 py-1">
                      {room.userCount}/{room.maxUsers}
                    </td>
                  </tr>
                ))}
                {filteredRooms.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center py-4 text-gray-400">
                      No rooms in this category
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
        Double-click a room to join • Current room: {currentRoom}
      </div>

      {/* Create Room Dialog */}
      {showCreateRoom && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/30">
          <div className="win95-window p-4" style={{ width: '280px' }}>
            <div className="win95-titlebar mb-2">
              <span>Create Private Room</span>
              <button className="win95-btn-titlebar" onClick={() => setShowCreateRoom(false)}>×</button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs block mb-1">Room Name:</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="win95-input w-full"
                  placeholder="Enter room name..."
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Category:</label>
                <select
                  value={newRoomCategory}
                  onChange={(e) => setNewRoomCategory(e.target.value)}
                  className="win95-input w-full"
                >
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="win95-btn" onClick={() => setShowCreateRoom(false)}>Cancel</button>
                <button className="win95-btn" onClick={handleCreateRoom}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DraggableWindow>
  )
}
