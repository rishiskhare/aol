// AOL Sound Effects using Web Audio API
// Generates sounds that mimic the classic AOL experience

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

// Classic AOL "You've Got Mail" - simplified version
export function playYouveGotMail(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Three tone sequence similar to AOL
    const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5
    const durations = [0.15, 0.15, 0.3]

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.frequency.value = freq
      osc.type = 'sine'

      const startTime = now + (i * 0.2)
      gain.gain.setValueAtTime(0.3, startTime)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + durations[i])

      osc.start(startTime)
      osc.stop(startTime + durations[i])
    })
  } catch (e) {
    console.warn('Could not play sound:', e)
  }
}

// Door open sound (user enters room)
export function playDoorOpen(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Ascending tone
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15)
    osc.type = 'sine'

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

    osc.start(now)
    osc.stop(now + 0.2)
  } catch (e) {
    console.warn('Could not play sound:', e)
  }
}

// Door close sound (user leaves room)
export function playDoorClose(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Descending tone
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.setValueAtTime(500, now)
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.15)
    osc.type = 'sine'

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

    osc.start(now)
    osc.stop(now + 0.2)
  } catch (e) {
    console.warn('Could not play sound:', e)
  }
}

// IM received sound
export function playIMReceived(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Two quick tones
    const frequencies = [880, 1108.73] // A5, C#6

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.frequency.value = freq
      osc.type = 'sine'

      const startTime = now + (i * 0.1)
      gain.gain.setValueAtTime(0.2, startTime)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1)

      osc.start(startTime)
      osc.stop(startTime + 0.1)
    })
  } catch (e) {
    console.warn('Could not play sound:', e)
  }
}

// IM sent sound
export function playIMSent(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.value = 1200
    osc.type = 'sine'

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05)

    osc.start(now)
    osc.stop(now + 0.05)
  } catch (e) {
    console.warn('Could not play sound:', e)
  }
}

// Buddy online sound
export function playBuddyOnline(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Happy ascending arpeggio
    const frequencies = [440, 554.37, 659.25] // A4, C#5, E5

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.frequency.value = freq
      osc.type = 'triangle'

      const startTime = now + (i * 0.08)
      gain.gain.setValueAtTime(0.2, startTime)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15)

      osc.start(startTime)
      osc.stop(startTime + 0.15)
    })
  } catch (e) {
    console.warn('Could not play sound:', e)
  }
}

// Warning/error sound
export function playWarning(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.value = 200
    osc.type = 'square'

    gain.gain.setValueAtTime(0.1, now)
    gain.gain.setValueAtTime(0.1, now + 0.1)
    gain.gain.setValueAtTime(0, now + 0.1)
    gain.gain.setValueAtTime(0.1, now + 0.2)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

    osc.start(now)
    osc.stop(now + 0.3)
  } catch (e) {
    console.warn('Could not play sound:', e)
  }
}

// Initialize audio context on first user interaction
export function initAudio(): void {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
  } catch (e) {
    console.warn('Could not init audio:', e)
  }
}
