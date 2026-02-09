-- AOL Chat Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database

-- Messages table (chat room messages)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Online users table
CREATE TABLE IF NOT EXISTS online_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_typing BOOLEAN DEFAULT FALSE,
  away_message TEXT DEFAULT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  current_room TEXT DEFAULT 'Town Square'
);

-- Private messages (IMs)
CREATE TABLE IF NOT EXISTS private_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles
CREATE TABLE IF NOT EXISTS profiles (
  username TEXT PRIMARY KEY,
  display_name TEXT,
  location TEXT,
  bio TEXT,
  interests TEXT,
  quote TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System events (join/leave notifications)
CREATE TABLE IF NOT EXISTS system_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'join', 'leave', 'away', 'back'
  username TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_online_users_username ON online_users(username);
CREATE INDEX IF NOT EXISTS idx_private_messages_to_user ON private_messages(to_user, created_at);
CREATE INDEX IF NOT EXISTS idx_private_messages_from_user ON private_messages(from_user, created_at);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON system_events(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Anyone can read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT WITH CHECK (true);

-- Online users policies
CREATE POLICY "Anyone can read online users" ON online_users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert online users" ON online_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete online users" ON online_users FOR DELETE USING (true);
CREATE POLICY "Anyone can update online users" ON online_users FOR UPDATE USING (true);

-- Private messages policies
CREATE POLICY "Anyone can read private messages" ON private_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert private messages" ON private_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update private messages" ON private_messages FOR UPDATE USING (true);

-- Profiles policies
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON profiles FOR UPDATE USING (true);

-- System events policies
CREATE POLICY "Anyone can read system events" ON system_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert system events" ON system_events FOR INSERT WITH CHECK (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE online_users;
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE system_events;

-- Function to clean up old online users (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_online_users()
RETURNS void AS $$
BEGIN
  DELETE FROM online_users WHERE last_activity < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old messages (keep last 1000)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM messages
  WHERE id NOT IN (
    SELECT id FROM messages
    ORDER BY created_at DESC
    LIMIT 1000
  );
END;
$$ LANGUAGE plpgsql;

-- Rooms table (private invite-only rooms)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL,
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room members table (tracks who has redeemed an invite)
CREATE TABLE IF NOT EXISTS room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, username)
);

-- Add room column to messages (backwards-compatible)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS room TEXT DEFAULT 'Town Square';

-- Indexes for rooms
CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON rooms(invite_code);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_username ON room_members(username);
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room);
CREATE INDEX IF NOT EXISTS idx_messages_room_created_at ON messages(room, created_at);

-- RLS for rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rooms" ON rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read room members" ON room_members FOR SELECT USING (true);
CREATE POLICY "Anyone can insert room members" ON room_members FOR INSERT WITH CHECK (true);

-- Realtime for rooms
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_members;

-- Function to clean up old system events (keep last 100)
CREATE OR REPLACE FUNCTION cleanup_old_system_events()
RETURNS void AS $$
BEGIN
  DELETE FROM system_events
  WHERE id NOT IN (
    SELECT id FROM system_events
    ORDER BY created_at DESC
    LIMIT 100
  );
END;
$$ LANGUAGE plpgsql;
