'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Room, isSupabaseConfigured } from '@/lib/supabase'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function redeemInvite() {
      if (!isSupabaseConfigured()) {
        setError('Chat service is not configured.')
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('invite_code', code)
        .single()

      if (fetchError || !data) {
        setError('Invalid or expired invite link.')
        setLoading(false)
        return
      }

      const room = data as Room
      localStorage.setItem('aol_pending_invite', JSON.stringify({
        roomId: room.id,
        roomName: room.name,
        inviteCode: room.invite_code,
      }))
      router.push('/')
    }

    redeemInvite()
  }, [code, router])

  if (loading && !error) {
    return (
      <div className="min-h-screen bg-[#008080] flex items-center justify-center">
        <div className="win95-window p-8">
          <div className="text-center">Validating invite...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#008080] flex items-center justify-center">
        <div className="win95-window" style={{ width: '350px' }}>
          <div className="win95-titlebar">
            <span className="win95-titlebar-text">AOL Instant Messenger</span>
          </div>
          <div className="p-4 flex gap-3 items-start">
            <div className="text-3xl">⚠️</div>
            <div>
              <p className="font-bold mb-2">Invite Error</p>
              <p className="text-sm mb-4">{error}</p>
              <button
                className="win95-btn"
                onClick={() => router.push('/')}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
