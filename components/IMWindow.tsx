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

  // O(1) dedup: track all message IDs we've already rendered
  const seenIdsRef = useRef<Set<string>>(new Set())
  // Broadcast channel ref — send on the already-subscribed instance
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  // Poll cursor — 30s lookback to absorb client/server clock skew
  const lastPollTimeRef = useRef<string>(new Date(Date.now() - 30000).toISOString())

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Message handler — pure ID-based dedup via seenIdsRef
  const addIncomingMessage = useCallback((newMsg: PrivateMessage) => {
    const isForThis =
      (newMsg.from_user === currentUser && newMsg.to_user === otherUser) ||
      (newMsg.from_user === otherUser && newMsg.to_user === currentUser)
    if (!isForThis) return
    if (seenIdsRef.current.has(newMsg.id)) return

    seenIdsRef.current.add(newMsg.id)
    if (newMsg.from_user === otherUser) {
      playIMReceived()
    }
    setMessages(prev => [...prev, newMsg])
  }, [currentUser, otherUser])

  // Poll for messages since last poll — catches anything realtime/broadcast misses
  const pollMessages = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    const since = lastPollTimeRef.current
    const { data } = await supabase
      .from('private_messages')
      .select('*')
      .or(`and(from_user.eq.${currentUser},to_user.eq.${otherUser}),and(from_user.eq.${otherUser},to_user.eq.${currentUser})`)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(100)

    if (!data || data.length === 0) return

    // Advance poll cursor to newest message (server timestamp)
    lastPollTimeRef.current = data[data.length - 1].created_at

    const newMsgs: PrivateMessage[] = []
    for (const msg of data) {
      if (seenIdsRef.current.has(msg.id)) continue
      seenIdsRef.current.add(msg.id)
      newMsgs.push(msg)
    }
    if (newMsgs.length > 0) {
      setMessages(prev => [...prev, ...newMsgs])
    }
  }, [currentUser, otherUser])

  // Fetch existing messages on mount
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

      if (data && data.length > 0) {
        for (const msg of data) {
          seenIdsRef.current.add(msg.id)
        }
        // Advance poll cursor past fetched messages
        lastPollTimeRef.current = data[data.length - 1].created_at
        setMessages(data)
      }
      setIsLoading(false)
    }

    fetchMessages()
  }, [currentUser, otherUser])

  // Subscribe to real-time updates — mirrors ChatRoom pattern exactly
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const channelName = `im-${[currentUser, otherUser].sort().join('-')}`

    // Poll immediately when channel becomes SUBSCRIBED — catches messages
    // sent during the async connection window that broadcast/postgres_changes missed.
    let hasPolledOnReady = false
    const pollOnceWhenReady = () => {
      if (!hasPolledOnReady) {
        hasPolledOnReady = true
        pollMessages()
      }
    }

    // Broadcast channel for instant IM delivery (bypasses DB round-trip)
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'new-im' }, (payload) => {
        addIncomingMessage(payload.payload as PrivateMessage)
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages' },
        (payload) => {
          addIncomingMessage(payload.new as PrivateMessage)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') pollOnceWhenReady()
      })

    // Store ref so handleSend can broadcast on this already-subscribed instance
    broadcastChannelRef.current = channel

    // Safety net: if channel takes too long to connect, poll anyway after 2s
    const safetyTimeout = setTimeout(() => pollOnceWhenReady(), 2000)

    // Polling fallback — catches anything realtime/broadcast misses
    const pollInterval = setInterval(() => {
      pollMessages()
    }, 3000)

    return () => {
      clearTimeout(safetyTimeout)
      clearInterval(pollInterval)
      broadcastChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [currentUser, otherUser, addIncomingMessage, pollMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const content = newMessage.trim()
    setNewMessage('')

    // Client-generated UUID — same ID for optimistic update, broadcast, and DB insert
    const msgId = crypto.randomUUID()
    const msg: PrivateMessage = {
      id: msgId,
      from_user: currentUser,
      to_user: otherUser,
      content,
      read: false,
      created_at: new Date().toISOString()
    }

    // Optimistic update first (non-blocking)
    seenIdsRef.current.add(msgId)
    setMessages(prev => [...prev, msg])
    playIMSent()

    if (isSupabaseConfigured()) {
      // Broadcast on the already-subscribed channel instance for instant delivery
      broadcastChannelRef.current?.send({
        type: 'broadcast',
        event: 'new-im',
        payload: msg,
      })

      // DB insert with client-generated UUID
      await supabase.from('private_messages').insert({
        id: msgId,
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
