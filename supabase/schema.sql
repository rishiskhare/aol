-- AOL Chat Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database

-- Messages table
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
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_online_users_username ON online_users(username);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages
CREATE POLICY "Anyone can read messages" ON messages
  FOR SELECT USING (true);

-- Allow anyone to insert messages
CREATE POLICY "Anyone can insert messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read online users
CREATE POLICY "Anyone can read online users" ON online_users
  FOR SELECT USING (true);

-- Allow anyone to insert online users
CREATE POLICY "Anyone can insert online users" ON online_users
  FOR INSERT WITH CHECK (true);

-- Allow users to delete their own online status
CREATE POLICY "Anyone can delete online users" ON online_users
  FOR DELETE USING (true);

-- Allow upsert for online users
CREATE POLICY "Anyone can update online users" ON online_users
  FOR UPDATE USING (true);

-- Enable realtime for both tables
-- Note: You also need to enable this in Supabase Dashboard > Database > Replication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE online_users;

-- Optional: Function to clean up old online users (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_online_users()
RETURNS void AS $$
BEGIN
  DELETE FROM online_users WHERE joined_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Optional: Function to clean up old messages (keep last 1000)
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
