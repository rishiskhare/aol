'use client'

import { useRef, useEffect } from 'react'
import { messageSizes } from '@/lib/formatting'

interface SizePickerProps {
  onSelect: (size: string) => void
  onClose: () => void
  currentSize?: string
}

export function SizePicker({ onSelect, onClose, currentSize }: SizePickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  return (
    <div className="absolute top-full left-0 mt-1 z-[100]" ref={ref}>
      <div className="win95-window p-2" style={{ width: '140px' }}>
        <div className="win95-titlebar mb-2">
          <span className="text-xs">Font Size</span>
        </div>

        <div
          className="bg-white border-2 max-h-48 overflow-y-auto"
          style={{ borderColor: '#808080 #fff #fff #808080' }}
        >
          {messageSizes.map((size) => (
            <div
              key={size.value}
              className={`px-2 py-1.5 cursor-pointer hover:bg-blue-100 ${currentSize === size.value ? 'bg-[#000080] text-white' : ''
                }`}
              style={{ fontSize: size.value }}
              onClick={() => {
                onSelect(size.value)
                onClose()
              }}
            >
              {size.name}
            </div>
          ))}
        </div>

        <div className="mt-2 text-xs text-gray-600 text-center">
          {currentSize ? `Selected: ${messageSizes.find(s => s.value === currentSize)?.name}` : 'Click to select size'}
        </div>
      </div>
    </div>
  )
}
