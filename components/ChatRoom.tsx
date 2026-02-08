'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, Message, User, isSupabaseConfigured } from '@/lib/supabase'
import { AOLWindow } from './AOLWindow'

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
  { id: '3', username: 'xXAngelXx', content: 'does anyone have that new Britney Spears song??', created_at: new Date(Date.now() - 280000).toISOString() },
  { id: '4', username: 'SurfDude98', content: 'i can send it 2 u but my mom is using the phone lol', created_at: new Date(Date.now() - 270000).toISOString() },
  { id: '5', username: 'GameMaster', content: 'brb gonna go play some Runescape', created_at: new Date(Date.now() - 260000).toISOString() },
  { id: '6', username: 'xXAngelXx', content: 'lol kk ttyl!', created_at: new Date(Date.now() - 250000).toISOString() },
]

const demoUsers: User[] = [
  { username: 'SurfDude98', joined_at: new Date().toISOString() },
  { username: 'CoolKid2000', joined_at: new Date().toISOString() },
  { username: 'xXAngelXx', joined_at: new Date().toISOString() },
  { username: 'GameMaster', joined_at: new Date().toISOString() },
]

export function ChatRoom({ username, onSignOut }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch initial messages and users
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)

      if (!isSupabaseConfigured()) {
        // Demo mode
        setIsDemoMode(true)
        setMessages(demoMessages)
        setOnlineUsers([...demoUsers, { username, joined_at: new Date().toISOString() }])
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
          setMessages((prev) => [...prev, newMsg])
        }
      )
      .subscribe()

    const usersChannel = supabase
      .channel('online_users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'online_users' },
        async () => {
          // Refetch users on any change
          const { data } = await supabase
            .from('online_users')
            .select('*')
            .order('joined_at', { ascending: true })
          if (data) {
            setOnlineUsers(data)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(usersChannel)
    }
  }, [])

  // Register user as online
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const registerUser = async () => {
      // Try to insert user
      await supabase
        .from('online_users')
        .upsert({ username }, { onConflict: 'username' })
    }

    registerUser()

    // Cleanup: remove user when leaving
    return () => {
      supabase.from('online_users').delete().eq('username', username)
    }
  }, [username])

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const messageContent = newMessage.trim()
    setNewMessage('')

    if (isDemoMode) {
      // In demo mode, add message locally
      const newMsg: Message = {
        id: Date.now().toString(),
        username,
        content: messageContent,
        created_at: new Date().toISOString()
      }
      setMessages((prev) => [...prev, newMsg])
      return
    }

    await supabase.from('messages').insert({
      username,
      content: messageContent
    })
  }

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.from('online_users').delete().eq('username', username)
    }
    onSignOut()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="flex gap-2 p-4 h-screen">
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
          <span className="win95-menubar-item"><u>H</u>elp</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 p-1 bg-[#c0c0c0] border-b border-[#808080]">
          <ToolbarButton icon="B" title="Bold" />
          <ToolbarButton icon="I" title="Italic" style={{ fontStyle: 'italic' }} />
          <ToolbarButton icon="U" title="Underline" style={{ textDecoration: 'underline' }} />
          <div className="w-px h-4 bg-[#808080] mx-1" />
          <ToolbarButton icon="A" title="Font Color" style={{ color: 'red' }} />
          <ToolbarButton icon="A" title="Font Size" />
          <div className="w-px h-4 bg-[#808080] mx-1" />
          <ToolbarButton icon=":-)" title="Emoticons" />
          <ToolbarButton icon="URL" title="Insert Link" />
        </div>

        {/* Demo Mode Warning */}
        {isDemoMode && (
          <div className="bg-yellow-100 border-b border-yellow-300 px-3 py-1 text-xs text-yellow-800">
            Demo Mode: Configure Supabase in .env.local for real-time chat
          </div>
        )}

        {/* Chat Messages */}
        <div
          ref={chatContainerRef}
          className="chat-messages flex-1 p-2 m-2"
        >
          {isLoading ? (
            <div className="text-center text-gray-500 py-4">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="system-message">
              Welcome to the Town Square! You are the first one here.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="mb-1">
                <span className="text-gray-400 text-xs mr-2">
                  ({formatTime(msg.created_at)})
                </span>
                <span className={`font-bold ${getUsernameColor(msg.username)}`}>
                  {msg.username}:
                </span>{' '}
                <span>{msg.content}</span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-2 pt-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="win95-input flex-1"
              placeholder="Type your message here..."
              maxLength={500}
            />
            <button type="submit" className="win95-btn">
              Send
            </button>
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
              >
                <BuddyIcon username={user.username} />
                <span className={user.username === username ? 'font-bold' : ''}>
                  {user.username}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <button className="win95-btn text-xs" type="button">
              Get Profile
            </button>
            <button className="win95-btn text-xs" type="button">
              Send IM
            </button>
            <button className="win95-btn text-xs" type="button">
              Ignore
            </button>
            <div className="win95-separator" />
            <button
              className="win95-btn text-xs"
              onClick={handleSignOut}
              type="button"
            >
              Sign Off
            </button>
          </div>
        </div>
      </AOLWindow>
    </div>
  )
}

function ToolbarButton({
  icon,
  title,
  style
}: {
  icon: string
  title: string
  style?: React.CSSProperties
}) {
  return (
    <button
      className="win95-btn p-1 min-w-0"
      title={title}
      style={{ ...style, padding: '2px 6px' }}
      type="button"
    >
      {icon}
    </button>
  )
}

function BuddyIcon({ username }: { username: string }) {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  const colorIndex = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length

  return (
    <div
      className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold"
      style={{
        backgroundColor: colors[colorIndex],
        border: '1px solid rgba(0,0,0,0.2)'
      }}
    >
      {username[0].toUpperCase()}
    </div>
  )
}
