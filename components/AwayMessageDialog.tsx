'use client'

import { useState } from 'react'
import { AOLWindow } from './AOLWindow'

interface AwayMessageDialogProps {
  currentMessage: string | null
  onSave: (message: string | null) => void
  onClose: () => void
}

const presetMessages = [
  'I am away from my computer right now.',
  'I am currently out to lunch. MMM... food.',
  'I am not available because I am playing a game that takes up the whole screen.',
  'I am in the bathroom. (That was probably too much info.)',
  'Sorry, I ran away.',
  'I went to get a drink. brb!',
]

export function AwayMessageDialog({ currentMessage, onSave, onClose }: AwayMessageDialogProps) {
  const [message, setMessage] = useState(currentMessage || '')
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)

  const handleSave = () => {
    onSave(message.trim() || null)
    onClose()
  }

  const handleClear = () => {
    onSave(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
      <AOLWindow title="Set Away Message" width="350px" onClose={onClose}>
        <div className="p-4">
          <div className="mb-3">
            <label className="text-xs font-bold block mb-1">
              Away Message:
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                setSelectedPreset(null)
              }}
              className="win95-input w-full"
              rows={4}
              maxLength={200}
              placeholder="Enter your away message..."
            />
          </div>

          <div className="mb-3">
            <label className="text-xs font-bold block mb-1">
              Or select a preset:
            </label>
            <div
              className="h-24 overflow-y-auto bg-white border-2 p-1"
              style={{ borderColor: '#808080 #fff #fff #808080' }}
            >
              {presetMessages.map((preset, index) => (
                <div
                  key={index}
                  className={`text-xs p-1 cursor-pointer ${
                    selectedPreset === index ? 'bg-blue-600 text-white' : 'hover:bg-blue-100'
                  }`}
                  onClick={() => {
                    setSelectedPreset(index)
                    setMessage(preset)
                  }}
                >
                  {preset}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button className="win95-btn" onClick={handleClear} type="button">
              I&apos;m Back
            </button>
            <div className="flex gap-2">
              <button className="win95-btn" onClick={onClose} type="button">
                Cancel
              </button>
              <button className="win95-btn" onClick={handleSave} type="button">
                Set Away
              </button>
            </div>
          </div>
        </div>
      </AOLWindow>
    </div>
  )
}
