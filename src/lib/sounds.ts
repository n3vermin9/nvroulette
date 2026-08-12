/**
 * Lightweight Web Audio SFX for games — no asset files.
 * Call unlockAudio() from a user gesture before the first play.
 */

export type SoundId =
  | 'click'
  | 'bet'
  | 'start'
  | 'spin'
  | 'card'
  | 'gem'
  | 'peg'
  | 'land'
  | 'cash'
  | 'win'
  | 'lose'
  | 'boom'
  | 'tick'

type ToneOpts = {
  freq: number
  duration: number
  type?: OscillatorType
  gain?: number
  attack?: number
  decay?: number
  slideTo?: number
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let unlocked = false

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)
  }
  return ctx
}

function bus(): GainNode | null {
  audio()
  return master
}

/** Resume AudioContext after a tap / click (required on iOS). */
export function unlockAudio(): void {
  const c = audio()
  if (!c) return
  unlocked = true
  if (c.state === 'suspended') void c.resume()
}

function tone(opts: ToneOpts): void {
  const c = audio()
  const out = bus()
  if (!c || !out || !unlocked) return
  if (c.state === 'suspended') void c.resume()

  const now = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  const attack = opts.attack ?? 0.008
  const decay = opts.decay ?? opts.duration
  const peak = opts.gain ?? 0.12

  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.freq, now)
  if (opts.slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, opts.slideTo),
      now + opts.duration,
    )
  }

  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(peak, now + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(attack + 0.01, decay))

  osc.connect(g)
  g.connect(out)
  osc.start(now)
  osc.stop(now + opts.duration + 0.02)
}

function noiseBurst(duration: number, gain = 0.08, filterFreq = 1800): void {
  const c = audio()
  const out = bus()
  if (!c || !out || !unlocked) return
  if (c.state === 'suspended') void c.resume()

  const len = Math.max(1, Math.floor(c.sampleRate * duration))
  const buffer = c.createBuffer(1, len, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  }

  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = filterFreq
  filter.Q.value = 0.8
  const g = c.createGain()
  const now = c.currentTime
  g.gain.setValueAtTime(gain, now)
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  src.connect(filter)
  filter.connect(g)
  g.connect(out)
  src.start(now)
  src.stop(now + duration + 0.02)
}

function chord(freqs: number[], duration: number, gain = 0.07): void {
  for (const freq of freqs) {
    tone({ freq, duration, type: 'triangle', gain: gain / freqs.length, decay: duration })
  }
}

const lastPegAt = { t: 0 }

export function playSound(id: SoundId): void {
  unlockAudio()

  switch (id) {
    case 'click':
      tone({ freq: 620, duration: 0.05, type: 'triangle', gain: 0.05 })
      break
    case 'bet':
      tone({ freq: 880, duration: 0.06, type: 'square', gain: 0.035 })
      tone({ freq: 1320, duration: 0.08, type: 'triangle', gain: 0.03, attack: 0.012 })
      break
    case 'start':
      tone({ freq: 320, duration: 0.1, type: 'sawtooth', gain: 0.045, slideTo: 520 })
      tone({ freq: 640, duration: 0.14, type: 'triangle', gain: 0.04, attack: 0.02 })
      break
    case 'spin':
      noiseBurst(0.22, 0.06, 900)
      tone({ freq: 240, duration: 0.35, type: 'sawtooth', gain: 0.04, slideTo: 90 })
      break
    case 'card':
      noiseBurst(0.05, 0.045, 3200)
      tone({ freq: 420, duration: 0.07, type: 'triangle', gain: 0.04 })
      break
    case 'gem':
      tone({ freq: 740, duration: 0.08, type: 'sine', gain: 0.06 })
      tone({ freq: 1110, duration: 0.12, type: 'triangle', gain: 0.045, attack: 0.015 })
      break
    case 'peg': {
      const now = performance.now()
      if (now - lastPegAt.t < 28) return
      lastPegAt.t = now
      tone({
        freq: 980 + Math.random() * 420,
        duration: 0.035,
        type: 'triangle',
        gain: 0.028,
      })
      break
    }
    case 'land':
      tone({ freq: 280, duration: 0.09, type: 'sine', gain: 0.07 })
      tone({ freq: 420, duration: 0.12, type: 'triangle', gain: 0.04, attack: 0.02 })
      break
    case 'cash':
      chord([523.25, 659.25, 783.99], 0.28, 0.1)
      break
    case 'win':
      chord([523.25, 659.25, 783.99, 1046.5], 0.42, 0.11)
      tone({ freq: 1318.5, duration: 0.22, type: 'sine', gain: 0.04, attack: 0.08 })
      break
    case 'lose':
      tone({ freq: 220, duration: 0.28, type: 'sawtooth', gain: 0.055, slideTo: 90 })
      noiseBurst(0.16, 0.04, 400)
      break
    case 'boom':
      noiseBurst(0.28, 0.12, 180)
      tone({ freq: 110, duration: 0.35, type: 'sine', gain: 0.14, slideTo: 45 })
      tone({ freq: 70, duration: 0.4, type: 'triangle', gain: 0.08 })
      break
    case 'tick':
      tone({ freq: 1400, duration: 0.03, type: 'square', gain: 0.02 })
      break
    default:
      break
  }
}

/** Map a settle net to win / lose / soft push click. */
export function playOutcome(net: number): void {
  if (net > 0) playSound('win')
  else if (net < 0) playSound('lose')
  else playSound('click')
}
