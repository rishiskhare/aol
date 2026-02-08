// Classic AOL/AIM Emoticons
// Maps text shortcuts to emoji representations

export interface Emoticon {
  shortcut: string
  alt: string[]  // Alternative shortcuts
  emoji: string
  description: string
}

export const emoticons: Emoticon[] = [
  { shortcut: ':)', alt: [':-)', ':smile:'], emoji: '😊', description: 'Smile' },
  { shortcut: ':(', alt: [':-(', ':sad:'], emoji: '😞', description: 'Sad' },
  { shortcut: ';)', alt: [';-)', ':wink:'], emoji: '😉', description: 'Wink' },
  { shortcut: ':D', alt: [':-D', ':grin:'], emoji: '😄', description: 'Big Grin' },
  { shortcut: ':P', alt: [':-P', ':tongue:'], emoji: '😛', description: 'Tongue Out' },
  { shortcut: ':O', alt: [':-O', ':surprised:'], emoji: '😮', description: 'Surprised' },
  { shortcut: ":'(", alt: [":'-(",':cry:'], emoji: '😢', description: 'Crying' },
  { shortcut: ':/', alt: [':-/', ':unsure:'], emoji: '😕', description: 'Unsure' },
  { shortcut: ':X', alt: [':-X', ':sealed:'], emoji: '🤐', description: 'Sealed Lips' },
  { shortcut: 'B)', alt: ['B-)', ':cool:'], emoji: '😎', description: 'Cool' },
  { shortcut: ':*', alt: [':-*', ':kiss:'], emoji: '😘', description: 'Kiss' },
  { shortcut: '<3', alt: [':heart:'], emoji: '❤️', description: 'Heart' },
  { shortcut: '</3', alt: [':brokenheart:'], emoji: '💔', description: 'Broken Heart' },
  { shortcut: ':@', alt: [':angry:'], emoji: '😠', description: 'Angry' },
  { shortcut: 'XD', alt: ['xD', ':laugh:'], emoji: '😆', description: 'Laughing' },
  { shortcut: '-_-', alt: [':meh:'], emoji: '😑', description: 'Meh' },
  { shortcut: 'o_O', alt: ['O_o', ':confused:'], emoji: '🤨', description: 'Confused' },
  { shortcut: ':3', alt: [':cat:'], emoji: '😺', description: 'Cat Face' },
  { shortcut: '^^', alt: [':happy:'], emoji: '😊', description: 'Happy' },
  { shortcut: '>:)', alt: [':evil:'], emoji: '😈', description: 'Evil Grin' },
  { shortcut: ':angel:', alt: ['O:)'], emoji: '😇', description: 'Angel' },
  { shortcut: ':lol:', alt: [], emoji: '🤣', description: 'LOL' },
  { shortcut: ':rofl:', alt: [], emoji: '🤣', description: 'ROFL' },
  { shortcut: ':thumbsup:', alt: [':+1:'], emoji: '👍', description: 'Thumbs Up' },
  { shortcut: ':thumbsdown:', alt: [':-1:'], emoji: '👎', description: 'Thumbs Down' },
  { shortcut: ':wave:', alt: [], emoji: '👋', description: 'Wave' },
  { shortcut: ':clap:', alt: [], emoji: '👏', description: 'Clap' },
  { shortcut: ':fire:', alt: [], emoji: '🔥', description: 'Fire' },
  { shortcut: ':100:', alt: [], emoji: '💯', description: '100' },
  { shortcut: ':star:', alt: [], emoji: '⭐', description: 'Star' },
]

// Convert emoticon shortcuts in text to emojis
export function parseEmoticons(text: string): string {
  let result = text

  for (const emoticon of emoticons) {
    // Escape special regex characters in shortcut
    const escaped = emoticon.shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'g')
    result = result.replace(regex, emoticon.emoji)

    // Also check alternatives
    for (const alt of emoticon.alt) {
      const altEscaped = alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const altRegex = new RegExp(altEscaped, 'g')
      result = result.replace(altRegex, emoticon.emoji)
    }
  }

  return result
}

// Get all emoticons for the picker
export function getEmoticonList(): Emoticon[] {
  return emoticons
}
