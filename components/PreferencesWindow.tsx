'use client'

import { useState } from 'react'
import { useAOL } from '@/lib/store'
import { DraggableWindow } from './DraggableWindow'

export function PreferencesWindow() {
  const { closeWindow, preferences, updatePreferences, blockedUsers, unblockUser } = useAOL()
  const [activeTab, setActiveTab] = useState<'general' | 'sounds' | 'privacy'>('general')

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'sounds', label: 'Sounds' },
    { id: 'privacy', label: 'Privacy' }
  ] as const

  return (
    <DraggableWindow
      id="preferences"
      title="Preferences"
      width={380}
      height={320}
      initialPosition={{ x: 150, y: 100 }}
      onClose={() => closeWindow('preferences')}
    >
      <div className="flex flex-col h-full p-2">
        {/* Tabs */}
        <div className="flex border-b border-[#808080] mb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`px-4 py-1 text-xs ${
                activeTab === tab.id
                  ? 'bg-[#c0c0c0] border-t border-l border-r border-[#808080] -mb-px'
                  : 'bg-[#a0a0a0]'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-3">
              <div className="win95-groupbox p-2">
                <div className="win95-groupbox-label">Display</div>
                <label className="flex items-center gap-2 text-xs mb-2">
                  <input
                    type="checkbox"
                    checked={preferences.showTimestamps}
                    onChange={(e) => updatePreferences({ showTimestamps: e.target.checked })}
                  />
                  Show timestamps in chat
                </label>
                <label className="flex items-center gap-2 text-xs mb-2">
                  <input
                    type="checkbox"
                    checked={preferences.autoDetectLinks}
                    onChange={(e) => updatePreferences({ autoDetectLinks: e.target.checked })}
                  />
                  Auto-detect links
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={preferences.confirmClose}
                    onChange={(e) => updatePreferences({ confirmClose: e.target.checked })}
                  />
                  Confirm before closing windows
                </label>
              </div>

              <div className="win95-groupbox p-2">
                <div className="win95-groupbox-label">Font</div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs w-16">Family:</label>
                  <select
                    value={preferences.fontFamily}
                    onChange={(e) => updatePreferences({ fontFamily: e.target.value })}
                    className="win95-input flex-1 text-xs"
                  >
                    <option value="MS Sans Serif">MS Sans Serif</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs w-16">Size:</label>
                  <input
                    type="range"
                    min="10"
                    max="18"
                    value={preferences.fontSize}
                    onChange={(e) => updatePreferences({ fontSize: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-xs w-8">{preferences.fontSize}px</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sounds' && (
            <div className="space-y-3">
              <div className="win95-groupbox p-2">
                <div className="win95-groupbox-label">Sound Settings</div>
                <label className="flex items-center gap-2 text-xs mb-2">
                  <input
                    type="checkbox"
                    checked={preferences.soundEnabled}
                    onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
                  />
                  Enable sounds
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={preferences.notificationsEnabled}
                    onChange={(e) => updatePreferences({ notificationsEnabled: e.target.checked })}
                  />
                  Enable desktop notifications
                </label>
              </div>

              <div className="win95-groupbox p-2">
                <div className="win95-groupbox-label">Sound Events</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span>Buddy Sign On</span>
                    <button className="win95-btn text-xs" style={{ padding: '2px 8px' }}>Test</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Buddy Sign Off</span>
                    <button className="win95-btn text-xs" style={{ padding: '2px 8px' }}>Test</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>IM Received</span>
                    <button className="win95-btn text-xs" style={{ padding: '2px 8px' }}>Test</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>IM Sent</span>
                    <button className="win95-btn text-xs" style={{ padding: '2px 8px' }}>Test</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <div className="win95-groupbox p-2">
                <div className="win95-groupbox-label">Blocked Users</div>
                {blockedUsers.length === 0 ? (
                  <div className="text-xs text-gray-500 py-2">No blocked users</div>
                ) : (
                  <div className="max-h-32 overflow-y-auto">
                    {blockedUsers.map(user => (
                      <div key={user.username} className="flex justify-between items-center text-xs py-1">
                        <span>{user.username}</span>
                        <button
                          className="win95-btn text-xs"
                          style={{ padding: '2px 8px' }}
                          onClick={() => unblockUser(user.username)}
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="win95-groupbox p-2">
                <div className="win95-groupbox-label">Privacy Options</div>
                <label className="flex items-center gap-2 text-xs mb-2">
                  <input type="checkbox" />
                  Allow only buddies to IM me
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" />
                  Hide my online status
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#808080]">
          <button className="win95-btn" onClick={() => closeWindow('preferences')}>
            OK
          </button>
          <button className="win95-btn" onClick={() => closeWindow('preferences')}>
            Cancel
          </button>
        </div>
      </div>
    </DraggableWindow>
  )
}
