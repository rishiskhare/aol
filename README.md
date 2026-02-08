# AOL Chat - A Retro Instant Messenger Experience

A nostalgic recreation of the classic AOL Instant Messenger chat experience, built with Next.js and Supabase for real-time messaging.

```
   _____ _____ __
  |  _  |     |  |
  |     |  |  |  |__
  |__|__|_____|_____|

  You've Got Mail!
```

## Features

- Authentic Windows 95/98 UI styling
- Classic AOL chat room experience
- Real-time messaging with Supabase
- Online users list ("People Here")
- Nostalgic "You've Got Mail!" welcome screen
- Demo mode for testing without Supabase

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs in **demo mode** without Supabase configuration - you can test the UI immediately!

## Supabase Setup (For Real-time Chat)

1. Create a free project at [supabase.com](https://supabase.com)

2. Run the SQL schema in `supabase/schema.sql`:
   - Go to Dashboard > SQL Editor > New Query
   - Paste the contents of `supabase/schema.sql`
   - Click "Run"

3. Enable Realtime:
   - Go to Dashboard > Database > Replication
   - Enable replication for `messages` and `online_users` tables

4. Get your API credentials:
   - Go to Dashboard > Settings > API
   - Copy your **Project URL** and **public** key (under Project API keys)

5. Create `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

6. Add your credentials to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLIC_KEY=your-public-key
   ```

7. Restart the dev server

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4 (Windows 95/AOL theme)
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Deployment**: Vercel-ready

## Project Structure

```
aol/
├── app/
│   ├── globals.css      # Windows 95 theme styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main page
├── components/
│   ├── AOLWindow.tsx    # Windows 95 window component
│   ├── ChatRoom.tsx     # Main chat interface
│   ├── LoginDialog.tsx  # Sign-on dialog
│   └── WelcomeScreen.tsx # "You've Got Mail" screen
├── lib/
│   └── supabase.ts      # Supabase client
└── supabase/
    └── schema.sql       # Database schema
```

## Classic AOL Phrases

- a/s/l? (age/sex/location)
- brb (be right back)
- ttyl (talk to you later)
- lol (laughing out loud)
- g2g (got to go)
- kk (okay)

---

*Remember: Don't give out your password to anyone, even if they say they work for AOL!*
