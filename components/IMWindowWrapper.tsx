'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAOL } from '@/lib/store'
import { DraggableWindow } from './DraggableWindow'
import { supabase, PrivateMessage, isSupabaseConfigured } from '@/lib/supabase'
import { parseEmoticons } from '@/lib/emoticons'
import { parseFormatting, FormattedSegment } from '@/lib/formatting'
import { playIMReceived, playIMSent } from '@/lib/sounds'

interface IMWindowWrapperProps {
  windowId: string
  recipient: string
}

export function IMWindowWrapper({ windowId, recipient }: IMWindowWrapperProps) {
  const { closeWindow, username, warnUser, blockUser, preferences, openWindow } = useAOL()
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch existing messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!isSupabaseConfigured()) {
        setIsLoading(false)
        return
      }

      const { data } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(from_user.eq.${username},to_user.eq.${recipient}),and(from_user.eq.${recipient},to_user.eq.${username})`)
        .order('created_at', { ascending: true })
        .limit(50)

      if (data) {
        setMessages(data)
      }
      setIsLoading(false)
    }

    fetchMessages()
  }, [username, recipient])

  // Subscribe to new messages
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const channelName = `im-${[username, recipient].sort().join('-')}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages'
        },
        (payload) => {
          const newMsg = payload.new as PrivateMessage
          const isForThisConversation =
            (newMsg.from_user === username && newMsg.to_user === recipient) ||
            (newMsg.from_user === recipient && newMsg.to_user === username)

          if (isForThisConversation) {
            setMessages((prev) => {
              const isDuplicate = prev.some(
                (msg) =>
                  msg.id === newMsg.id ||
                  (msg.id.startsWith('local-') &&
                    msg.from_user === newMsg.from_user &&
                    msg.content === newMsg.content &&
                    Math.abs(new Date(msg.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000)
              )
              if (isDuplicate) {
                return prev.map((msg) =>
                  msg.id.startsWith('local-') &&
                  msg.from_user === newMsg.from_user &&
                  msg.content === newMsg.content
                    ? newMsg
                    : msg
                )
              }
              if (newMsg.from_user === recipient && preferences.soundEnabled) {
                playIMReceived()
              }
              return [...prev, newMsg]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [username, recipient, preferences.soundEnabled])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const content = newMessage.trim()
    setNewMessage('')

    const optimisticMsg: PrivateMessage = {
      id: `local-${Date.now()}`,
      from_user: username,
      to_user: recipient,
      content,
      read: false,
      created_at: new Date().toISOString()
    }
    setMessages((prev) => [...prev, optimisticMsg])

    if (preferences.soundEnabled) {
      playIMSent()
    }

    if (isSupabaseConfigured()) {
      await supabase.from('private_messages').insert({
        from_user: username,
        to_user: recipient,
        content
      })
    }
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

  const handleViewProfile = () => {
    openWindow({
      id: `profile-${recipient}`,
      type: 'profile',
      title: `${recipient}'s Profile`,
      isMinimized: false,
      position: { x: 250, y: 120 },
      size: { width: 400, height: 400 },
      data: { targetUsername: recipient }
    })
  }

  return (
    <DraggableWindow
      id={windowId}
      title={`IM - ${recipient}`}
      width={380}
      height={400}
      initialPosition={{ x: 300 + Math.random() * 50, y: 100 + Math.random() * 50 }}
      onClose={() => closeWindow(windowId)}
    >
      <div className="flex flex-col h-full">
        {/* Header with recipient info */}
        <div className="flex items-center gap-2 p-2 bg-[#c0c0c0] border-b border-[#808080]">
          <div className="w-8 h-8 rounded-sm bg-[#FFD700] flex items-center justify-center text-sm font-bold border border-[#CC9900]">
            {recipient[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">{recipient}</div>
            <div className="text-xs text-gray-600">Online</div>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages flex-1 p-2 m-2 text-xs">
          {isLoading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-gray-500 text-center">
              Start a conversation with {recipient}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="mb-2">
                {preferences.showTimestamps && (
                  <div className="text-gray-400" style={{ fontSize: '10px' }}>
                    {formatTime(msg.created_at)}
                  </div>
                )}
                <div>
                  <span
                    className="font-bold"
                    style={{ color: msg.from_user === username ? '#0000ff' : '#ff0000' }}
                  >
                    {msg.from_user}:
                  </span>{' '}
                  {renderFormattedText(msg.content)}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-2 pt-0">
          <div className="flex gap-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="win95-input flex-1 text-xs"
              placeholder="Type a message..."
              maxLength={500}
              autoFocus
            />
            <button type="submit" className="win95-btn text-xs" style={{ minWidth: '50px' }}>
              Send
            </button>
          </div>
        </form>

        {/* Action buttons */}
        <div className="flex justify-between px-2 pb-2">
          <button
            className="win95-btn text-xs"
            style={{ minWidth: '60px' }}
            onClick={() => warnUser(recipient)}
          >
            Warn
          </button>
          <button
            className="win95-btn text-xs"
            style={{ minWidth: '60px' }}
            onClick={() => {
              blockUser(recipient)
              closeWindow(windowId)
            }}
          >
            Block
          </button>
          <button
            className="win95-btn text-xs"
            style={{ minWidth: '60px' }}
            onClick={handleViewProfile}
          >
            Info
          </button>
        </div>
      </div>
    </DraggableWindow>
  )
}
