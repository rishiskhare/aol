'use client'

import { useState, useEffect } from 'react'

interface WelcomeScreenProps {
  onComplete: () => void
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [stage, setStage] = useState<'connecting' | 'authorizing' | 'welcome' | 'done'>('connecting')
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('Dialing...')

  useEffect(() => {
    // Stage 1: Connecting with progress bar
    const steps = [
      { time: 400, text: 'Dialing...', progress: 10 },
      { time: 900, text: 'Dialing... * SCREEEECH *', progress: 20 },
      { time: 1400, text: 'Handshaking... * BZZZZZT *', progress: 35 },
      { time: 1900, text: 'Handshaking... * DING DING DING *', progress: 50 },
      { time: 2400, text: 'Connecting to AOL.com...', progress: 65 },
    ]

    const timers: ReturnType<typeof setTimeout>[] = []

    for (const step of steps) {
      timers.push(setTimeout(() => {
        setStatusText(step.text)
        setProgress(step.progress)
      }, step.time))
    }

    // Stage 2: Authorizing
    timers.push(setTimeout(() => {
      setStage('authorizing')
      setStatusText('Checking password...')
      setProgress(75)
    }, 2900))

    timers.push(setTimeout(() => {
      setStatusText('Authorizing screen name...')
      setProgress(90)
    }, 3400))

    timers.push(setTimeout(() => {
      setProgress(100)
    }, 3900))

    // Stage 3: Welcome
    timers.push(setTimeout(() => {
      setStage('welcome')
    }, 4200))

    // Stage 4: Done
    timers.push(setTimeout(() => {
      setStage('done')
      onComplete()
    }, 6500))

    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  if (stage === 'done') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: '#008080' }}
    >
      {/* Welcome splash */}
      {stage === 'welcome' ? (
        <div className="win95-window" style={{ width: 420 }}>
          <div className="win95-titlebar">
            <span>Welcome to AOL!</span>
            <div className="flex gap-0.5">
              <button className="win95-btn-titlebar">_</button>
              <button className="win95-btn-titlebar">x</button>
            </div>
          </div>
          <div className="p-6 text-center animate-fade-in">
            {/* AOL Logo */}
            <div className="flex justify-center mb-3">
              <svg width="80" height="80" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" fill="#FFD700" stroke="#CC9900" strokeWidth="2"/>
                <path d="M12 32 L24 12 L36 32" stroke="#000080" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="24" cy="36" r="3" fill="#000080"/>
              </svg>
            </div>
            <div className="text-2xl font-bold mb-2" style={{ color: '#000080' }}>
              Welcome!
            </div>
            <div className="text-lg font-bold mb-4" style={{ color: '#000080' }}>
              You&apos;ve Got Mail!
            </div>
            <div className="win95-groupbox">
              <div className="win95-groupbox-title">Tip of the Day</div>
              <div className="text-xs text-left" style={{ lineHeight: 1.5 }}>
                Did you know? You can double-click a screen name in the
                People Here list to send them an Instant Message!
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Connection dialog */
        <div className="win95-window" style={{ width: 380 }}>
          <div className="win95-titlebar">
            <span>Connecting...</span>
            <div className="flex gap-0.5">
              <button className="win95-btn-titlebar">_</button>
              <button className="win95-btn-titlebar">x</button>
            </div>
          </div>
          <div className="p-5">
            {/* AOL Logo + Title */}
            <div className="flex items-center gap-3 mb-4">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" fill="#FFD700" stroke="#CC9900" strokeWidth="2"/>
                <path d="M12 32 L24 12 L36 32" stroke="#000080" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="24" cy="36" r="3" fill="#000080"/>
              </svg>
              <div>
                <div className="font-bold text-sm" style={{ color: '#000080' }}>
                  America Online
                </div>
                <div className="text-xs text-gray-600">v5.9</div>
              </div>
            </div>

            {/* Status area */}
            <div className="win95-border-inset p-2 mb-3" style={{ background: 'white' }}>
              <div className="flex items-center gap-2">
                <SignalAnimation stage={stage} />
                <div className="text-xs" style={{ fontFamily: "'MS Sans Serif', Tahoma, sans-serif" }}>
                  {statusText}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div
                className="win95-border-inset"
                style={{ height: 20, background: '#c0c0c0', padding: 2 }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: '#000080',
                    transition: 'width 0.4s ease-out',
                    imageRendering: 'pixelated',
                    backgroundImage: 'repeating-linear-gradient(90deg, #000080 0px, #000080 8px, #0000a0 8px, #0000a0 10px)',
                  }}
                />
              </div>
            </div>

            {/* Cancel button */}
            <div className="flex justify-center">
              <button className="win95-btn" style={{ minWidth: 90 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}

function SignalAnimation({ stage }: { stage: string }) {
  return (
    <div className="flex items-end gap-px" style={{ height: 16, width: 20 }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: 4 + i * 4,
            background: stage === 'authorizing' ? '#008000' : '#000080',
            animation: `signal-pulse 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes signal-pulse {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
