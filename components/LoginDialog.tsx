'use client'

import { useState } from 'react'
import { AOLWindow } from './AOLWindow'

interface LoginDialogProps {
  onLogin: (username: string) => void
}

export function LoginDialog({ onLogin }: LoginDialogProps) {
  const [username, setUsername] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsConnecting(true)

    // Simulate dial-up connection delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    onLogin(username.trim())
  }

  return (
    <div className="login-dialog">
      <AOLWindow title="Sign On - AOL Instant Messenger" width="340px">
        <div className="p-4">
          {/* AOL Logo */}
          <div className="flex justify-center mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" fill="#FFD700" stroke="#CC9900" strokeWidth="2"/>
                  <path d="M12 32 L24 12 L36 32" stroke="#000080" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="24" cy="36" r="3" fill="#000080"/>
                </svg>
              </div>
              <div className="text-xl font-bold" style={{ color: '#000080' }}>
                AOL Instant Messenger
              </div>
              <div className="text-xs text-gray-600">Version 5.9</div>
            </div>
          </div>

          {isConnecting ? (
            <div className="text-center py-4">
              <div className="mb-4">
                <ConnectingAnimation />
              </div>
              <div className="text-sm">Connecting to AOL...</div>
              <div className="text-xs text-gray-500 mt-2">
                * Dial-up modem sounds *
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="field-label block mb-1">
                  Screen Name:
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="win95-input w-full"
                  placeholder="Enter your screen name"
                  maxLength={16}
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className="field-label block mb-1">
                  Password:
                </label>
                <input
                  type="password"
                  className="win95-input w-full"
                  placeholder="(not required for demo)"
                  disabled
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input type="checkbox" id="savePassword" />
                <label htmlFor="savePassword" className="text-xs">Save password</label>
              </div>

              <div className="flex justify-center gap-2">
                <button
                  type="submit"
                  className="win95-btn"
                  disabled={!username.trim()}
                >
                  Sign On
                </button>
                <button type="button" className="win95-btn">
                  Help
                </button>
              </div>

              <div className="text-center mt-4 text-xs text-gray-500">
                New to AOL? Get your free trial today!
              </div>
            </form>
          )}
        </div>
      </AOLWindow>
    </div>
  )
}

function ConnectingAnimation() {
  return (
    <div className="flex justify-center items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-3 h-3 bg-blue-800 rounded-full"
          style={{
            animation: `bounce 0.6s ease-in-out ${i * 0.1}s infinite alternate`
          }}
        />
      ))}
      <style jsx>{`
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}
