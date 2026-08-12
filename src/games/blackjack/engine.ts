export const BJ_MIN_BET = 50
export const BJ_MAX_BET = 100_000
export const BJ_BET_STEPS = [50, 100, 250, 500, 1000, 2500, 5000] as const

/** Blackjack natural pays 3:2. */
export const BJ_NATURAL_MULT = 1.5
/** Even-money win. */
export const BJ_WIN_MULT = 1

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'

export type Card = {
  suit: Suit
  rank: Rank
  /** Stable id for React keys within a shoe. */
  id: string
}

export type HandValue = {
  soft: boolean
  total: number
  bust: boolean
  blackjack: boolean
}

export type RoundOutcome =
  | 'player-blackjack'
  | 'dealer-blackjack'
  | 'player-bust'
  | 'dealer-bust'
  | 'player-win'
  | 'dealer-win'
  | 'push'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
]

export function clampBlackjackBet(amount: number, balance: number): number {
  if (!Number.isFinite(amount)) return BJ_MIN_BET
  const rounded = Math.floor(amount)
  const max = Math.max(BJ_MIN_BET, Math.min(BJ_MAX_BET, balance))
  return Math.min(max, Math.max(BJ_MIN_BET, rounded))
}

export function nextBlackjackBetStep(
  current: number,
  direction: 1 | -1,
): number {
  if (direction > 0) {
    const up = BJ_BET_STEPS.find((s) => s > current)
    return up ?? Math.min(BJ_MAX_BET, current * 2)
  }
  const downs = [...BJ_BET_STEPS].reverse().filter((s) => s < current)
  return downs[0] ?? BJ_MIN_BET
}

export function createShoe(decks = 4): Card[] {
  const cards: Card[] = []
  let n = 0
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ suit, rank, id: `${d}-${suit}-${rank}-${n++}` })
      }
    }
  }
  return shuffle(cards)
}

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function drawCard(shoe: Card[]): { card: Card; shoe: Card[] } {
  const next = [...shoe]
  if (next.length < 20) {
    next.push(...createShoe(4))
  }
  const card = next.shift()
  if (!card) throw new Error('Empty shoe')
  return { card, shoe: next }
}

export function rankValue(rank: Rank): number {
  if (rank === 'A') return 11
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10
  return Number(rank)
}

export function handValue(cards: Card[]): HandValue {
  let total = 0
  let aces = 0
  for (const c of cards) {
    total += rankValue(c.rank)
    if (c.rank === 'A') aces += 1
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  const soft = aces > 0 && total <= 21
  const blackjack = cards.length === 2 && total === 21
  return { soft, total, bust: total > 21, blackjack }
}

/** Dealer stands on soft 17. */
export function dealerShouldHit(cards: Card[]): boolean {
  const v = handValue(cards)
  if (v.bust) return false
  if (v.total < 17) return true
  return false
}

export function settleRound(
  player: Card[],
  dealer: Card[],
): RoundOutcome {
  const p = handValue(player)
  const d = handValue(dealer)

  if (p.blackjack && d.blackjack) return 'push'
  if (p.blackjack) return 'player-blackjack'
  if (d.blackjack) return 'dealer-blackjack'
  if (p.bust) return 'player-bust'
  if (d.bust) return 'dealer-bust'
  if (p.total > d.total) return 'player-win'
  if (p.total < d.total) return 'dealer-win'
  return 'push'
}

/** Total chips returned to player (includes stake on win/push). */
export function payoutForOutcome(
  bet: number,
  outcome: RoundOutcome,
): number {
  switch (outcome) {
    case 'player-blackjack':
      return Math.floor(bet + bet * BJ_NATURAL_MULT)
    case 'player-win':
    case 'dealer-bust':
      return bet + Math.floor(bet * BJ_WIN_MULT)
    case 'push':
      return bet
    default:
      return 0
  }
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

export function suitGlyph(suit: Suit): string {
  switch (suit) {
    case 'hearts':
      return '♥'
    case 'diamonds':
      return '♦'
    case 'clubs':
      return '♣'
    case 'spades':
      return '♠'
  }
}
