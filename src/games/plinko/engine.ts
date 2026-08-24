/** Six peg rows produce seven cleaner, wider landing bins. */
export const PLINKO_ROWS = 6

/**
 * Multipliers L→R (7 bins). Tuned for ~0.62 RTP under fair L/R peg bounces
 * so the house keeps a clear edge.
 */
export const PLINKO_MULTIPLIERS = [
  4.2, 1.1, 0.4, 0.3, 0.4, 1.1, 4.2,
] as const

export const PLINKO_MIN_BET = 50
export const PLINKO_MAX_BET = 100_000
export const PLINKO_BET_STEPS = [50, 100, 250, 500, 1000, 2500, 5000] as const

export function clampBet(amount: number, balance: number): number {
  if (!Number.isFinite(amount)) return PLINKO_MIN_BET
  const rounded = Math.floor(amount)
  const max = Math.max(PLINKO_MIN_BET, Math.min(PLINKO_MAX_BET, balance))
  return Math.min(max, Math.max(PLINKO_MIN_BET, rounded))
}

export function nextBetStep(current: number, direction: 1 | -1): number {
  if (direction > 0) {
    const up = PLINKO_BET_STEPS.find((s) => s > current)
    return up ?? Math.min(PLINKO_MAX_BET, current * 2)
  }
  const downs = [...PLINKO_BET_STEPS].reverse().filter((s) => s < current)
  return downs[0] ?? PLINKO_MIN_BET
}

export const BOARD_WIDTH = 340
export const BOARD_HEIGHT = 420
export const BALL_RADIUS = 6
export const PEG_RADIUS = 4.3
/** Inner padding so balls collide inside the visible board. */
export const BOARD_INSET = 14

export function binCount(): number {
  return PLINKO_ROWS + 1
}

export type PegPoint = { x: number; y: number; row: number; col: number }
export type BinRect = { x: number; width: number; index: number }

/**
 * Classic Plinko triangle: constant pitch, each row gains one peg,
 * every row centered so gaps funnel into the bin row.
 */
export function layoutBoard(width: number, height: number): {
  pegs: PegPoint[]
  bins: BinRect[]
  pegArea: { top: number; bottom: number; span: number; startX: number }
} {
  const inset = BOARD_INSET + 4
  const top = height * 0.12
  const bottom = height * 0.76
  const maxCols = PLINKO_ROWS + 2 // last-row pegs → bins = gaps between them
  const span = width - inset * 2
  const pegGapX = span / (maxCols - 1)
  const pegGapY = (bottom - top) / (PLINKO_ROWS - 1)
  const pegs: PegPoint[] = []

  for (let row = 0; row < PLINKO_ROWS; row++) {
    const cols = row + 3 // 3 … 12
    const rowWidth = (cols - 1) * pegGapX
    const startX = (width - rowWidth) / 2
    const y = top + row * pegGapY

    for (let col = 0; col < cols; col++) {
      pegs.push({
        x: startX + col * pegGapX,
        y,
        row,
        col,
      })
    }
  }

  // Bins align to gaps between pegs on the widest row.
  // Align bins to gaps between pegs on the widest row (same pitch).
  const lastRowWidth = (maxCols - 1) * pegGapX
  const binStart = (width - lastRowWidth) / 2
  const bins = Array.from({ length: binCount() }, (_, index) => ({
    x: binStart + index * pegGapX,
    width: pegGapX,
    index,
  }))

  return {
    pegs,
    bins,
    pegArea: { top, bottom, span, startX: (width - span) / 2 },
  }
}

export function payoutForBin(bet: number, binIndex: number): {
  multiplier: number
  payout: number
} {
  const multiplier = PLINKO_MULTIPLIERS[binIndex] ?? 0
  return { multiplier, payout: Math.floor(bet * multiplier) }
}
