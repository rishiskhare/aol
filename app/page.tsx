'use client'

import { useState, useEffect, useCallback } from 'react'
import { LoginDialog } from '@/components/LoginDialog'
import { ChatRoom } from '@/components/ChatRoom'
import { WelcomeScreen } from '@/components/WelcomeScreen'

export default function Home() {
  const [username, setUsername] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Check for saved username in localStorage
    const savedUsername = localStorage.getItem('aol_username')
    if (savedUsername) {
      setUsername(savedUsername)
    }
  }, [])

  const handleLogin = (name: string) => {
    setShowWelcome(true)
    localStorage.setItem('aol_username', name)
    setUsername(name)
  }

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false)
  }, [])

  const handleSignOut = () => {
    localStorage.removeItem('aol_username')
    setUsername(null)
  }

  // Don't render until client-side to avoid hydration mismatch
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="win95-window p-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      {showWelcome && <WelcomeScreen onComplete={handleWelcomeComplete} />}
      {username ? (
        <ChatRoom username={username} onSignOut={handleSignOut} />
      ) : (
        <LoginDialog onLogin={handleLogin} />
      )}
    </main>
  )
}
