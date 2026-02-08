// Text formatting utilities for AOL-style rich text

export interface FormattedSegment {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
  font?: string
  size?: string
  isLink?: boolean
  url?: string
}

// URL regex pattern
const URL_PATTERN = /(https?:\/\/[^\s<>\[\]]+|www\.[^\s<>\[\]]+)/gi

// Simple BBCode-like formatting tags
// [b]bold[/b], [i]italic[/i], [u]underline[/u], [color=red]text[/color]

export function parseFormatting(text: string): FormattedSegment[] {
  const segments: FormattedSegment[] = []
  let currentText = ''
  let bold = false
  let italic = false
  let underline = false
  let color: string | undefined = undefined
  let font: string | undefined = undefined
  let size: string | undefined = undefined

  let i = 0
  while (i < text.length) {
    // Check for opening tags
    if (text.slice(i, i + 3) === '[b]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      bold = true
      i += 3
      continue
    }
    if (text.slice(i, i + 4) === '[/b]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      bold = false
      i += 4
      continue
    }
    if (text.slice(i, i + 3) === '[i]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      italic = true
      i += 3
      continue
    }
    if (text.slice(i, i + 4) === '[/i]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      italic = false
      i += 4
      continue
    }
    if (text.slice(i, i + 3) === '[u]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      underline = true
      i += 3
      continue
    }
    if (text.slice(i, i + 4) === '[/u]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      underline = false
      i += 4
      continue
    }

    // Check for color tag
    const colorMatch = text.slice(i).match(/^\[color=([^\]]+)\]/)
    if (colorMatch) {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      color = colorMatch[1]
      i += colorMatch[0].length
      continue
    }
    if (text.slice(i, i + 8) === '[/color]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      color = undefined
      i += 8
      continue
    }

    // Check for font tag
    const fontMatch = text.slice(i).match(/^\[font=([^\]]+)\]/)
    if (fontMatch) {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      font = fontMatch[1]
      i += fontMatch[0].length
      continue
    }
    if (text.slice(i, i + 7) === '[/font]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      font = undefined
      i += 7
      continue
    }

    // Check for size tag
    const sizeMatch = text.slice(i).match(/^\[size=([^\]]+)\]/)
    if (sizeMatch) {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      size = sizeMatch[1]
      i += sizeMatch[0].length
      continue
    }
    if (text.slice(i, i + 7) === '[/size]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color, font, size })
        currentText = ''
      }
      size = undefined
      i += 7
      continue
    }

    currentText += text[i]
    i++
  }

  if (currentText) {
    segments.push({ text: currentText, bold, italic, underline, color, font, size })
  }

  // Now parse each segment for links
  const finalSegments: FormattedSegment[] = []
  for (const segment of segments) {
    const linkSegments = parseLinks(segment)
    finalSegments.push(...linkSegments)
  }

  return finalSegments.length > 0 ? finalSegments : [{ text }]
}

// Parse a segment for URLs and split into link/non-link parts
function parseLinks(segment: FormattedSegment): FormattedSegment[] {
  const { text, bold, italic, underline, color, font, size } = segment
  const results: FormattedSegment[] = []

  let lastIndex = 0
  let match: RegExpExecArray | null

  // Reset regex
  URL_PATTERN.lastIndex = 0

  while ((match = URL_PATTERN.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      results.push({
        text: text.slice(lastIndex, match.index),
        bold, italic, underline, color, font, size
      })
    }

    // Add the URL as a link
    let url = match[0]
    // Add https:// if it starts with www.
    const href = url.startsWith('www.') ? 'https://' + url : url

    results.push({
      text: url,
      bold, italic, underline, color, font, size,
      isLink: true,
      url: href
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    results.push({
      text: text.slice(lastIndex),
      bold, italic, underline, color, font, size
    })
  }

  return results.length > 0 ? results : [segment]
}

// Available colors for the color picker
export const messageColors = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#ff0000' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Green', value: '#008000' },
  { name: 'Purple', value: '#800080' },
  { name: 'Orange', value: '#ff8000' },
  { name: 'Teal', value: '#008080' },
  { name: 'Maroon', value: '#800000' },
  { name: 'Navy', value: '#000080' },
  { name: 'Olive', value: '#808000' },
  { name: 'Magenta', value: '#ff00ff' },
  { name: 'Cyan', value: '#00ffff' },
]

// Wrap selected text with formatting tags
export function wrapWithTag(text: string, tag: string, value?: string): string {
  if (value) {
    return `[${tag}=${value}]${text}[/${tag}]`
  }
  return `[${tag}]${text}[/${tag}]`
}

// Available fonts for the font picker (classic AOL/90s fonts)
export const messageFonts = [
  { name: 'Default', value: '' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Impact', value: 'Impact, sans-serif' },
  { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Palatino', value: 'Palatino Linotype, serif' },
]

// Available font sizes
export const messageSizes = [
  { name: 'Tiny', value: '10px' },
  { name: 'Small', value: '12px' },
  { name: 'Normal', value: '14px' },
  { name: 'Medium', value: '16px' },
  { name: 'Large', value: '18px' },
  { name: 'X-Large', value: '22px' },
  { name: 'XX-Large', value: '26px' },
]
