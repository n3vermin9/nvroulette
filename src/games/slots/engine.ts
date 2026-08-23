export const SLOTS_MIN_BET = 50
export const SLOTS_MAX_BET = 100_000
export const SLOTS_BET_STEPS = [50, 100, 250, 500, 1000, 2500, 5000] as const

export type SlotSymbolId =
  | 'pepe'
  | 'cat'
  | 'westside'
  | 'helmet'
  | 'agaric'
  | 'bunny'
  | 'jester'

export type SlotSymbol = {
  id: SlotSymbolId
  /** GiftChanges slug */
  slug: string
  label: string
  multiplier: number
  probability: number
}

export type SlotSpin = readonly [SlotSymbol, SlotSymbol, SlotSymbol]

/** Weighted reel symbols — probabilities sum to 1. */
export const SLOT_SYMBOLS: readonly SlotSymbol[] = [
  {
    id: 'pepe',
    slug: 'plush-pepe',
    label: 'Pepe',
    multiplier: 100,
    probability: 0.01,
  },
  {
    id: 'cat',
    slug: 'scared-cat',
    label: 'Scared Cat',
    multiplier: 50,
    probability: 0.02,
  },
  {
    id: 'westside',
    slug: 'westside-sign',
    label: 'Westside',
    multiplier: 10,
    probability: 0.08,
  },
  {
    id: 'helmet',
    slug: 'heroic-helmet',
    label: 'Helmet',
    multiplier: 6,
    probability: 0.12,
  },
  {
    id: 'agaric',
    slug: 'spy-agaric',
    label: 'Agaric',
    multiplier: 3,
    probability: 0.22,
  },
  {
    id: 'bunny',
    slug: 'jelly-bunny',
    label: 'Bunny',
    multiplier: 3,
    probability: 0.22,
  },
  {
    id: 'jester',
    slug: 'jester-hat',
    label: 'Jester',
    multiplier: 0,
    probability: 0.33,
  },
] as const

const SYMBOL_BY_ID = new Map(SLOT_SYMBOLS.map((s) => [s.id, s]))

export function slotSymbol(id: SlotSymbolId): SlotSymbol {
  const sym = SYMBOL_BY_ID.get(id)
  if (!sym) throw new Error(`Unknown slot symbol: ${id}`)
  return sym
}

export function clampSlotsBet(amount: number, balance: number): number {
  if (!Number.isFinite(amount)) return SLOTS_MIN_BET
  const rounded = Math.floor(amount)
  const max = Math.max(SLOTS_MIN_BET, Math.min(SLOTS_MAX_BET, balance))
  return Math.min(max, Math.max(SLOTS_MIN_BET, rounded))
}

export function nextSlotsBetStep(current: number, direction: 1 | -1): number {
  if (direction > 0) {
    const up = SLOTS_BET_STEPS.find((s) => s > current)
    return up ?? Math.min(SLOTS_MAX_BET, current * 2)
  }
  const downs = [...SLOTS_BET_STEPS].reverse().filter((s) => s < current)
  return downs[0] ?? SLOTS_MIN_BET
}

function sampleSlotSymbol(): SlotSymbol {
  const r = Math.random()
  let acc = 0
  for (const sym of SLOT_SYMBOLS) {
    acc += sym.probability
    if (r <= acc) return sym
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1]
}

/** Sample three independent reels. Only a three-of-a-kind pays. */
export function sampleSlotSpin(): SlotSpin {
  return [sampleSlotSymbol(), sampleSlotSymbol(), sampleSlotSymbol()]
}

export function randomSlotSymbol(): SlotSymbol {
  return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
}

/** Returns a matched three-of-a-kind, including Jester which returns the bet. */
export function winningSlotSymbol(spin: SlotSpin): SlotSymbol | null {
  const [first, second, third] = spin
  return first.id === second.id && second.id === third.id ? first : null
}

export function slotsPayout(bet: number, spin: SlotSpin): number {
  const winner = winningSlotSymbol(spin)
  if (winner?.id === 'jester') return bet
  return winner ? Math.floor(bet * winner.multiplier) : 0
}
