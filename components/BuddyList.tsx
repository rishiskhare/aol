'use client'

import { useState, useEffect } from 'react'
import { useAOL } from '@/lib/store'
import { DraggableWindow } from './DraggableWindow'
import { supabase, User, isSupabaseConfigured } from '@/lib/supabase'

interface BuddyListProps {
  onOpenIM: (username: string) => void
  onViewProfile: (username: string) => void
}

export function BuddyList({ onOpenIM, onViewProfile }: BuddyListProps) {
  const { closeWindow, buddies, addBuddy, removeBuddy, username, openWindow } = useAOL()
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Buddies', 'Online']))
  const [showAddBuddy, setShowAddBuddy] = useState(false)
  const [newBuddyName, setNewBuddyName] = useState('')
  const [newBuddyCategory, setNewBuddyCategory] = useState('Buddies')

  // Fetch online users
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const fetchOnline = async () => {
      const { data } = await supabase
        .from('online_users')
        .select('*')

      if (data) {
        setOnlineUsers(data)
      }
    }

    fetchOnline()

    const channel = supabase
      .channel('buddylist-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_users' }, fetchOnline)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleAddBuddy = () => {
    if (newBuddyName.trim() && newBuddyName !== username) {
      addBuddy(newBuddyName.trim(), newBuddyCategory)
      setNewBuddyName('')
      setShowAddBuddy(false)
    }
  }

  // Get categories with buddies
  const categories = ['Buddies', 'Family', 'Co-Workers']
  const buddiesByCategory = categories.reduce((acc, cat) => {
    acc[cat] = buddies.filter(b => b.category === cat).map(b => ({
      ...b,
      isOnline: onlineUsers.some(u => u.username === b.username),
      isAway: onlineUsers.find(u => u.username === b.username)?.away_message != null
    }))
    return acc
  }, {} as Record<string, typeof buddies>)

  // Online users not in buddy list
  const onlineNotBuddies = onlineUsers.filter(
    u => u.username !== username && !buddies.some(b => b.username === u.username)
  )

  return (
    <DraggableWindow
      id="buddylist"
      title="Buddy List"
      width={200}
      height={400}
      initialPosition={{ x: 50, y: 50 }}
      onClose={() => closeWindow('buddylist')}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 bg-[#c0c0c0] border-b border-[#808080]">
        <button
          className="win95-btn text-xs"
          style={{ minWidth: 'auto', padding: '2px 6px' }}
          onClick={() => setShowAddBuddy(true)}
          title="Add Buddy"
        >
          +
        </button>
        <button
          className="win95-btn text-xs"
          style={{ minWidth: 'auto', padding: '2px 6px' }}
          onClick={() => openWindow({
            id: 'preferences',
            type: 'preferences',
            title: 'Preferences',
            isMinimized: false,
            position: { x: 150, y: 100 },
            size: { width: 350, height: 300 }
          })}
          title="Setup"
        >
          ⚙
        </button>
      </div>

      {/* Buddy Categories */}
      <div className="flex-1 overflow-y-auto bg-white m-1 border-2" style={{ borderColor: '#808080 #fff #fff #808080' }}>
        {/* Online (not buddies) */}
        <CategoryHeader
          title={`Online (${onlineNotBuddies.length})`}
          expanded={expandedCategories.has('Online')}
          onClick={() => toggleCategory('Online')}
        />
        {expandedCategories.has('Online') && (
          <div className="pl-4">
            {onlineNotBuddies.map(user => (
              <BuddyItem
                key={user.username}
                username={user.username}
                isOnline={true}
                isAway={!!user.away_message}
                onDoubleClick={() => onOpenIM(user.username)}
                onRightClick={(e) => {
                  e.preventDefault()
                  // Could show context menu
                }}
              />
            ))}
          </div>
        )}

        {/* Buddy Categories */}
        {categories.map(category => (
          <div key={category}>
            <CategoryHeader
              title={`${category} (${buddiesByCategory[category].filter(b => b.isOnline).length}/${buddiesByCategory[category].length})`}
              expanded={expandedCategories.has(category)}
              onClick={() => toggleCategory(category)}
            />
            {expandedCategories.has(category) && (
              <div className="pl-4">
                {buddiesByCategory[category]
                  .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                  .map(buddy => (
                    <BuddyItem
                      key={buddy.username}
                      username={buddy.username}
                      isOnline={buddy.isOnline}
                      isAway={buddy.isAway}
                      onDoubleClick={() => onOpenIM(buddy.username)}
                      onRightClick={(e) => {
                        e.preventDefault()
                        removeBuddy(buddy.username)
                      }}
                    />
                  ))}
                {buddiesByCategory[category].length === 0 && (
                  <div className="text-xs text-gray-400 py-1">No buddies</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="p-1 text-xs text-center border-t border-[#808080]">
        {onlineUsers.length} users online
      </div>

      {/* Add Buddy Dialog */}
      {showAddBuddy && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/30">
          <div className="win95-window p-4" style={{ width: '250px' }}>
            <div className="win95-titlebar mb-2">
              <span>Add Buddy</span>
              <button className="win95-btn-titlebar" onClick={() => setShowAddBuddy(false)}>×</button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs block mb-1">Screen Name:</label>
                <input
                  type="text"
                  value={newBuddyName}
                  onChange={(e) => setNewBuddyName(e.target.value)}
                  className="win95-input w-full"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Group:</label>
                <select
                  value={newBuddyCategory}
                  onChange={(e) => setNewBuddyCategory(e.target.value)}
                  className="win95-input w-full"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="win95-btn" onClick={() => setShowAddBuddy(false)}>Cancel</button>
                <button className="win95-btn" onClick={handleAddBuddy}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DraggableWindow>
  )
}

function CategoryHeader({ title, expanded, onClick }: { title: string; expanded: boolean; onClick: () => void }) {
  return (
    <div
      className="flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-blue-100 text-xs font-bold"
      onClick={onClick}
    >
      <span>{expanded ? '▼' : '▶'}</span>
      <span>{title}</span>
    </div>
  )
}

function BuddyItem({
  username,
  isOnline,
  isAway,
  onDoubleClick,
  onRightClick
}: {
  username: string
  isOnline: boolean
  isAway: boolean
  onDoubleClick: () => void
  onRightClick: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className={`flex items-center gap-2 py-0.5 px-1 cursor-pointer hover:bg-blue-100 text-xs ${
        !isOnline ? 'text-gray-400' : ''
      }`}
      onDoubleClick={onDoubleClick}
      onContextMenu={onRightClick}
    >
      <BuddyIcon isOnline={isOnline} isAway={isAway} />
      <span>{username}</span>
      {isAway && <span className="text-yellow-600">(away)</span>}
    </div>
  )
}

function BuddyIcon({ isOnline, isAway }: { isOnline: boolean; isAway: boolean }) {
  const color = !isOnline ? '#999' : isAway ? '#ffa500' : '#00aa00'
  return (
    <div
      className="w-3 h-3 rounded-sm"
      style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.3)' }}
    />
  )
}
