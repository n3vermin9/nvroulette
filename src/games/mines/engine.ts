export const MINES_GRID = 5
export const MINES_TILES = MINES_GRID * MINES_GRID
export const MINES_MIN_BET = 50
export const MINES_MAX_BET = 100_000
export const MINES_BET_STEPS = [50, 100, 250, 500, 1000, 2500, 5000] as const
/** House keeps ~3% vs fair odds. */
export const MINES_HOUSE_EDGE = 0.97

export const MINE_COUNT_OPTIONS = [3, 5, 10, 15, 24] as const
export type MineCount = (typeof MINE_COUNT_OPTIONS)[number]

export function clampMinesBet(amount: number, balance: number): number {
  if (!Number.isFinite(amount)) return MINES_MIN_BET
  const rounded = Math.floor(amount)
  const max = Math.max(MINES_MIN_BET, Math.min(MINES_MAX_BET, balance))
  return Math.min(max, Math.max(MINES_MIN_BET, rounded))
}

export function nextMinesBetStep(
  current: number,
  direction: 1 | -1,
): number {
  if (direction > 0) {
    const up = MINES_BET_STEPS.find((s) => s > current)
    return up ?? Math.min(MINES_MAX_BET, current * 2)
  }
  const downs = [...MINES_BET_STEPS].reverse().filter((s) => s < current)
  return downs[0] ?? MINES_MIN_BET
}

/** Place `mineCount` unique mine indices on the board. */
export function placeMines(mineCount: number): Set<number> {
  const mines = new Set<number>()
  while (mines.size < mineCount) {
    mines.add(Math.floor(Math.random() * MINES_TILES))
  }
  return mines
}

/**
 * Multiplier after `revealed` successful gems.
 * Fair odds × house edge, floored to 2 decimals (min 1 when revealed > 0).
 */
export function minesMultiplier(mineCount: number, revealed: number): number {
  if (revealed <= 0) return 1
  const safe = MINES_TILES - mineCount
  if (revealed > safe) return 0

  let fair = 1
  for (let i = 0; i < revealed; i++) {
    fair *= (MINES_TILES - i) / (MINES_TILES - mineCount - i)
  }
  const edged = fair * MINES_HOUSE_EDGE
  return Math.max(1, Math.floor(edged * 100) / 100)
}

export function minesPayout(bet: number, multiplier: number): number {
  return Math.floor(bet * multiplier)
}

export function maxGems(mineCount: number): number {
  return MINES_TILES - mineCount
}
