'use client'

import { AOLWindow } from './AOLWindow'

interface WarnBlockDialogProps {
  targetUser: string
  warningLevel: number
  isBlocked: boolean
  onWarn: () => void
  onBlock: () => void
  onUnblock: () => void
  onClose: () => void
}

export function WarnBlockDialog({
  targetUser,
  warningLevel,
  isBlocked,
  onWarn,
  onBlock,
  onUnblock,
  onClose
}: WarnBlockDialogProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
      <AOLWindow title={`${targetUser} - Actions`} width="300px" onClose={onClose}>
        <div className="p-4 space-y-4">
          {/* Warning Level */}
          <div className="text-center">
            <div className="text-sm font-bold mb-2">Warning Level</div>
            <div className="relative w-full h-6 bg-white border-2" style={{ borderColor: '#808080 #fff #fff #808080' }}>
              <div
                className="h-full transition-all"
                style={{
                  width: `${warningLevel}%`,
                  backgroundColor: warningLevel < 30 ? '#00aa00' : warningLevel < 70 ? '#ffaa00' : '#ff0000'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                {warningLevel}%
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {warningLevel === 0 && 'No warnings'}
              {warningLevel > 0 && warningLevel < 30 && 'Low warning level'}
              {warningLevel >= 30 && warningLevel < 70 && 'Moderate warning level'}
              {warningLevel >= 70 && 'High warning level - user may be restricted'}
            </div>
          </div>

          {/* Block Status */}
          {isBlocked && (
            <div className="bg-red-100 border border-red-300 p-2 text-xs text-red-800 text-center">
              You have blocked this user. Their messages are hidden.
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              className="win95-btn w-full text-sm"
              onClick={() => {
                onWarn()
                onClose()
              }}
            >
              ⚠️ Warn User (+20%)
            </button>

            {isBlocked ? (
              <button
                className="win95-btn w-full text-sm"
                onClick={() => {
                  onUnblock()
                  onClose()
                }}
              >
                ✓ Unblock User
              </button>
            ) : (
              <button
                className="win95-btn w-full text-sm"
                onClick={() => {
                  onBlock()
                  onClose()
                }}
              >
                🚫 Block User
              </button>
            )}
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500">
            <p><strong>Warn:</strong> Increases their warning level. High levels may restrict chat abilities.</p>
            <p className="mt-1"><strong>Block:</strong> Hides all messages from this user.</p>
          </div>

          <div className="flex justify-end">
            <button className="win95-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </AOLWindow>
    </div>
  )
}
