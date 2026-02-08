'use client'

import { useState, useEffect } from 'react'

interface WelcomeScreenProps {
  onComplete: () => void
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [stage, setStage] = useState<'connecting' | 'welcome' | 'done'>('connecting')

  useEffect(() => {
    // Simulate dial-up connection
    const timer1 = setTimeout(() => {
      setStage('welcome')
    }, 2500)

    const timer2 = setTimeout(() => {
      setStage('done')
      onComplete()
    }, 5000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [onComplete])

  if (stage === 'done') return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="text-center">
        {stage === 'connecting' && (
          <div className="space-y-4">
            <DialUpAnimation />
            <div className="text-white text-lg">Connecting to AOL...</div>
            <div className="text-gray-400 text-sm font-mono">
              * SCREEEECH * BZZZZZT * DING DING DING *
            </div>
          </div>
        )}

        {stage === 'welcome' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-center">
              <svg width="120" height="120" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" fill="#FFD700" stroke="#CC9900" strokeWidth="2"/>
                <path d="M12 32 L24 12 L36 32" stroke="#000080" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="24" cy="36" r="3" fill="#000080"/>
              </svg>
            </div>
            <div className="text-4xl font-bold text-yellow-400 animate-pulse">
              Welcome!
            </div>
            <div className="text-2xl text-white">
              You&apos;ve Got Mail!
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}

function DialUpAnimation() {
  return (
    <div className="flex justify-center gap-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-2 h-12 bg-green-500 rounded"
          style={{
            animation: `bar-bounce 0.5s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes bar-bounce {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}
