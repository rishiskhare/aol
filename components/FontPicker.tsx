'use client'

import { messageFonts } from '@/lib/formatting'

interface FontPickerProps {
  onSelect: (font: string) => void
  onClose: () => void
  currentFont?: string
}

export function FontPicker({ onSelect, onClose, currentFont }: FontPickerProps) {
  return (
    <div className="absolute top-full left-0 mt-1 z-[100]">
      <div className="win95-window p-2" style={{ width: '180px' }}>
        <div className="win95-titlebar mb-2">
          <span className="text-xs">Font</span>
          <button className="win95-btn-titlebar" onClick={onClose}>
            ×
          </button>
        </div>

        <div
          className="bg-white border-2 max-h-48 overflow-y-auto"
          style={{ borderColor: '#808080 #fff #fff #808080' }}
        >
          {messageFonts.map((font) => (
            <div
              key={font.name}
              className={`px-2 py-1.5 cursor-pointer text-sm hover:bg-blue-100 ${
                currentFont === font.value ? 'bg-[#000080] text-white' : ''
              }`}
              style={{ fontFamily: font.value || 'inherit' }}
              onClick={() => {
                onSelect(font.value)
                onClose()
              }}
            >
              {font.name}
            </div>
          ))}
        </div>

        <div className="mt-2 text-xs text-gray-600 text-center">
          {currentFont ? `Selected: ${messageFonts.find(f => f.value === currentFont)?.name}` : 'Click to select font'}
        </div>
      </div>
    </div>
  )
}
