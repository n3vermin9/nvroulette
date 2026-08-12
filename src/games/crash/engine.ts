export const CRASH_MIN_BET = 50
export const CRASH_MAX_BET = 100_000
export const CRASH_BET_STEPS = [50, 100, 250, 500, 1000, 2500, 5000] as const
/** House edge baked into crash-point sampling (kept low for easier debug). */
export const CRASH_HOUSE_EDGE = 0.01
/** Exponential growth rate per ms → ~2x around ~4s (snappy early surf). */
export const CRASH_GROWTH = 0.000175
export const CRASH_CAP = 1000
/** Debug-friendly boost — higher average crash / easier cash-outs. */
export const CRASH_POINT_BOOST = 2.4

export function clampCrashBet(amount: number, balance: number): number {
  if (!Number.isFinite(amount)) return CRASH_MIN_BET
  const rounded = Math.floor(amount)
  const max = Math.max(CRASH_MIN_BET, Math.min(CRASH_MAX_BET, balance))
  return Math.min(max, Math.max(CRASH_MIN_BET, rounded))
}

export function nextCrashBetStep(current: number, direction: 1 | -1): number {
  if (direction > 0) {
    const up = CRASH_BET_STEPS.find((s) => s > current)
    return up ?? Math.min(CRASH_MAX_BET, current * 2)
  }
  const downs = [...CRASH_BET_STEPS].reverse().filter((s) => s < current)
  return downs[0] ?? CRASH_MIN_BET
}

/**
 * Sample a crash multiplier (Bustabit-style).
 * Instant 1.00x with probability ≈ house edge; otherwise heavy-tailed.
 * Boosted for easier debug cash-outs.
 */
export function sampleCrashPoint(houseEdge = CRASH_HOUSE_EDGE): number {
  const r = Math.random()
  if (r < houseEdge) return 1.2
  const point = ((1 - houseEdge) / (1 - r)) * CRASH_POINT_BOOST
  const floored = Math.floor(point * 100) / 100
  return Math.min(CRASH_CAP, Math.max(1.5, floored))
}

/** Live multiplier from elapsed flight time. */
export function multiplierAt(
  elapsedMs: number,
  growth = CRASH_GROWTH,
): number {
  if (elapsedMs <= 0) return 1
  const raw = Math.exp(growth * elapsedMs)
  return Math.min(CRASH_CAP, Math.floor(raw * 100) / 100)
}

/** ms needed to reach a given multiplier (inverse of multiplierAt). */
export function elapsedForMultiplier(
  mult: number,
  growth = CRASH_GROWTH,
): number {
  if (mult <= 1) return 0
  return Math.log(mult) / growth
}

export function crashPayout(bet: number, multiplier: number): number {
  return Math.floor(bet * multiplier)
}

/**
 * Display progress 0→1 (crash-relative). Kept for callers; board prefers live mult.
 */
export function surfProgress(mult: number, crashAt: number): number {
  if (crashAt <= 1) return 1
  const t = Math.log(Math.max(1, mult)) / Math.log(crashAt)
  return Math.min(1, Math.max(0, t))
}

/** Yellow-mark ceiling — below the multiplier title (smaller Y% = higher on screen). */
export const CEILING_Y = 36
const PLOT_BOTTOM = 88
const PLOT_LEFT = 8
const PLOT_RIGHT_CAP = 82
/** Log-span of the visible window (~factor below live). */
const GRID_WINDOW_FACTOR = 3.4

function clampToCeiling(y: number): number {
  return Math.max(CEILING_Y, y)
}

/**
 * Sliding log window for the left grid.
 * As live grows, the floor rises so bottom multipliers fall off and
 * compression continues past 5x / 10x / …
 */
export function viewWindow(live: number): { min: number; max: number } {
  const max = Math.max(1.01, live)
  // Slightly wider window so mid-range (5x–20x) keeps moving visibly
  const min = Math.max(1, max / GRID_WINDOW_FACTOR)
  return { min, max }
}

/**
 * How far along the fly arc (0→1) for the live multiplier.
 * Blasts through the early arc, then asymptotically eases toward the
 * yellow ceiling so visual speed → 0 as the tip arrives.
 */
export function flyProgress(mult: number): number {
  const m = Math.max(1, mult)
  // 1.05x ≈ 0.38 · 1.15x ≈ 0.68 · 1.4x ≈ 0.89 · 2x ≈ 0.97 · 5x ≈ 0.995
  const u = 1 - Math.exp(-4.5 * (m - 1))
  return Math.min(0.995, Math.max(0, u))
}

/**
 * Classic crash trajectory: starts flat near bottom-left, then steepens
 * exponentially toward top-right, hard-capped at CEILING_Y.
 */
export function flyPoint(u: number): { x: number; y: number } {
  const t = Math.min(1, Math.max(0, u))
  const x = PLOT_LEFT + t * (PLOT_RIGHT_CAP - PLOT_LEFT)
  // Exponential rise — shallow early, steep late (matches the red annotation).
  const k = 3.25
  const rise = (Math.exp(k * t) - 1) / (Math.exp(k) - 1)
  const y = PLOT_BOTTOM - rise * (PLOT_BOTTOM - CEILING_Y)
  return { x, y: clampToCeiling(y) }
}

/** Map a multiplier onto compressing grid Y% inside [min, max]. */
export function valueToY(
  value: number,
  viewMin: number,
  viewMax: number,
): number {
  const vmin = Math.max(1, viewMin)
  const vmax = Math.max(vmin * 1.0001, viewMax)
  const t =
    (Math.log(Math.max(1, value)) - Math.log(vmin)) /
    (Math.log(vmax) - Math.log(vmin))
  // Allow y past PLOT_BOTTOM when value < min so ticks can fade off
  // instead of clamping into one stacked pile at the floor.
  const y = PLOT_BOTTOM - t * (PLOT_BOTTOM - CEILING_Y)
  return clampToCeiling(y)
}

const TICK_CANDIDATES = [
  1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  12, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500,
  750, 1000,
] as const

const MAJOR_TICKS = new Set([1, 1.5, 2, 3, 5, 10, 15, 20, 50, 100, 200, 500, 1000])

/** Soft-hide band near the bottom (Y%). Fully gone by plot floor. */
const FADE_START_Y = 76
const FADE_END_Y = PLOT_BOTTOM

export type GridTick = {
  value: number
  y: number
  major: boolean
  label: string
  /** 1 = fully visible, 0 = fully hidden (bottom fade). */
  hide: number
}

function formatTickLabel(value: number): string {
  if (Number.isInteger(value)) return `${value}x`
  const rounded = Math.round(value * 10) / 10
  return `${rounded}x`
}

function bottomHide(y: number): number {
  if (y <= FADE_START_Y) return 1
  if (y >= FADE_END_Y) return 0
  return 1 - (y - FADE_START_Y) / (FADE_END_Y - FADE_START_Y)
}

/**
 * Left-grid ticks:
 * - inner steps between 1x–2x; whole numbers after that
 * - only values that have already been reached
 * - drop (and fade) once they slide past the bottom of the window
 */
export function gridTicks(live: number): GridTick[] {
  const reached = Math.max(1, live)
  const { min, max } = viewWindow(reached)

  return TICK_CANDIDATES.filter(
    (value) => value <= reached + 0.0001 && value >= min,
  )
    .map((value) => {
      const y = valueToY(value, min, max)
      const major = MAJOR_TICKS.has(value)
      return {
        value,
        y,
        major,
        label: formatTickLabel(value),
        hide: bottomHide(y),
      }
    })
    .filter((tick) => tick.hide > 0.02)
}

/** Sampled red fly path from start → live tip. */
export function graphPath(mult: number): string {
  const end = flyProgress(mult)
  const steps = Math.max(10, Math.ceil(end * 40))
  const parts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * end
    const { x, y } = flyPoint(u)
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return parts.join(' ')
}

export function tipPoint(mult: number): { x: number; y: number } {
  return flyPoint(flyProgress(Math.max(1, mult)))
}

export function formatMultiplier(mult: number): string {
  return `${mult.toFixed(2)}x`
}
