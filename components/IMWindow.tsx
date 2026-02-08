'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, PrivateMessage, isSupabaseConfigured } from '@/lib/supabase'
import { AOLWindow } from './AOLWindow'
import { parseEmoticons } from '@/lib/emoticons'
import { parseFormatting, FormattedSegment } from '@/lib/formatting'
import { playIMReceived, playIMSent } from '@/lib/sounds'

interface IMWindowProps {
  currentUser: string
  otherUser: string
  awayMessage?: string | null
  onClose: () => void
  initialPosition?: { x: number; y: number }
}

export function IMWindow({
  currentUser,
  otherUser,
  awayMessage,
  onClose,
  initialPosition = { x: 100, y: 100 }
}: IMWindowProps) {
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [position] = useState(initialPosition)

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
        .or(`and(from_user.eq.${currentUser},to_user.eq.${otherUser}),and(from_user.eq.${otherUser},to_user.eq.${currentUser})`)
        .order('created_at', { ascending: true })
        .limit(50)

      if (data) {
        setMessages(data)
      }
      setIsLoading(false)
    }

    fetchMessages()
  }, [currentUser, otherUser])

  // Subscribe to new messages
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const channel = supabase
      .channel(`im-${currentUser}-${otherUser}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `to_user=eq.${currentUser}`
        },
        (payload) => {
          const newMsg = payload.new as PrivateMessage
          if (newMsg.from_user === otherUser) {
            setMessages((prev) => [...prev, newMsg])
            playIMReceived()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser, otherUser])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const content = newMessage.trim()
    setNewMessage('')

    // Optimistic update
    const optimisticMsg: PrivateMessage = {
      id: `local-${Date.now()}`,
      from_user: currentUser,
      to_user: otherUser,
      content,
      read: false,
      created_at: new Date().toISOString()
    }
    setMessages((prev) => [...prev, optimisticMsg])
    playIMSent()

    if (isSupabaseConfigured()) {
      await supabase.from('private_messages').insert({
        from_user: currentUser,
        to_user: otherUser,
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

  return (
    <div
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
    >
      <AOLWindow
        title={`${otherUser} - Instant Message`}
        width="350px"
        height="400px"
        onClose={onClose}
      >
        <div className="flex flex-col h-full">
          {/* Away message warning */}
          {awayMessage && (
            <div className="bg-yellow-100 border-b border-yellow-300 px-2 py-1 text-xs">
              <strong>{otherUser}</strong> is away: {awayMessage}
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages flex-1 p-2 m-2 text-xs">
            {isLoading ? (
              <div className="text-center text-gray-500">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-gray-500 text-center">
                Start a conversation with {otherUser}
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="mb-2">
                  <div className="text-gray-400" style={{ fontSize: '10px' }}>
                    {formatTime(msg.created_at)}
                  </div>
                  <div>
                    <span
                      className="font-bold"
                      style={{ color: msg.from_user === currentUser ? '#0000ff' : '#ff0000' }}
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
              />
              <button type="submit" className="win95-btn text-xs" style={{ minWidth: '50px' }}>
                Send
              </button>
            </div>
          </form>

          {/* Warn button at bottom */}
          <div className="flex justify-between px-2 pb-2">
            <button className="win95-btn text-xs" style={{ minWidth: '60px' }} type="button">
              Warn
            </button>
            <button className="win95-btn text-xs" style={{ minWidth: '60px' }} type="button">
              Block
            </button>
            <button className="win95-btn text-xs" style={{ minWidth: '60px' }} type="button">
              Info
            </button>
          </div>
        </div>
      </AOLWindow>
    </div>
  )
}
