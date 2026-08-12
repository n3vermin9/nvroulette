/** European wheel order (clockwise from 0). */
export const EUROPEAN_WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export const ROULETTE_MIN_BET = 50
export const ROULETTE_MAX_BET = 100_000
export const ROULETTE_BET_STEPS = [50, 100, 250, 500, 1000, 2500, 5000] as const

export type PocketColor = 'green' | 'red' | 'black'

export type OutsideBetType =
  | 'red'
  | 'green'
  | 'black'
  | 'odd'
  | 'even'
  | 'low'
  | 'high'

export type RouletteBet = {
  type: OutsideBetType
  amount: number
}

export type SpinResult = {
  number: number
  color: PocketColor
  index: number
}

export function pocketColor(n: number): PocketColor {
  if (n === 0) return 'green'
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

export function clampRouletteBet(amount: number, balance: number): number {
  if (!Number.isFinite(amount)) return ROULETTE_MIN_BET
  const rounded = Math.floor(amount)
  const max = Math.max(ROULETTE_MIN_BET, Math.min(ROULETTE_MAX_BET, balance))
  return Math.min(max, Math.max(ROULETTE_MIN_BET, rounded))
}

export function nextRouletteBetStep(
  current: number,
  direction: 1 | -1,
): number {
  if (direction > 0) {
    const up = ROULETTE_BET_STEPS.find((s) => s > current)
    return up ?? Math.min(ROULETTE_MAX_BET, current * 2)
  }
  const downs = [...ROULETTE_BET_STEPS].reverse().filter((s) => s < current)
  return downs[0] ?? ROULETTE_MIN_BET
}

/** Client demo RNG — Cloud Function will own this later. */
export function spinEuropean(): SpinResult {
  const index = Math.floor(Math.random() * EUROPEAN_WHEEL.length)
  const number = EUROPEAN_WHEEL[index]!
  return { number, color: pocketColor(number), index }
}

export function betWins(bet: OutsideBetType, result: SpinResult): boolean {
  const { number, color } = result
  if (bet === 'green') return number === 0
  if (number === 0) return false
  switch (bet) {
    case 'red':
      return color === 'red'
    case 'black':
      return color === 'black'
    case 'odd':
      return number % 2 === 1
    case 'even':
      return number % 2 === 0
    case 'low':
      return number >= 1 && number <= 18
    case 'high':
      return number >= 19 && number <= 36
  }
}

/** Payout including stake: even money ×2, green/0 pays 35:1 → ×36. */
export function payoutForBet(bet: RouletteBet, result: SpinResult): number {
  if (!betWins(bet.type, result)) return 0
  if (bet.type === 'green') return bet.amount * 36
  return bet.amount * 2
}

export const COLOR_BETS: {
  type: OutsideBetType
  label: string
  multiplier: string
}[] = [
  { type: 'red', label: 'Red', multiplier: '2x' },
  { type: 'green', label: 'Green', multiplier: '36x' },
  { type: 'black', label: 'Black', multiplier: '2x' },
]

export const RANGE_BETS: {
  type: OutsideBetType
  label: string
  multiplier: string
}[] = [
  { type: 'odd', label: 'Odd', multiplier: '2x' },
  { type: 'even', label: 'Even', multiplier: '2x' },
  { type: 'low', label: '1–18', multiplier: '2x' },
  { type: 'high', label: '19–36', multiplier: '2x' },
]

/** Degrees so pocket `index` sits under the top pointer (pocket center). */
export function rotationForIndex(index: number, spins = 6): number {
  const slice = 360 / EUROPEAN_WHEEL.length
  const center = index * slice + slice / 2
  return spins * 360 + ((360 - center) % 360)
}

/**
 * Final resting angle for a spin: pocket center ± jitter inside the pocket,
 * never on a seam.
 */
export function landingRotation(index: number): number {
  const slice = 360 / EUROPEAN_WHEEL.length
  const center = index * slice + slice / 2
  const jitter = (Math.random() - 0.5) * slice * 0.7
  return (360 - (center + jitter) + 360) % 360
}
