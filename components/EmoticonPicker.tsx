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
    <div className="absolute top-full left-0 mt-1 z-[100]">
      <div className="win95-window p-2" style={{ width: '280px' }}>
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
              className="w-7 h-7 flex items-center justify-center hover:bg-blue-100 hover:scale-125 rounded cursor-pointer text-lg transition-transform"
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

        <div className="mt-2 text-xs text-gray-600 h-4 text-center">
          {hoveredEmoticon ? (
            <span><strong>{hoveredEmoticon.emoji}</strong> {hoveredEmoticon.description} - type <code className="bg-gray-100 px-1">{hoveredEmoticon.shortcut}</code></span>
          ) : (
            <span>Hover to preview, click to insert</span>
          )}
        </div>
      </div>
    </div>
  )
}
