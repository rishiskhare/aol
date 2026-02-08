// Text formatting utilities for AOL-style rich text

export interface FormattedSegment {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
}

// Simple BBCode-like formatting tags
// [b]bold[/b], [i]italic[/i], [u]underline[/u], [color=red]text[/color]

export function parseFormatting(text: string): FormattedSegment[] {
  const segments: FormattedSegment[] = []
  let currentText = ''
  let bold = false
  let italic = false
  let underline = false
  let color: string | undefined = undefined

  let i = 0
  while (i < text.length) {
    // Check for opening tags
    if (text.slice(i, i + 3) === '[b]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color })
        currentText = ''
      }
      bold = true
      i += 3
      continue
    }
    if (text.slice(i, i + 4) === '[/b]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color })
        currentText = ''
      }
      bold = false
      i += 4
      continue
    }
    if (text.slice(i, i + 3) === '[i]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color })
        currentText = ''
      }
      italic = true
      i += 3
      continue
    }
    if (text.slice(i, i + 4) === '[/i]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color })
        currentText = ''
      }
      italic = false
      i += 4
      continue
    }
    if (text.slice(i, i + 3) === '[u]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color })
        currentText = ''
      }
      underline = true
      i += 3
      continue
    }
    if (text.slice(i, i + 4) === '[/u]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color })
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
        segments.push({ text: currentText, bold, italic, underline, color })
        currentText = ''
      }
      color = colorMatch[1]
      i += colorMatch[0].length
      continue
    }
    if (text.slice(i, i + 8) === '[/color]') {
      if (currentText) {
        segments.push({ text: currentText, bold, italic, underline, color })
        currentText = ''
      }
      color = undefined
      i += 8
      continue
    }

    currentText += text[i]
    i++
  }

  if (currentText) {
    segments.push({ text: currentText, bold, italic, underline, color })
  }

  return segments.length > 0 ? segments : [{ text }]
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
