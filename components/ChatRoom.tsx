'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, Message, User, SystemEvent, isSupabaseConfigured } from '@/lib/supabase'
import { AOLWindow } from './AOLWindow'
import { EmoticonPicker } from './EmoticonPicker'
import { ColorPicker } from './ColorPicker'
import { IMWindow } from './IMWindow'
import { ProfileWindow } from './ProfileWindow'
import { AwayMessageDialog } from './AwayMessageDialog'
import { parseEmoticons } from '@/lib/emoticons'
import { parseFormatting, FormattedSegment, wrapWithTag } from '@/lib/formatting'
import {
  playDoorOpen,
  playDoorClose,
  playIMReceived,
  initAudio
} from '@/lib/sounds'

interface ChatRoomProps {
  username: string
  onSignOut: () => void
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

export function ChatRoom({ username, onSignOut }: ChatRoomProps) {
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
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)

  // Windows/dialogs
  const [openIMs, setOpenIMs] = useState<{ username: string; position: { x: number; y: number } }[]>([])
  const [showProfile, setShowProfile] = useState<string | null>(null)
  const [showAwayDialog, setShowAwayDialog] = useState(false)
  const [awayMessage, setAwayMessage] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousUsersRef = useRef<Set<string>>(new Set())

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Initialize audio on first interaction
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
        setMessages(demoMessages)
        setOnlineUsers([...demoUsers, { username, joined_at: new Date().toISOString() }])
        previousUsersRef.current = new Set(demoUsers.map(u => u.username))
        setIsLoading(false)
        return
      }

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100)

      if (messagesData) {
        setMessages(messagesData)
      }

      // Fetch online users
      const { data: usersData } = await supabase
        .from('online_users')
        .select('*')
        .order('joined_at', { ascending: true })

      if (usersData) {
        setOnlineUsers(usersData)
        previousUsersRef.current = new Set(usersData.map((u: User) => u.username))
      }

      // Fetch recent system events
      const { data: eventsData } = await supabase
        .from('system_events')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(20)

      if (eventsData) {
        setSystemEvents(eventsData)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [username])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const messagesChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message
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
            // Play sound for messages from others
            if (newMsg.username !== username && soundEnabled) {
              playIMReceived()
            }
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    const usersChannel = supabase
      .channel('online_users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'online_users' },
        async (payload) => {
          const { data } = await supabase
            .from('online_users')
            .select('*')
            .order('joined_at', { ascending: true })

          if (data) {
            const newUsernames = new Set(data.map((u: User) => u.username))
            const oldUsernames = previousUsersRef.current

            // Check for new users (door open)
            for (const u of data) {
              if (!oldUsernames.has(u.username) && u.username !== username) {
                if (soundEnabled) playDoorOpen()
                // Add join event locally
                setSystemEvents((prev) => [...prev, {
                  id: `local-${Date.now()}`,
                  event_type: 'join' as const,
                  username: u.username,
                  created_at: new Date().toISOString()
                }])
              }
            }

            // Check for users who left (door close)
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

            // Update typing users
            const typing = data.filter((u: User) => u.is_typing && u.username !== username).map((u: User) => u.username)
            setTypingUsers(typing)
          }
        }
      )
      .subscribe()

    const eventsChannel = supabase
      .channel('system_events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_events' },
        (payload) => {
          const event = payload.new as SystemEvent
          setSystemEvents((prev) => [...prev, event])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(usersChannel)
      supabase.removeChannel(eventsChannel)
    }
  }, [username, soundEnabled])

  // Register user as online
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const registerUser = async () => {
      await supabase
        .from('online_users')
        .upsert({ username, is_typing: false, away_message: null }, { onConflict: 'username' })

      // Post join event
      await supabase.from('system_events').insert({
        event_type: 'join',
        username,
        message: `${username} has entered the room.`
      })
    }

    registerUser()

    // Cleanup: remove user and post leave event
    const handleBeforeUnload = async () => {
      await supabase.from('system_events').insert({
        event_type: 'leave',
        username,
        message: `${username} has left the room.`
      })
      await supabase.from('online_users').delete().eq('username', username)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      handleBeforeUnload()
    }
  }, [username])

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

    setNewMessage('')

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (isSupabaseConfigured()) {
      await supabase
        .from('online_users')
        .update({ is_typing: false })
        .eq('username', username)
    }

    // Optimistic update
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

  const handleSetAway = async (message: string | null) => {
    setAwayMessage(message)

    if (isSupabaseConfigured()) {
      await supabase
        .from('online_users')
        .update({ away_message: message })
        .eq('username', username)

      if (message) {
        await supabase.from('system_events').insert({
          event_type: 'away',
          username,
          message: `${username} is now away: ${message}`
        })
      } else {
        await supabase.from('system_events').insert({
          event_type: 'back',
          username,
          message: `${username} is back.`
        })
      }
    }
  }

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.from('system_events').insert({
        event_type: 'leave',
        username,
        message: `${username} has left the room.`
      })
      await supabase.from('online_users').delete().eq('username', username)
    }
    onSignOut()
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

    return segments.map((segment: FormattedSegment, i: number) => (
      <span
        key={i}
        style={{
          fontWeight: segment.bold ? 'bold' : 'normal',
          fontStyle: segment.italic ? 'italic' : 'normal',
          textDecoration: segment.underline ? 'underline' : 'none',
          color: segment.color || 'inherit'
        }}
      >
        {segment.text}
      </span>
    ))
  }

  // Combine messages and events for timeline
  const chatItems: ChatItem[] = [
    ...messages.map((m): ChatItem => ({ type: 'message', data: m })),
    ...systemEvents.map((e): ChatItem => ({ type: 'event', data: e }))
  ].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime())

  return (
    <div className="flex gap-2 p-4 h-screen" onClick={handleUserInteraction}>
      {/* Main Chat Window */}
      <AOLWindow
        title="Town Square - AOL Chat"
        width="700px"
        height="100%"
        className="flex-1"
      >
        {/* Menu Bar */}
        <div className="win95-menubar flex">
          <span className="win95-menubar-item"><u>F</u>ile</span>
          <span className="win95-menubar-item"><u>E</u>dit</span>
          <span className="win95-menubar-item"><u>P</u>eople</span>
          <span className="win95-menubar-item"><u>V</u>iew</span>
          <span className="win95-menubar-item" onClick={() => setShowAwayDialog(true)}>
            <u>A</u>way
          </span>
          <span className="win95-menubar-item"><u>H</u>elp</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 p-1 bg-[#c0c0c0] border-b border-[#808080]">
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
            <div className="system-message">Welcome to the Town Square! You are the first one here.</div>
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
            Connected as: {username} {awayMessage ? '(Away)' : ''}
          </div>
        </div>
      </AOLWindow>

      {/* People Here Sidebar */}
      <AOLWindow title="People Here" width="180px" height="100%">
        <div className="p-2 flex-1 flex flex-col">
          <div className="text-xs mb-2 text-gray-600">
            {onlineUsers.length} {onlineUsers.length === 1 ? 'person' : 'people'} in room
          </div>
          <div className="user-list flex-1 p-1">
            {onlineUsers.map((user) => (
              <div
                key={user.username}
                className={`flex items-center gap-2 p-1 cursor-pointer hover:bg-blue-100 ${
                  user.username === username ? 'bg-blue-50' : ''
                }`}
                onDoubleClick={() => openIM(user.username)}
              >
                <BuddyIcon username={user.username} isAway={!!user.away_message} />
                <span className={`${user.username === username ? 'font-bold' : ''} ${user.away_message ? 'text-gray-400' : ''}`}>
                  {user.username}
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
                const selected = onlineUsers.find(u => u.username !== username)
                if (selected) setShowProfile(selected.username)
              }}
              type="button"
            >
              Get Profile
            </button>
            <button
              className="win95-btn text-xs"
              onClick={() => {
                const selected = onlineUsers.find(u => u.username !== username)
                if (selected) openIM(selected.username)
              }}
              type="button"
            >
              Send IM
            </button>
            <button className="win95-btn text-xs" type="button">Ignore</button>
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
