'use client'

import { useState } from 'react'
import { emoticons, Emoticon } from '@/lib/emoticons'

interface EmoticonPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function EmoticonPicker({ onSelect, onClose }: EmoticonPickerProps) {
  const [hoveredEmoticon, setHoveredEmoticon] = useState<Emoticon | null>(null)

  return (
    <div className="absolute bottom-full left-0 mb-1 z-50">
      <div className="win95-window p-2" style={{ width: '240px' }}>
        <div className="win95-titlebar mb-2">
          <span className="text-xs">Select a Smiley</span>
          <button
            className="win95-btn-titlebar"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div
          className="grid gap-1 p-2 bg-white border-2"
          style={{
            gridTemplateColumns: 'repeat(8, 1fr)',
            borderColor: '#808080 #fff #fff #808080'
          }}
        >
          {emoticons.map((emoticon) => (
            <button
              key={emoticon.shortcut}
              className="w-6 h-6 flex items-center justify-center hover:bg-blue-100 rounded cursor-pointer text-base"
              onClick={() => {
                onSelect(emoticon.emoji)
                onClose()
              }}
              onMouseEnter={() => setHoveredEmoticon(emoticon)}
              onMouseLeave={() => setHoveredEmoticon(null)}
              title={`${emoticon.description} ${emoticon.shortcut}`}
              type="button"
            >
              {emoticon.emoji}
            </button>
          ))}
        </div>

        <div className="mt-2 text-xs text-gray-600 h-4">
          {hoveredEmoticon ? (
            <span>{hoveredEmoticon.description} - type {hoveredEmoticon.shortcut}</span>
          ) : (
            <span>Click an emoticon to insert</span>
          )}
        </div>
      </div>
    </div>
  )
}
