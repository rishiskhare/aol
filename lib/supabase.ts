import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
// Support both PUBLIC_KEY (current) and ANON_KEY (legacy) for backwards compatibility
const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create a mock client for build time when env vars aren't available
let supabase: SupabaseClient

if (supabaseUrl && supabasePublicKey) {
  supabase = createClient(supabaseUrl, supabasePublicKey)
} else {
  // Create a dummy client that will fail gracefully at runtime
  // This allows the build to succeed
  supabase = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: null })
      }),
      order: () => ({
        limit: () => Promise.resolve({ data: [], error: null })
      })
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => ({})
      }),
      subscribe: () => ({})
    }),
    removeChannel: () => {}
  } as unknown as SupabaseClient

  if (typeof window !== 'undefined') {
    console.warn(
      'Supabase environment variables not configured. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLIC_KEY in .env.local'
    )
  }
}

export { supabase }

export type Message = {
  id: string
  username: string
  content: string
  created_at: string
  room?: string
}

export type Room = {
  id: string
  name: string
  invite_code: string
  created_by: string
  is_private: boolean
  created_at: string
}

export type RoomMember = {
  id: string
  room_id: string
  username: string
  joined_at: string
}

export type User = {
  username: string
  joined_at: string
  is_typing?: boolean
  away_message?: string | null
  last_activity?: string
  current_room?: string
}

export type PrivateMessage = {
  id: string
  from_user: string
  to_user: string
  content: string
  read: boolean
  created_at: string
}

export type Profile = {
  username: string
  display_name?: string
  location?: string
  bio?: string
  interests?: string
  quote?: string
  created_at: string
  updated_at: string
}

export type SystemEvent = {
  id: string
  event_type: 'join' | 'leave' | 'away' | 'back'
  username: string
  message?: string
  created_at: string
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublicKey)
}
