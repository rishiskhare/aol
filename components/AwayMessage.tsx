'use client'

import { useState, useEffect } from 'react'
import { useAOL } from '@/lib/store'
import { DraggableWindow } from './DraggableWindow'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export function AwayMessage() {
  const { closeWindow, username } = useAOL()
  const [awayMessage, setAwayMessage] = useState('')
  const [isAway, setIsAway] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('')

  const presetMessages = [
    'Be right back!',
    'Away from keyboard',
    'Out to lunch',
    'In a meeting',
    'Gone for the day',
    'Busy - Do not disturb'
  ]

  useEffect(() => {
    // Check current away status
    if (!isSupabaseConfigured()) return

    const checkStatus = async () => {
      const { data } = await supabase
        .from('online_users')
        .select('away_message')
        .eq('username', username)
        .single()

      if (data?.away_message) {
        setAwayMessage(data.away_message)
        setIsAway(true)
      }
    }

    checkStatus()
  }, [username])

  const handleSetAway = async () => {
    if (!isSupabaseConfigured()) return

    const message = selectedPreset || awayMessage || 'Away'
    await supabase
      .from('online_users')
      .update({ away_message: message })
      .eq('username', username)

    setIsAway(true)
    setAwayMessage(message)
  }

  const handleReturnFromAway = async () => {
    if (!isSupabaseConfigured()) return

    await supabase
      .from('online_users')
      .update({ away_message: null })
      .eq('username', username)

    setIsAway(false)
    closeWindow('away')
  }

  return (
    <DraggableWindow
      id="away"
      title="Away Message"
      width={300}
      height={280}
      initialPosition={{ x: 200, y: 150 }}
      onClose={() => closeWindow('away')}
    >
      <div className="flex flex-col h-full p-3">
        {isAway ? (
          <>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-4">🌙</div>
              <div className="text-sm font-bold mb-2">You are currently Away</div>
              <div className="text-xs text-gray-600 mb-4">
                "{awayMessage}"
              </div>
            </div>
            <button className="win95-btn" onClick={handleReturnFromAway}>
              I'm Back!
            </button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <label className="text-xs font-bold block mb-1">Preset Messages:</label>
              <select
                value={selectedPreset}
                onChange={(e) => {
                  setSelectedPreset(e.target.value)
                  setAwayMessage(e.target.value)
                }}
                className="win95-input w-full text-xs"
              >
                <option value="">-- Select a preset --</option>
                {presetMessages.map(msg => (
                  <option key={msg} value={msg}>{msg}</option>
                ))}
              </select>
            </div>

            <div className="mb-3 flex-1">
              <label className="text-xs font-bold block mb-1">Custom Message:</label>
              <textarea
                value={awayMessage}
                onChange={(e) => {
                  setAwayMessage(e.target.value)
                  setSelectedPreset('')
                }}
                className="win95-input w-full text-xs h-full"
                placeholder="Enter your away message..."
              />
            </div>

            <div className="flex gap-2">
              <button className="win95-btn flex-1" onClick={handleSetAway}>
                Set Away
              </button>
              <button className="win95-btn flex-1" onClick={() => closeWindow('away')}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </DraggableWindow>
  )
}
