'use client'

import { messageColors } from '@/lib/formatting'

interface ColorPickerProps {
  onSelect: (color: string) => void
  onClose: () => void
  currentColor?: string
}

export function ColorPicker({ onSelect, onClose, currentColor }: ColorPickerProps) {
  return (
    <div className="absolute top-full left-0 mt-1 z-[100]">
      <div className="win95-window p-2" style={{ width: '160px' }}>
        <div className="win95-titlebar mb-2">
          <span className="text-xs">Text Color</span>
          <button className="win95-btn-titlebar" onClick={onClose}>
            ×
          </button>
        </div>

        <div
          className="grid gap-1 p-2 bg-white border-2"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderColor: '#808080 #fff #fff #808080'
          }}
        >
          {messageColors.map((color) => (
            <button
              key={color.value}
              className="w-6 h-6 border cursor-pointer hover:scale-110 transition-transform"
              style={{
                backgroundColor: color.value,
                borderColor: currentColor === color.value ? '#000' : '#808080',
                borderWidth: currentColor === color.value ? '2px' : '1px'
              }}
              onClick={() => {
                onSelect(color.value)
                onClose()
              }}
              title={color.name}
              type="button"
            />
          ))}
        </div>

        <div className="mt-2 text-xs text-gray-600 text-center">
          {currentColor ? `Selected: ${messageColors.find(c => c.value === currentColor)?.name || currentColor}` : 'Click a color to select'}
        </div>
      </div>
    </div>
  )
}
