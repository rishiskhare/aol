'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase, Message, User, SystemEvent, Room, isSupabaseConfigured } from '@/lib/supabase'
import { AOLWindow } from './AOLWindow'
import { EmoticonPicker } from './EmoticonPicker'
import { ColorPicker } from './ColorPicker'
import { IMWindow } from './IMWindow'
import { ProfileWindow } from './ProfileWindow'
import { AwayMessageDialog } from './AwayMessageDialog'
import { BuddyListWindow } from './BuddyListWindow'
import { RoomListWindow } from './RoomListWindow'
import { WarnBlockDialog } from './WarnBlockDialog'
import { parseEmoticons } from '@/lib/emoticons'
import { parseFormatting, FormattedSegment, wrapWithTag, messageFonts, messageSizes } from '@/lib/formatting'
import { FontPicker } from './FontPicker'
import { SizePicker } from './SizePicker'
import {
  playDoorOpen,
  playDoorClose,
  playIMReceived,
  initAudio
} from '@/lib/sounds'

// Types for warn/block system
interface BlockedUser {
  username: string
  blockedAt: string
}

interface UserWarning {
  username: string
  level: number
}

interface PendingInvite {
  roomId: string
  roomName: string
  inviteCode: string
}

interface ChatRoomProps {
  username: string
  onSignOut: () => void
  pendingInvite?: PendingInvite | null
}

// Generate consistent color for a username
function getUsernameColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `username-color-${(Math.abs(hash) % 8) + 1}`
}

// Demo messages for when Supabase isn't configured
const demoMessages: Message[] = [
  { id: '1', username: 'SurfDude98', content: 'hey everyone! a/s/l?', created_at: new Date(Date.now() - 300000).toISOString() },
  { id: '2', username: 'CoolKid2000', content: '14/m/cali', created_at: new Date(Date.now() - 290000).toISOString() },
  { id: '3', username: 'xXAngelXx', content: 'does anyone have that new Britney Spears song?? :)', created_at: new Date(Date.now() - 280000).toISOString() },
  { id: '4', username: 'SurfDude98', content: 'i can send it 2 u but my mom is using the phone lol', created_at: new Date(Date.now() - 270000).toISOString() },
  { id: '5', username: 'GameMaster', content: 'brb gonna go play some Runescape B)', created_at: new Date(Date.now() - 260000).toISOString() },
  { id: '6', username: 'xXAngelXx', content: 'lol kk ttyl! <3', created_at: new Date(Date.now() - 250000).toISOString() },
]

const demoUsers: User[] = [
  { username: 'SurfDude98', joined_at: new Date().toISOString() },
  { username: 'CoolKid2000', joined_at: new Date().toISOString() },
  { username: 'xXAngelXx', joined_at: new Date().toISOString(), away_message: 'BRB getting snacks!' },
  { username: 'GameMaster', joined_at: new Date().toISOString() },
]

type ChatItem =
  | { type: 'message'; data: Message }
  | { type: 'event'; data: SystemEvent }

export function ChatRoom({ username, onSignOut, pendingInvite }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([])
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [audioInitialized, setAudioInitialized] = useState(false)

  // UI state
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [showSizePicker, setShowSizePicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedFont, setSelectedFont] = useState<string>('')
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)

  // Windows/dialogs
  const [openIMs, setOpenIMs] = useState<{ username: string; position: { x: number; y: number } }[]>([])
  const [showProfile, setShowProfile] = useState<string | null>(null)
  const [showAwayDialog, setShowAwayDialog] = useState(false)
  const [awayMessage, setAwayMessage] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  // New features
  const [currentRoom, setCurrentRoom] = useState('Town Square')
  const [showBuddyList, setShowBuddyList] = useState(false)
  const [showRoomList, setShowRoomList] = useState(false)
  const [showWarnBlock, setShowWarnBlock] = useState<string | null>(null)
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [userWarnings, setUserWarnings] = useState<UserWarning[]>([])
  const [roomCache, setRoomCache] = useState<Record<string, Room>>({})
  const [inviteCopied, setInviteCopied] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState<{ inviteCode: string; roomName: string } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousRoomUsersRef = useRef<Set<string>>(new Set())
  const joinTimeRef = useRef<string>(new Date().toISOString())
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // O(1) dedup: track all message IDs we've already rendered
  const seenMsgIdsRef = useRef<Set<string>>(new Set())
  // Track last poll time so we only fetch genuinely new messages.
  // Initialize 30s in the past to absorb client/server clock skew on first poll.
  const lastPollTimeRef = useRef<string>(new Date(Date.now() - 30000).toISOString())

  // Refs for values read inside subscription callbacks (avoids stale closures & unnecessary re-subscribes)
  const currentRoomRef = useRef(currentRoom)
  const soundEnabledRef = useRef(soundEnabled)
  const blockedUsersRef = useRef(blockedUsers)

  // Keep refs in sync with state
  useEffect(() => { currentRoomRef.current = currentRoom }, [currentRoom])
  useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])
  useEffect(() => { blockedUsersRef.current = blockedUsers }, [blockedUsers])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load blocked users and warnings from localStorage
  useEffect(() => {
    const savedBlocked = localStorage.getItem(`aol_blocked_${username}`)
    if (savedBlocked) {
      try { setBlockedUsers(JSON.parse(savedBlocked)) } catch { /* ignore */ }
    }
    const savedWarnings = localStorage.getItem('aol_warnings')
    if (savedWarnings) {
      try { setUserWarnings(JSON.parse(savedWarnings)) } catch { /* ignore */ }
    }
  }, [username])

  // Save blocked users to localStorage
  useEffect(() => {
    localStorage.setItem(`aol_blocked_${username}`, JSON.stringify(blockedUsers))
  }, [blockedUsers, username])

  // Save warnings to localStorage
  useEffect(() => {
    localStorage.setItem('aol_warnings', JSON.stringify(userWarnings))
  }, [userWarnings])

  // Helper functions for warn/block
  const isBlocked = useCallback((targetUsername: string) => {
    return blockedUsers.some(b => b.username === targetUsername)
  }, [blockedUsers])

  const getWarningLevel = useCallback((targetUsername: string) => {
    return userWarnings.find(w => w.username === targetUsername)?.level || 0
  }, [userWarnings])

  const warnUser = useCallback((targetUsername: string) => {
    setUserWarnings(prev => {
      const existing = prev.find(w => w.username === targetUsername)
      if (existing) {
        return prev.map(w =>
          w.username === targetUsername
            ? { ...w, level: Math.min(100, w.level + 20) }
            : w
        )
      }
      return [...prev, { username: targetUsername, level: 20 }]
    })
  }, [])

  const blockUser = useCallback((targetUsername: string) => {
    if (!blockedUsers.some(b => b.username === targetUsername)) {
      setBlockedUsers(prev => [...prev, { username: targetUsername, blockedAt: new Date().toISOString() }])
    }
  }, [blockedUsers])

  const unblockUser = useCallback((targetUsername: string) => {
    setBlockedUsers(prev => prev.filter(b => b.username !== targetUsername))
  }, [])

  // Initialize audio on first interaction
  const handleUserInteraction = useCallback(() => {
    if (!audioInitialized) {
      initAudio()
      setAudioInitialized(true)
    }
  }, [audioInitialized])

  // Handle pending invite on mount
  useEffect(() => {
    if (!pendingInvite || !isSupabaseConfigured()) return

    const redeemInvite = async () => {
      // Upsert into room_members
      await supabase.from('room_members').upsert({
        room_id: pendingInvite.roomId,
        username,
      }, { onConflict: 'room_id,username' })

      // Cache the room info
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', pendingInvite.roomId)
        .single()

      if (data) {
        setRoomCache(prev => ({ ...prev, [`room:${data.id}`]: data as Room }))
      }

      // Switch to the private room — clear all tracking refs
      // Use 5s lookback buffer on poll cursor to absorb client/server clock skew
      const roomKey = `room:${pendingInvite.roomId}`
      const now = new Date().toISOString()
      setMessages([])
      setSystemEvents([])
      previousRoomUsersRef.current = new Set()
      seenMsgIdsRef.current.clear()
      joinTimeRef.current = now
      lastPollTimeRef.current = new Date(Date.now() - 5000).toISOString()
      setCurrentRoom(roomKey)

      // Update current room in database
      await supabase
        .from('online_users')
        .update({ current_room: roomKey })
        .eq('username', username)

      // Clear pending invite
      localStorage.removeItem('aol_pending_invite')
    }

    redeemInvite()
  }, [pendingInvite, username])

  // Poll for messages since last poll — pure ID-based dedup, single setState call.
  const pollRoomMessages = useCallback(async (room: string) => {
    if (!isSupabaseConfigured()) return
    const since = lastPollTimeRef.current
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room', room)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(200)
    if (!data || data.length === 0) return

    // Advance poll cursor to newest message (server timestamp)
    lastPollTimeRef.current = data[data.length - 1].created_at

    const newMsgs: Message[] = []
    for (const msg of data) {
      if (seenMsgIdsRef.current.has(msg.id)) continue
      if ((msg.room || 'Town Square') !== currentRoomRef.current) continue
      if (blockedUsersRef.current.some(b => b.username === msg.username)) continue
      seenMsgIdsRef.current.add(msg.id)
      newMsgs.push(msg)
    }

    if (newMsgs.length > 0) {
      setMessages(prev => [...prev, ...newMsgs])
    }
  }, [])

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)

      if (!isSupabaseConfigured()) {
        setIsDemoMode(true)
        setMessages([])
        setOnlineUsers([...demoUsers, { username, joined_at: new Date().toISOString() }])
        previousRoomUsersRef.current = new Set(demoUsers.map(u => u.username))
        setIsLoading(false)
        return
      }

      // Record join time — only see messages from this point forward
      joinTimeRef.current = new Date().toISOString()
      setMessages([])

      // Clean up stale users (no activity in last 2 minutes)
      const twoMinutesAgo = new Date(Date.now() - 120000).toISOString()
      await supabase
        .from('online_users')
        .delete()
        .lt('last_activity', twoMinutesAgo)

      // Fetch online users
      const { data: usersData } = await supabase
        .from('online_users')
        .select('*')
        .order('joined_at', { ascending: true })

      if (usersData) {
        setOnlineUsers(usersData)
        const roomUsers = usersData.filter((u: User) => (u.current_room || 'Town Square') === currentRoom)
        previousRoomUsersRef.current = new Set(roomUsers.map((u: User) => u.username))
      }

      setSystemEvents([])
      setIsLoading(false)
    }

    fetchData()
  }, [username])

  // Message handler — pure ID-based dedup via seenMsgIdsRef.
  // Since the sender generates the UUID and uses it everywhere (optimistic, broadcast, DB insert),
  // the same ID appears across all delivery paths. Dedup is a single Set.has() check.
  const addIncomingMessage = useCallback((newMsg: Message) => {
    const msgRoom = newMsg.room || 'Town Square'
    if (msgRoom !== currentRoomRef.current) return
    if (blockedUsersRef.current.some(b => b.username === newMsg.username)) return
    if (seenMsgIdsRef.current.has(newMsg.id)) return

    seenMsgIdsRef.current.add(newMsg.id)
    if (newMsg.username !== username && soundEnabledRef.current) {
      playIMReceived()
    }
    setMessages(prev => [...prev, newMsg])
  }, [username])

  // Subscribe to real-time updates — stable subscription, reads current values from refs
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    // Poll immediately when a channel becomes SUBSCRIBED — catches messages
    // sent during the async connection window that broadcast/postgres_changes missed.
    let hasPolledOnReady = false
    const pollOnceWhenReady = () => {
      if (!hasPolledOnReady) {
        hasPolledOnReady = true
        pollRoomMessages(currentRoomRef.current)
      }
    }

    // Broadcast channel for instant message delivery (bypasses DB round-trip)
    const broadcastChannel = supabase
      .channel('chat-broadcast')
      .on('broadcast', { event: 'new-message' }, (payload) => {
        const msg = payload.payload as Message
        addIncomingMessage(msg)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') pollOnceWhenReady()
      })

    broadcastChannelRef.current = broadcastChannel

    // postgres_changes as secondary delivery (may arrive later, dedup handles it)
    const messagesChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          addIncomingMessage(payload.new as Message)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') pollOnceWhenReady()
      })

    const processUserData = (data: User[]) => {
      setOnlineUsers(data)

      const room = currentRoomRef.current
      const roomUsers = data.filter((u: User) => (u.current_room || 'Town Square') === room)
      const newRoomUsernames = new Set(roomUsers.map((u: User) => u.username))
      const oldRoomUsernames = previousRoomUsersRef.current

      for (const u of roomUsers) {
        if (!oldRoomUsernames.has(u.username) && u.username !== username) {
          if (soundEnabledRef.current) playDoorOpen()
          setSystemEvents((prev) => [...prev, {
            id: `local-${Date.now()}-${u.username}`,
            event_type: 'join' as const,
            username: u.username,
            created_at: new Date().toISOString()
          }])
        }
      }

      for (const oldUser of oldRoomUsernames) {
        if (!newRoomUsernames.has(oldUser) && oldUser !== username) {
          if (soundEnabledRef.current) playDoorClose()
          setSystemEvents((prev) => [...prev, {
            id: `local-${Date.now()}-${oldUser}`,
            event_type: 'leave' as const,
            username: oldUser,
            created_at: new Date().toISOString()
          }])
        }
      }

      previousRoomUsersRef.current = newRoomUsernames

      const typing = roomUsers.filter((u: User) => u.is_typing && u.username !== username).map((u: User) => u.username)
      setTypingUsers(typing)
    }

    const fetchAndProcessUsers = async () => {
      const { data } = await supabase
        .from('online_users')
        .select('*')
        .order('joined_at', { ascending: true })
      if (data) processUserData(data)
    }

    const usersChannel = supabase
      .channel('online_users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'online_users' },
        fetchAndProcessUsers
      )
      .subscribe()

    // Safety net: if channels take too long to connect, poll anyway after 2s
    const safetyTimeout = setTimeout(() => pollOnceWhenReady(), 2000)

    // Polling fallback for missed realtime events
    const userPollInterval = setInterval(fetchAndProcessUsers, 10000)

    // Message polling fallback — catches anything realtime/broadcast misses
    const msgPollInterval = setInterval(() => {
      pollRoomMessages(currentRoomRef.current)
    }, 3000)

    return () => {
      clearTimeout(safetyTimeout)
      clearInterval(userPollInterval)
      clearInterval(msgPollInterval)
      broadcastChannelRef.current = null
      supabase.removeChannel(broadcastChannel)
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(usersChannel)
    }
  }, [username, pollRoomMessages, addIncomingMessage])

  // Register user as online with heartbeat
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const now = new Date().toISOString()

    const registerUser = async () => {
      await supabase
        .from('online_users')
        .upsert({
          username,
          is_typing: false,
          away_message: null,
          current_room: currentRoom,
          last_activity: now,
          joined_at: now
        }, { onConflict: 'username' })
    }

    registerUser()

    // Heartbeat: update last_activity every 30 seconds
    const heartbeatInterval = setInterval(async () => {
      await supabase
        .from('online_users')
        .update({ last_activity: new Date().toISOString() })
        .eq('username', username)
    }, 30000)

    // Cleanup: remove user when leaving
    const handleBeforeUnload = () => {
      // Use fetch with keepalive for reliable cleanup on page unload
      // (sendBeacon only supports POST, but Supabase REST API needs DELETE)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseKey) {
        fetch(
          `${supabaseUrl}/rest/v1/online_users?username=eq.${encodeURIComponent(username)}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
            keepalive: true,
          }
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeatInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Cleanup on unmount
      supabase.from('online_users').delete().eq('username', username)
    }
  }, [username, currentRoom])

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, systemEvents, scrollToBottom])

  // Handle typing indicator
  const handleTyping = useCallback(async () => {
    if (!isSupabaseConfigured() || isDemoMode) return

    await supabase
      .from('online_users')
      .update({ is_typing: true })
      .eq('username', username)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('online_users')
        .update({ is_typing: false })
        .eq('username', username)
    }, 2000)
  }, [username, isDemoMode])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    let messageContent = newMessage.trim()

    // Apply formatting
    if (isBold) messageContent = wrapWithTag(messageContent, 'b')
    if (isItalic) messageContent = wrapWithTag(messageContent, 'i')
    if (isUnderline) messageContent = wrapWithTag(messageContent, 'u')
    if (selectedColor) messageContent = wrapWithTag(messageContent, 'color', selectedColor)
    if (selectedFont) messageContent = wrapWithTag(messageContent, 'font', selectedFont)
    if (selectedSize) messageContent = wrapWithTag(messageContent, 'size', selectedSize)

    setNewMessage('')

    // Clear typing timeout locally (non-blocking)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Generate a real UUID client-side. This same ID is used in the optimistic update,
    // the broadcast, AND the DB insert — so all delivery paths share one ID and
    // dedup is a trivial Set.has() check. No content-key matching needed.
    const msgId = crypto.randomUUID()
    const newMsg: Message = {
      id: msgId,
      username,
      content: messageContent,
      created_at: new Date().toISOString(),
      room: currentRoom
    }
    seenMsgIdsRef.current.add(msgId)
    setMessages((prev) => [...prev, newMsg])

    if (!isDemoMode) {
      // Broadcast for instant delivery to other clients (same UUID = trivial dedup)
      broadcastChannelRef.current?.send({
        type: 'broadcast',
        event: 'new-message',
        payload: newMsg,
      })

      // DB insert with client-generated UUID + typing clear, concurrently
      await Promise.all([
        supabase.from('messages').insert({
          id: msgId,
          username,
          content: messageContent,
          room: currentRoom
        }),
        isSupabaseConfigured()
          ? supabase.from('online_users').update({ is_typing: false }).eq('username', username)
          : Promise.resolve()
      ])
    }
  }

  const handleSetAway = async (message: string | null) => {
    setAwayMessage(message)

    if (isSupabaseConfigured()) {
      await supabase
        .from('online_users')
        .update({ away_message: message })
        .eq('username', username)
    }
  }

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.from('online_users').delete().eq('username', username)
    }
    onSignOut()
  }

  const handleJoinRoom = async (roomName: string, roomData?: Room) => {
    if (roomName === currentRoom) {
      setShowRoomList(false)
      return
    }

    // Cache room data if provided (for private rooms)
    if (roomData) {
      setRoomCache(prev => ({ ...prev, [roomName]: roomData }))
    }

    // Clear everything for the new room — only see messages from now
    // Use 5s lookback buffer on poll cursor to absorb client/server clock skew
    const now = new Date().toISOString()
    setMessages([])
    setSystemEvents([])
    previousRoomUsersRef.current = new Set()
    seenMsgIdsRef.current.clear()
    joinTimeRef.current = now
    lastPollTimeRef.current = new Date(Date.now() - 5000).toISOString()
    setCurrentRoom(roomName)
    setShowRoomList(false)

    // Update current room in database
    if (isSupabaseConfigured()) {
      await supabase
        .from('online_users')
        .update({ current_room: roomName })
        .eq('username', username)

      // Fetch users in the new room
      const { data } = await supabase
        .from('online_users')
        .select('*')
        .eq('current_room', roomName)

      if (data) {
        previousRoomUsersRef.current = new Set(data.map((u: User) => u.username))
      }
    }
  }

  const openIM = (targetUser: string) => {
    if (targetUser === username) return
    if (openIMs.find(im => im.username === targetUser)) return

    setOpenIMs((prev) => [
      ...prev,
      {
        username: targetUser,
        position: { x: 150 + prev.length * 30, y: 100 + prev.length * 30 }
      }
    ])
  }

  const closeIM = (targetUser: string) => {
    setOpenIMs((prev) => prev.filter(im => im.username !== targetUser))
  }

  const insertEmoticon = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    inputRef.current?.focus()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const renderFormattedText = (text: string) => {
    const withEmoticons = parseEmoticons(text)
    const segments = parseFormatting(withEmoticons)

    return segments.map((segment: FormattedSegment, i: number) => {
      const style: React.CSSProperties = {
        fontWeight: segment.bold ? 'bold' : 'normal',
        fontStyle: segment.italic ? 'italic' : 'normal',
        textDecoration: segment.underline ? 'underline' : 'none',
        color: segment.color || 'inherit',
        fontFamily: segment.font || 'inherit',
        fontSize: segment.size || 'inherit'
      }

      // Render as link if it's a URL
      if (segment.isLink && segment.url) {
        return (
          <a
            key={i}
            href={segment.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...style,
              color: segment.color || '#0000ff',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
            className="hover:text-blue-800"
          >
            {segment.text}
          </a>
        )
      }

      return (
        <span key={i} style={style}>
          {segment.text}
        </span>
      )
    })
  }

  // Resolve display name for current room
  const isPrivateRoom = currentRoom.startsWith('room:')
  const roomDisplayName = isPrivateRoom
    ? (roomCache[currentRoom]?.name || 'Private Room')
    : currentRoom

  const handleShareInvite = () => {
    const room = roomCache[currentRoom]
    if (!room) return
    const inviteUrl = `${window.location.origin}/invite/${room.invite_code}`
    navigator.clipboard.writeText(inviteUrl)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  const handleCopyInviteLink = (inviteCode: string) => {
    const url = `${window.location.origin}/invite/${inviteCode}`
    navigator.clipboard.writeText(url)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  const handlePrivateRoomCreated = (inviteCode: string, roomName: string) => {
    setShowInviteDialog({ inviteCode, roomName })
  }

  // Memoize users in current room — only recomputes when onlineUsers or currentRoom changes
  const usersInRoom = useMemo(() => {
    const now = Date.now()
    return onlineUsers.filter(u => {
      if ((u.current_room || 'Town Square') !== currentRoom) return false
      const ts = u.last_activity || u.joined_at
      if (ts) return (now - new Date(ts).getTime()) < 300000
      return true
    })
  }, [onlineUsers, currentRoom])

  // O(n+m) merge of two already-ordered arrays — no sorting needed.
  // Messages and systemEvents are both append-only, so they're inherently ordered by created_at.
  const chatItems = useMemo((): ChatItem[] => {
    const filteredMsgs = messages.filter(m => !isBlocked(m.username))
    const filteredEvents = systemEvents.filter(e => !isBlocked(e.username))

    if (filteredEvents.length === 0) return filteredMsgs.map(m => ({ type: 'message' as const, data: m }))
    if (filteredMsgs.length === 0) return filteredEvents.map(e => ({ type: 'event' as const, data: e }))

    const result: ChatItem[] = []
    let mi = 0, ei = 0
    while (mi < filteredMsgs.length && ei < filteredEvents.length) {
      if (filteredMsgs[mi].created_at <= filteredEvents[ei].created_at) {
        result.push({ type: 'message', data: filteredMsgs[mi++] })
      } else {
        result.push({ type: 'event', data: filteredEvents[ei++] })
      }
    }
    while (mi < filteredMsgs.length) result.push({ type: 'message', data: filteredMsgs[mi++] })
    while (ei < filteredEvents.length) result.push({ type: 'event', data: filteredEvents[ei++] })
    return result
  }, [messages, systemEvents, isBlocked])

  return (
    <div className="flex gap-2 p-4 h-screen" onClick={handleUserInteraction}>
      {/* Main Chat Window */}
      <AOLWindow
        title={`${roomDisplayName} - AOL Chat`}
        width="700px"
        height="100%"
        className="flex-1"
      >
        {/* Menu Bar */}
        <div className="win95-menubar flex">
          <span className="win95-menubar-item"><u>F</u>ile</span>
          <span className="win95-menubar-item"><u>E</u>dit</span>
          <span className="win95-menubar-item" onClick={() => setShowBuddyList(true)}>
            <u>B</u>uddy List
          </span>
          <span className="win95-menubar-item" onClick={() => setShowRoomList(true)}>
            <u>C</u>hat Rooms
          </span>
          <span className="win95-menubar-item" onClick={() => setShowAwayDialog(true)}>
            <u>A</u>way
          </span>
          <span className="win95-menubar-item"><u>H</u>elp</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 p-1 bg-[#c0c0c0] border-b border-[#808080] overflow-visible relative z-10">
          <button
            className={`win95-btn p-1 min-w-0 ${isBold ? 'border-inset' : ''}`}
            title="Bold"
            style={{ padding: '2px 6px', fontWeight: 'bold' }}
            onClick={() => setIsBold(!isBold)}
            type="button"
          >
            B
          </button>
          <button
            className={`win95-btn p-1 min-w-0 ${isItalic ? 'border-inset' : ''}`}
            title="Italic"
            style={{ padding: '2px 6px', fontStyle: 'italic' }}
            onClick={() => setIsItalic(!isItalic)}
            type="button"
          >
            I
          </button>
          <button
            className={`win95-btn p-1 min-w-0 ${isUnderline ? 'border-inset' : ''}`}
            title="Underline"
            style={{ padding: '2px 6px', textDecoration: 'underline' }}
            onClick={() => setIsUnderline(!isUnderline)}
            type="button"
          >
            U
          </button>
          <div className="w-px h-4 bg-[#808080] mx-1" />
          <div className="relative">
            <button
              className="win95-btn p-1 min-w-0"
              title="Font Color"
              style={{ padding: '2px 6px', color: selectedColor || 'red' }}
              onClick={() => setShowColorPicker(!showColorPicker)}
              type="button"
            >
              A
            </button>
            {showColorPicker && (
              <ColorPicker
                currentColor={selectedColor || undefined}
                onSelect={(color) => setSelectedColor(color)}
                onClose={() => setShowColorPicker(false)}
              />
            )}
          </div>
          <div className="relative">
            <button
              className="win95-btn p-1 min-w-0 text-left"
              title="Font"
              style={{
                padding: '2px 6px',
                fontFamily: selectedFont || 'inherit',
                width: '120px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              onClick={() => setShowFontPicker(!showFontPicker)}
              type="button"
            >
              {selectedFont ? messageFonts.find(f => f.value === selectedFont)?.name || 'Aa' : 'Aa'}
            </button>
            {showFontPicker && (
              <FontPicker
                currentFont={selectedFont}
                onSelect={(font) => setSelectedFont(font)}
                onClose={() => setShowFontPicker(false)}
              />
            )}
          </div>
          <div className="relative">
            <button
              className="win95-btn p-1 min-w-0"
              title="Font Size"
              style={{ padding: '2px 6px' }}
              onClick={() => setShowSizePicker(!showSizePicker)}
              type="button"
            >
              {selectedSize ? messageSizes.find(s => s.value === selectedSize)?.name || 'Normal' : 'Normal'}
            </button>
            {showSizePicker && (
              <SizePicker
                currentSize={selectedSize}
                onSelect={(size) => setSelectedSize(size)}
                onClose={() => setShowSizePicker(false)}
              />
            )}
          </div>
          <div className="w-px h-4 bg-[#808080] mx-1" />
          <div className="relative">
            <button
              className="win95-btn p-1 min-w-0"
              title="Emoticons"
              style={{ padding: '2px 6px' }}
              onClick={() => setShowEmoticonPicker(!showEmoticonPicker)}
              type="button"
            >
              :-)
            </button>
            {showEmoticonPicker && (
              <EmoticonPicker
                onSelect={insertEmoticon}
                onClose={() => setShowEmoticonPicker(false)}
              />
            )}
          </div>
          <div className="flex-1" />
          {isPrivateRoom && roomCache[currentRoom] && (
            <button
              className="win95-btn p-1 min-w-0"
              title="Share Invite Link"
              style={{ padding: '2px 6px', fontSize: '10px' }}
              onClick={handleShareInvite}
              type="button"
            >
              {inviteCopied ? 'Copied!' : 'Share Invite'}
            </button>
          )}
          <button
            className={`win95-btn p-1 min-w-0 ${soundEnabled ? '' : 'border-inset'}`}
            title={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
            style={{ padding: '2px 6px', fontSize: '10px' }}
            onClick={() => setSoundEnabled(!soundEnabled)}
            type="button"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Demo Mode / Away Warning */}
        {isDemoMode && (
          <div className="bg-yellow-100 border-b border-yellow-300 px-3 py-1 text-xs text-yellow-800">
            Demo Mode: Configure Supabase in .env.local for real-time chat
          </div>
        )}
        {awayMessage && (
          <div className="bg-orange-100 border-b border-orange-300 px-3 py-1 text-xs text-orange-800">
            You are away: {awayMessage} <button className="underline ml-2" onClick={() => handleSetAway(null)}>I&apos;m back</button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="chat-messages flex-1 p-2 m-2">
          {isLoading ? (
            <div className="text-center text-gray-500 py-4">Loading messages...</div>
          ) : chatItems.length === 0 ? (
            <div className="system-message">Welcome to {roomDisplayName}! You are the first one here.</div>
          ) : (
            chatItems.map((item) => {
              if (item.type === 'event') {
                const event = item.data
                return (
                  <div key={event.id} className="door-notification">
                    {event.event_type === 'join' && `${event.username} has entered the room.`}
                    {event.event_type === 'leave' && `${event.username} has left the room.`}
                    {event.event_type === 'away' && `${event.username} is now away.`}
                    {event.event_type === 'back' && `${event.username} is back.`}
                  </div>
                )
              } else {
                const msg = item.data
                return (
                  <div key={msg.id} className="mb-1">
                    <span className="text-gray-400 text-xs mr-2">
                      ({formatTime(msg.created_at)})
                    </span>
                    <span
                      className={`font-bold cursor-pointer hover:underline ${getUsernameColor(msg.username)}`}
                      onClick={() => setShowProfile(msg.username)}
                    >
                      {msg.username}:
                    </span>{' '}
                    <span>{renderFormattedText(msg.content)}</span>
                  </div>
                )
              }
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1 text-xs text-gray-500 italic">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-2 pt-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              className="win95-input flex-1"
              placeholder="Type your message here..."
              maxLength={500}
              style={{
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
                color: selectedColor || 'inherit',
                fontFamily: selectedFont || 'inherit',
                fontSize: selectedSize || '12px'
              }}
            />
            <button type="submit" className="win95-btn">Send</button>
          </div>
        </form>

        {/* Status Bar */}
        <div className="win95-statusbar">
          <div className="win95-statusbar-section">
            {usersInRoom.length} {usersInRoom.length === 1 ? 'person' : 'people'} in room
          </div>
          <div className="win95-statusbar-section" style={{ flex: 2 }}>
            {roomDisplayName} • {username} {awayMessage ? '(Away)' : ''}
          </div>
        </div>
      </AOLWindow>

      {/* People Here Sidebar */}
      <AOLWindow title="People Here" width="180px" height="100%">
        <div className="p-2 flex-1 flex flex-col">
          <div className="text-xs mb-2 text-gray-600">
            {usersInRoom.length} {usersInRoom.length === 1 ? 'person' : 'people'} in {roomDisplayName}
          </div>
          <div className="user-list flex-1 p-1">
            {usersInRoom.map((user) => (
              <div
                key={user.username}
                className={`flex items-center gap-2 p-1 cursor-pointer hover:bg-blue-100 ${user.username === username ? 'bg-blue-50' : ''
                  } ${isBlocked(user.username) ? 'opacity-50' : ''}`}
                onDoubleClick={() => openIM(user.username)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (user.username !== username) setShowWarnBlock(user.username)
                }}
              >
                <BuddyIcon username={user.username} isAway={!!user.away_message} />
                <span className={`${user.username === username ? 'font-bold' : ''} ${user.away_message ? 'text-gray-400' : ''}`}>
                  {user.username}
                  {isBlocked(user.username) && <span className="text-red-500 ml-1">🚫</span>}
                  {user.is_typing && user.username !== username && (
                    <span className="text-xs text-gray-400 ml-1">...</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <button
              className="win95-btn text-xs"
              onClick={() => {
                const selected = usersInRoom.find(u => u.username !== username)
                if (selected) setShowProfile(selected.username)
              }}
              type="button"
            >
              Get Profile
            </button>
            <button
              className="win95-btn text-xs"
              onClick={() => {
                const selected = usersInRoom.find(u => u.username !== username)
                if (selected) openIM(selected.username)
              }}
              type="button"
            >
              Send IM
            </button>
            <button
              className="win95-btn text-xs"
              onClick={() => {
                const selected = usersInRoom.find(u => u.username !== username)
                if (selected) setShowWarnBlock(selected.username)
              }}
              type="button"
            >
              Warn/Block
            </button>
            <div className="win95-separator" />
            <button
              className="win95-btn text-xs"
              onClick={() => setShowAwayDialog(true)}
              type="button"
            >
              {awayMessage ? 'I\'m Back' : 'Set Away'}
            </button>
            <button className="win95-btn text-xs" onClick={handleSignOut} type="button">
              Sign Off
            </button>
          </div>
        </div>
      </AOLWindow>

      {/* IM Windows */}
      {openIMs.map((im) => {
        const targetUser = onlineUsers.find(u => u.username === im.username)
        return (
          <IMWindow
            key={im.username}
            currentUser={username}
            otherUser={im.username}
            awayMessage={targetUser?.away_message}
            onClose={() => closeIM(im.username)}
            initialPosition={im.position}
          />
        )
      })}

      {/* Profile Window */}
      {showProfile && (
        <ProfileWindow
          username={showProfile}
          isOwnProfile={showProfile === username}
          onClose={() => setShowProfile(null)}
        />
      )}

      {/* Away Message Dialog */}
      {showAwayDialog && (
        <AwayMessageDialog
          currentMessage={awayMessage}
          onSave={handleSetAway}
          onClose={() => setShowAwayDialog(false)}
        />
      )}

      {/* Buddy List Window */}
      {showBuddyList && (
        <BuddyListWindow
          currentUser={username}
          onOpenIM={openIM}
          onViewProfile={(user) => setShowProfile(user)}
          onClose={() => setShowBuddyList(false)}
        />
      )}

      {/* Room List Window */}
      {showRoomList && (
        <RoomListWindow
          username={username}
          currentRoom={currentRoom}
          onJoinRoom={handleJoinRoom}
          onPrivateRoomCreated={handlePrivateRoomCreated}
          onClose={() => setShowRoomList(false)}
        />
      )}

      {/* Warn/Block Dialog */}
      {showWarnBlock && (
        <WarnBlockDialog
          targetUser={showWarnBlock}
          warningLevel={getWarningLevel(showWarnBlock)}
          isBlocked={isBlocked(showWarnBlock)}
          onWarn={() => warnUser(showWarnBlock)}
          onBlock={() => blockUser(showWarnBlock)}
          onUnblock={() => unblockUser(showWarnBlock)}
          onClose={() => setShowWarnBlock(null)}
        />
      )}

      {/* Invite Link Dialog (owned by ChatRoom so it survives RoomListWindow closing) */}
      {showInviteDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[70] bg-black/30">
          <AOLWindow title="Invite Link" width="350px" onClose={() => setShowInviteDialog(null)}>
            <div className="p-3 space-y-3">
              <p className="text-xs">
                Your private room <strong>&quot;{showInviteDialog.roomName}&quot;</strong> has been created!
              </p>
              <p className="text-xs">Share this link to invite friends:</p>
              <div className="win95-input p-2 text-xs break-all select-all bg-white">
                {`${window.location.origin}/invite/${showInviteDialog.inviteCode}`}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="win95-btn"
                  onClick={() => handleCopyInviteLink(showInviteDialog.inviteCode)}
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

function BuddyIcon({ username, isAway }: { username: string; isAway?: boolean }) {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  const colorIndex = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length

  return (
    <div
      className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold relative"
      style={{
        backgroundColor: isAway ? '#999' : colors[colorIndex],
        border: '1px solid rgba(0,0,0,0.2)'
      }}
    >
      {username[0].toUpperCase()}
      {isAway && (
        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full border border-yellow-600" />
      )}
    </div>
  )
}
