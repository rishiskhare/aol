'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AOLWindow } from './AOLWindow'
import { supabase, FriendRequest, isSupabaseConfigured } from '@/lib/supabase'

interface BuddyListWindowProps {
  currentUser: string
  onOpenIM: (username: string) => void
  onViewProfile: (username: string) => void
  onClose: () => void
  initialTab?: 'friends' | 'requests'
}

export function BuddyListWindow({ currentUser, onOpenIM, onViewProfile, onClose, initialTab }: BuddyListWindowProps) {
  const [friends, setFriends] = useState<string[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [showAddBuddy, setShowAddBuddy] = useState(false)
  const [newBuddyName, setNewBuddyName] = useState('')
  const [selectedBuddy, setSelectedBuddy] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>(initialTab || 'friends')
  const [addError, setAddError] = useState<string | null>(null)

  const currentUserRef = useRef(currentUser)
  useEffect(() => { currentUserRef.current = currentUser }, [currentUser])

  // Fetch friend requests and split into friends/incoming/outgoing
  const fetchFriendData = useCallback(async () => {
    if (!isSupabaseConfigured()) return

    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`from_user.eq.${currentUserRef.current},to_user.eq.${currentUserRef.current}`)

    if (error || !data) return

    const accepted: string[] = []
    const incoming: FriendRequest[] = []
    const outgoing: FriendRequest[] = []

    for (const req of data as FriendRequest[]) {
      if (req.status === 'accepted') {
        accepted.push(req.from_user === currentUserRef.current ? req.to_user : req.from_user)
      } else if (req.status === 'pending') {
        if (req.to_user === currentUserRef.current) {
          incoming.push(req)
        } else {
          outgoing.push(req)
        }
      }
    }

    setFriends(accepted)
    setIncomingRequests(incoming)
    setOutgoingRequests(outgoing)
  }, [])

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    fetchFriendData()

    const channel = supabase
      .channel('buddylist-friends')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => {
        fetchFriendData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFriendData])

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

  const sendFriendRequest = async () => {
    const name = newBuddyName.trim()
    setAddError(null)

    if (!name) return
    if (name.toLowerCase() === currentUser.toLowerCase()) {
      setAddError("You can't add yourself!")
      return
    }
    if (friends.some(f => f.toLowerCase() === name.toLowerCase())) {
      setAddError(`${name} is already your friend.`)
      return
    }
    if (outgoingRequests.some(r => r.to_user.toLowerCase() === name.toLowerCase())) {
      setAddError(`You already sent a request to ${name}.`)
      return
    }

    // Check if they already sent us a request — auto-accept if so
    const reverseRequest = incomingRequests.find(
      r => r.from_user.toLowerCase() === name.toLowerCase()
    )

    if (reverseRequest) {
      await supabase
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', reverseRequest.id)

      setNewBuddyName('')
      setShowAddBuddy(false)
      fetchFriendData()
      return
    }

    const { error } = await supabase.from('friend_requests').insert({
      from_user: currentUser,
      to_user: name,
      status: 'pending'
    })

    if (error) {
      if (error.code === '23505') {
        setAddError('A request already exists for this user.')
      } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        setAddError('Friend requests table not found. Run the schema SQL in Supabase.')
      } else {
        setAddError(error.message || 'Failed to send request. Try again.')
      }
      return
    }

    setNewBuddyName('')
    setShowAddBuddy(false)
    fetchFriendData()
  }

  const acceptRequest = async (id: string) => {
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id)
    fetchFriendData()
  }

  const declineRequest = async (id: string) => {
    await supabase
      .from('friend_requests')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', id)
    fetchFriendData()
  }

  const removeFriend = async (friendUsername: string) => {
    // Delete the accepted row in either direction
    await supabase
      .from('friend_requests')
      .delete()
      .eq('status', 'accepted')
      .or(`and(from_user.eq.${currentUser},to_user.eq.${friendUsername}),and(from_user.eq.${friendUsername},to_user.eq.${currentUser})`)

    if (selectedBuddy === friendUsername) setSelectedBuddy(null)
    fetchFriendData()
  }

  const cancelOutgoingRequest = async (id: string) => {
    await supabase
      .from('friend_requests')
      .delete()
      .eq('id', id)
    fetchFriendData()
  }

  // Sort friends: online first, then alphabetically
  const sortedFriends = [...friends].sort((a, b) => {
    const aOnline = onlineUsers.has(a)
    const bOnline = onlineUsers.has(b)
    if (aOnline && !bOnline) return -1
    if (!aOnline && bOnline) return 1
    return a.localeCompare(b)
  })

  const onlineCount = friends.filter(f => onlineUsers.has(f)).length

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <AOLWindow title="Buddy List" width="240px" onClose={onClose}>
        <div className="flex flex-col" style={{ height: '400px' }}>
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-1 bg-[#c0c0c0] border-b border-[#808080]">
            <button
              className="win95-btn text-xs"
              style={{ minWidth: 'auto', padding: '2px 8px' }}
              onClick={() => { setAddError(null); setShowAddBuddy(true) }}
            >
              Add
            </button>
            <button
              className="win95-btn text-xs"
              style={{ minWidth: 'auto', padding: '2px 8px' }}
              onClick={() => selectedBuddy && removeFriend(selectedBuddy)}
              disabled={!selectedBuddy || !friends.includes(selectedBuddy)}
            >
              Remove
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-[#c0c0c0] border-b border-[#808080]">
            <button
              className={`flex-1 text-xs py-1 px-2 ${activeTab === 'friends' ? 'bg-[#e0e0e0] font-bold border-t-2 border-t-[#000080]' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              Friends ({onlineCount}/{friends.length})
            </button>
            <button
              className={`flex-1 text-xs py-1 px-2 relative ${activeTab === 'requests' ? 'bg-[#e0e0e0] font-bold border-t-2 border-t-[#000080]' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Requests
              {incomingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto bg-white m-1 border-2" style={{ borderColor: '#808080 #fff #fff #808080' }}>
            {activeTab === 'friends' ? (
              <>
                {/* Accepted friends */}
                {sortedFriends.length === 0 && outgoingRequests.length === 0 ? (
                  <div className="text-xs text-gray-400 py-4 px-2 text-center italic">
                    No friends yet.<br />Click Add to send a request.
                  </div>
                ) : (
                  <>
                    {sortedFriends.map(friend => {
                      const isOnline = onlineUsers.has(friend)
                      return (
                        <div
                          key={friend}
                          className={`flex items-center gap-2 py-1 px-2 cursor-pointer text-xs ${
                            selectedBuddy === friend ? 'bg-[#000080] text-white' : 'hover:bg-blue-100'
                          } ${!isOnline ? 'text-gray-400' : ''}`}
                          onClick={() => setSelectedBuddy(friend)}
                          onDoubleClick={() => isOnline && onOpenIM(friend)}
                        >
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="truncate">{friend}</span>
                          {isOnline && <span className="ml-auto text-[10px] text-green-600 flex-shrink-0">online</span>}
                        </div>
                      )
                    })}
                    {/* Pending outgoing shown dimmed */}
                    {outgoingRequests.map(req => (
                      <div
                        key={req.id}
                        className="flex items-center gap-2 py-1 px-2 text-xs text-gray-400 italic"
                      >
                        <span className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
                        <span className="truncate">{req.to_user}</span>
                        <span className="ml-auto text-[10px] flex-shrink-0">pending...</span>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                {/* Incoming Requests */}
                {incomingRequests.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-bold text-gray-500 bg-[#f0f0f0] border-b border-[#e0e0e0]">
                      INCOMING
                    </div>
                    {incomingRequests.map(req => (
                      <div key={req.id} className="flex items-center gap-1 py-1 px-2 text-xs border-b border-[#f0f0f0]">
                        <span className="flex-1 truncate font-bold">{req.from_user}</span>
                        <button
                          className="win95-btn text-[10px]"
                          style={{ minWidth: 'auto', padding: '1px 6px' }}
                          onClick={() => acceptRequest(req.id)}
                        >
                          Accept
                        </button>
                        <button
                          className="win95-btn text-[10px]"
                          style={{ minWidth: 'auto', padding: '1px 6px' }}
                          onClick={() => declineRequest(req.id)}
                        >
                          Decline
                        </button>
                      </div>
                    ))}
                  </>
                )}

                {/* Sent Requests */}
                {outgoingRequests.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-bold text-gray-500 bg-[#f0f0f0] border-b border-[#e0e0e0]">
                      SENT
                    </div>
                    {outgoingRequests.map(req => (
                      <div key={req.id} className="flex items-center gap-1 py-1 px-2 text-xs border-b border-[#f0f0f0]">
                        <span className="flex-1 truncate">{req.to_user}</span>
                        <span className="text-[10px] text-gray-400 mr-1">pending</span>
                        <button
                          className="win95-btn text-[10px]"
                          style={{ minWidth: 'auto', padding: '1px 6px' }}
                          onClick={() => cancelOutgoingRequest(req.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </>
                )}

                {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                  <div className="text-xs text-gray-400 py-4 px-2 text-center italic">
                    No pending requests.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Status */}
          <div className="p-1 text-xs text-center border-t border-[#808080]">
            {onlineCount}/{friends.length} friends online
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

      {/* Add Friend / Send Request Dialog */}
      {showAddBuddy && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black/30">
          <AOLWindow title="Send Friend Request" width="260px" onClose={() => { setShowAddBuddy(false); setAddError(null) }}>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-xs block mb-1">Screen Name:</label>
                <input
                  type="text"
                  value={newBuddyName}
                  onChange={(e) => { setNewBuddyName(e.target.value); setAddError(null) }}
                  className="win95-input w-full"
                  placeholder="Enter username..."
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && sendFriendRequest()}
                />
              </div>
              {addError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
                  {addError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button className="win95-btn" onClick={() => { setShowAddBuddy(false); setAddError(null) }}>Cancel</button>
                <button className="win95-btn" onClick={sendFriendRequest}>Send Request</button>
              </div>
            </div>
          </AOLWindow>
        </div>
      )}
    </div>
  )
}
