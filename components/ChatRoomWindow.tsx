'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAOL } from '@/lib/store'
import { DraggableWindow } from './DraggableWindow'
import { EmoticonPicker } from './EmoticonPicker'
import { ColorPicker } from './ColorPicker'
import { supabase, Message, User, SystemEvent, isSupabaseConfigured } from '@/lib/supabase'
import { parseEmoticons } from '@/lib/emoticons'
import { parseFormatting, FormattedSegment, wrapWithTag } from '@/lib/formatting'
import { playDoorOpen, playDoorClose, playIMReceived, initAudio } from '@/lib/sounds'

interface ChatRoomWindowProps {
  windowId: string
  onOpenIM: (username: string) => void
  onViewProfile: (username: string) => void
}

function getUsernameColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `username-color-${(Math.abs(hash) % 8) + 1}`
}

type ChatItem =
  | { type: 'message'; data: Message }
  | { type: 'event'; data: SystemEvent }

export function ChatRoomWindow({ windowId, onOpenIM, onViewProfile }: ChatRoomWindowProps) {
  const { closeWindow, username, currentRoom, preferences, isBlocked, openWindow } = useAOL()
  const [messages, setMessages] = useState<Message[]>([])
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([])
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // UI state
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousUsersRef = useRef<Set<string>>(new Set())
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const remoteTypingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleUserInteraction = useCallback(() => {
    if (!audioInitialized) {
      initAudio()
      setAudioInitialized(true)
    }
  }, [audioInitialized])

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)

      if (!isSupabaseConfigured()) {
        setIsDemoMode(true)
        setMessages([])
        setOnlineUsers([{ username, joined_at: new Date().toISOString() }])
        setIsLoading(false)
        return
      }

      setMessages([])

      const { data: usersData } = await supabase
        .from('online_users')
        .select('*')
        .order('joined_at', { ascending: true })

      if (usersData) {
        setOnlineUsers(usersData)
        previousUsersRef.current = new Set(usersData.map((u: User) => u.username))
      }

      setSystemEvents([])
      setIsLoading(false)
    }

    fetchData()
  }, [username])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    // Broadcast channel for instant typing indicators
    const broadcastChannel = supabase
      .channel('chat-broadcast-window')
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { username: typingUser } = payload.payload as { username: string; room?: string }
        if (typingUser === username) return

        setTypingUsers(prev => prev.includes(typingUser) ? prev : [...prev, typingUser])

        const existing = remoteTypingTimeoutsRef.current.get(typingUser)
        if (existing) clearTimeout(existing)
        remoteTypingTimeoutsRef.current.set(typingUser, setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== typingUser))
          remoteTypingTimeoutsRef.current.delete(typingUser)
        }, 3000))
      })
      .subscribe()

    broadcastChannelRef.current = broadcastChannel

    const messagesChannel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message
          if (isBlocked(newMsg.username)) return

          setMessages((prev) => {
            const isDuplicate = prev.some(
              (msg) =>
                msg.id.startsWith('local-') &&
                msg.username === newMsg.username &&
                msg.content === newMsg.content &&
                Math.abs(new Date(msg.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000
            )
            if (isDuplicate) {
              return prev.map((msg) =>
                msg.id.startsWith('local-') &&
                  msg.username === newMsg.username &&
                  msg.content === newMsg.content
                  ? newMsg
                  : msg
              )
            }
            if (newMsg.username !== username && soundEnabled) {
              playIMReceived()
            }
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    const usersChannel = supabase
      .channel('chat-users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'online_users' },
        async () => {
          const { data } = await supabase
            .from('online_users')
            .select('*')
            .order('joined_at', { ascending: true })

          if (data) {
            const newUsernames = new Set(data.map((u: User) => u.username))
            const oldUsernames = previousUsersRef.current

            for (const u of data) {
              if (!oldUsernames.has(u.username) && u.username !== username) {
                if (soundEnabled) playDoorOpen()
                setSystemEvents((prev) => [...prev, {
                  id: `local-${Date.now()}`,
                  event_type: 'join' as const,
                  username: u.username,
                  created_at: new Date().toISOString()
                }])
              }
            }

            for (const oldUser of oldUsernames) {
              if (!newUsernames.has(oldUser) && oldUser !== username) {
                if (soundEnabled) playDoorClose()
                setSystemEvents((prev) => [...prev, {
                  id: `local-${Date.now()}`,
                  event_type: 'leave' as const,
                  username: oldUser,
                  created_at: new Date().toISOString()
                }])
              }
            }

            previousUsersRef.current = newUsernames
            setOnlineUsers(data)
          }
        }
      )
      .subscribe()

    // Polling fallback: refetch online users periodically in case realtime events are missed
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('online_users')
        .select('*')
        .order('joined_at', { ascending: true })

      if (data) {
        setOnlineUsers(data)
      }
    }, 10000)

    return () => {
      clearInterval(pollInterval)
      remoteTypingTimeoutsRef.current.forEach(t => clearTimeout(t))
      remoteTypingTimeoutsRef.current.clear()
      broadcastChannelRef.current = null
      supabase.removeChannel(broadcastChannel)
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(usersChannel)
    }
  }, [username, soundEnabled, isBlocked])

  useEffect(() => {
    scrollToBottom()
  }, [messages, systemEvents, scrollToBottom])

  const handleTyping = useCallback(() => {
    if (!isSupabaseConfigured() || isDemoMode) return
    if (!broadcastChannelRef.current) return

    // Throttle: only send a broadcast every 2 seconds
    if (typingTimeoutRef.current) return

    broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { username }
    })

    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null
    }, 2000)
  }, [username, isDemoMode])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    let messageContent = newMessage.trim()

    if (isBold) messageContent = wrapWithTag(messageContent, 'b')
    if (isItalic) messageContent = wrapWithTag(messageContent, 'i')
    if (isUnderline) messageContent = wrapWithTag(messageContent, 'u')
    if (selectedColor) messageContent = wrapWithTag(messageContent, 'color', selectedColor)

    setNewMessage('')

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    const newMsg: Message = {
      id: `local-${Date.now()}`,
      username,
      content: messageContent,
      created_at: new Date().toISOString()
    }
    setMessages((prev) => [...prev, newMsg])

    if (!isDemoMode) {
      await supabase.from('messages').insert({
        username,
        content: messageContent
      })
    }
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

    return segments.map((segment: FormattedSegment, i: number) => (
      <span
        key={i}
        style={{
          fontWeight: segment.bold ? 'bold' : 'normal',
          fontStyle: segment.italic ? 'italic' : 'normal',
          textDecoration: segment.underline ? 'underline' : 'none',
          color: segment.color || 'inherit',
          fontFamily: preferences.fontFamily,
          fontSize: `${preferences.fontSize}px`
        }}
      >
        {segment.text}
      </span>
    ))
  }

  const chatItems: ChatItem[] = [
    ...messages.map((m): ChatItem => ({ type: 'message', data: m })),
    ...systemEvents.map((e): ChatItem => ({ type: 'event', data: e }))
  ].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime())

  return (
    <DraggableWindow
      id={windowId}
      title={`${currentRoom} - AOL Chat`}
      width={900}
      height={600}
      initialPosition={{ x: 10, y: 10 }}
      onClose={() => closeWindow(windowId)}
      resizable
    >
      <div className="flex flex-col h-full" onClick={handleUserInteraction}>
        {/* Menu Bar */}
        <div className="win95-menubar flex">
          <span className="win95-menubar-item"><u>F</u>ile</span>
          <span className="win95-menubar-item"><u>E</u>dit</span>
          <span className="win95-menubar-item"><u>P</u>eople</span>
          <span className="win95-menubar-item"><u>V</u>iew</span>
          <span className="win95-menubar-item" onClick={() => openWindow({
            id: 'away',
            type: 'away',
            title: 'Away Message',
            isMinimized: false,
            position: { x: 200, y: 150 },
            size: { width: 300, height: 280 }
          })}>
            <u>A</u>way
          </span>
          <span className="win95-menubar-item"><u>H</u>elp</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 p-1 bg-[#c0c0c0] border-b border-[#808080]">
          <button
            className={`win95-btn p-1 ${isBold ? 'border-inset' : ''}`}
            title="Bold"
            style={{ padding: '2px 8px', fontWeight: 'bold', minWidth: '32px' }}
            onClick={() => setIsBold(!isBold)}
          >
            B
          </button>
          <button
            className={`win95-btn p-1 ${isItalic ? 'border-inset' : ''}`}
            title="Italic"
            style={{ padding: '2px 8px', fontStyle: 'italic', minWidth: '32px' }}
            onClick={() => setIsItalic(!isItalic)}
          >
            I
          </button>
          <button
            className={`win95-btn p-1 ${isUnderline ? 'border-inset' : ''}`}
            title="Underline"
            style={{ padding: '2px 8px', textDecoration: 'underline', minWidth: '32px' }}
            onClick={() => setIsUnderline(!isUnderline)}
          >
            U
          </button>
          <div className="w-px h-5 bg-[#808080] mx-1" />
          <div className="relative">
            <button
              className="win95-btn p-1"
              title="Font Color"
              style={{ padding: '2px 8px', color: selectedColor || 'red', minWidth: '32px' }}
              onClick={() => setShowColorPicker(!showColorPicker)}
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
          <div className="w-px h-5 bg-[#808080] mx-1" />
          <div className="relative">
            <button
              className="win95-btn p-1"
              title="Emoticons"
              style={{ padding: '2px 8px', minWidth: '40px' }}
              onClick={() => setShowEmoticonPicker(!showEmoticonPicker)}
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
          <button
            className={`win95-btn p-1 ${!soundEnabled ? 'border-inset' : ''}`}
            title={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
            style={{ padding: '2px 8px', fontSize: '12px' }}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {isDemoMode && (
          <div className="bg-yellow-100 border-b border-yellow-300 px-3 py-1 text-xs text-yellow-800">
            Demo Mode: Configure Supabase for real-time chat
          </div>
        )}

        {/* Chat Messages */}
        <div className="chat-messages flex-1 p-2 m-2">
          {isLoading ? (
            <div className="text-center text-gray-500 py-4">Loading...</div>
          ) : chatItems.length === 0 ? (
            <div className="system-message">Welcome to the {currentRoom}! You are the first one here.</div>
          ) : (
            chatItems.map((item) => {
              if (item.type === 'event') {
                const event = item.data
                return (
                  <div key={event.id} className="door-notification">
                    {event.event_type === 'join' && `${event.username} has entered the room.`}
                    {event.event_type === 'leave' && `${event.username} has left the room.`}
                  </div>
                )
              } else {
                const msg = item.data
                return (
                  <div key={msg.id} className="mb-1">
                    {preferences.showTimestamps && (
                      <span className="text-gray-400 text-xs mr-2">
                        ({formatTime(msg.created_at)})
                      </span>
                    )}
                    <span
                      className={`font-bold cursor-pointer hover:underline ${getUsernameColor(msg.username)}`}
                      onClick={() => onViewProfile(msg.username)}
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
            />
            <button type="submit" className="win95-btn">Send</button>
          </div>
        </form>

        {/* Status Bar */}
        <div className="win95-statusbar">
          <div className="win95-statusbar-section">
            {onlineUsers.length} people in chat
          </div>
          <div className="win95-statusbar-section" style={{ flex: 2 }}>
            Connected as: {username}
          </div>
        </div>
      </div>
    </DraggableWindow>
  )
}
