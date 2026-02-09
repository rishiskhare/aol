'use client'

import { useState, useEffect } from 'react'
import { supabase, Profile, isSupabaseConfigured } from '@/lib/supabase'
import { AOLWindow } from './AOLWindow'

interface ProfileWindowProps {
  username: string
  isOwnProfile: boolean
  onClose: () => void
  onSendIM?: (username: string) => void
  onAddBuddy?: (username: string) => void
}

const defaultProfile: Profile = {
  username: '',
  display_name: '',
  location: '',
  bio: '',
  interests: '',
  quote: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

export function ProfileWindow({ username, isOwnProfile, onClose, onSendIM, onAddBuddy }: ProfileWindowProps) {
  const [profile, setProfile] = useState<Profile>({ ...defaultProfile, username })
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editForm, setEditForm] = useState<Profile>({ ...defaultProfile, username })

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isSupabaseConfigured()) {
        // Demo profile
        setProfile({
          username,
          display_name: username,
          location: 'Cyberspace',
          bio: 'Just another AOL user enjoying the information superhighway!',
          interests: 'Chatting, Making Friends, The Internet',
          quote: 'You\'ve got mail!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        setIsLoading(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (data) {
        setProfile(data)
        setEditForm(data)
      } else {
        // If no profile exists, create a default one locally
        // It will be saved to DB when user clicks Save
        const newProfile: Profile = {
          ...defaultProfile,
          username,
          display_name: username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setProfile(newProfile)
        setEditForm(newProfile)
      }
      setIsLoading(false)
    }

    fetchProfile()
  }, [username])

  const handleSave = async () => {
    if (isSupabaseConfigured()) {
      await supabase
        .from('profiles')
        .upsert({
          ...editForm,
          updated_at: new Date().toISOString()
        })
    }
    setProfile(editForm)
    setIsEditing(false)
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
      <AOLWindow
        title={`${username}'s Profile`}
        width="400px"
        onClose={onClose}
      >
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">Loading profile...</div>
          ) : isEditing ? (
            // Edit mode
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Display Name:</label>
                <input
                  type="text"
                  value={editForm.display_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  className="win95-input w-full"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Location:</label>
                <input
                  type="text"
                  value={editForm.location || ''}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="win95-input w-full"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">About Me:</label>
                <textarea
                  value={editForm.bio || ''}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="win95-input w-full"
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Interests:</label>
                <input
                  type="text"
                  value={editForm.interests || ''}
                  onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
                  className="win95-input w-full"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Favorite Quote:</label>
                <input
                  type="text"
                  value={editForm.quote || ''}
                  onChange={(e) => setEditForm({ ...editForm, quote: e.target.value })}
                  className="win95-input w-full"
                  maxLength={200}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="win95-btn"
                  onClick={() => setIsEditing(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="win95-btn"
                  onClick={handleSave}
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            // View mode
            <div>
              {/* Profile header with icon */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-16 h-16 rounded flex items-center justify-center text-2xl font-bold"
                  style={{
                    backgroundColor: '#FFD700',
                    border: '2px solid #CC9900'
                  }}
                >
                  {username[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-lg">{profile.display_name || username}</div>
                  <div className="text-xs text-gray-600">Screen Name: {username}</div>
                  <div className="text-xs text-gray-600">Member Since: {memberSince}</div>
                </div>
              </div>

              <div className="win95-separator" />

              {/* Profile fields */}
              <div className="space-y-2 text-sm">
                {profile.location && (
                  <div>
                    <span className="font-bold">Location:</span> {profile.location}
                  </div>
                )}
                {profile.bio && (
                  <div>
                    <span className="font-bold">About Me:</span>
                    <div className="ml-2 text-xs">{profile.bio}</div>
                  </div>
                )}
                {profile.interests && (
                  <div>
                    <span className="font-bold">Interests:</span> {profile.interests}
                  </div>
                )}
                {profile.quote && (
                  <div>
                    <span className="font-bold">Quote:</span>
                    <div className="ml-2 italic text-xs">&ldquo;{profile.quote}&rdquo;</div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-center gap-2 mt-4">
                {isOwnProfile ? (
                  <button
                    className="win95-btn"
                    onClick={() => {
                      setEditForm(profile)
                      setIsEditing(true)
                    }}
                    type="button"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button className="win95-btn" type="button" onClick={() => { onSendIM?.(username); onClose() }}>Send IM</button>
                    <button className="win95-btn" type="button" onClick={() => { onAddBuddy?.(username); onClose() }}>Add Buddy</button>
                  </>
                )}
                <button className="win95-btn" onClick={onClose} type="button">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </AOLWindow>
    </div>
  )
}
