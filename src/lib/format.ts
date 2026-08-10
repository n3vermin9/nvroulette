/** Virtual USD display — no real cash value. */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Signed virtual USD for gains/losses (+$50 / -$50). */
export function formatMoneyDelta(amount: number): string {
  const abs = formatMoney(Math.abs(amount))
  if (amount > 0) return `+${abs}`
  if (amount < 0) return `-${abs}`
  return abs
}

/** Plain counts (rounds, etc.). */
export function formatCount(amount: number): string {
  return new Intl.NumberFormat('en-US').format(amount)
}

/** @deprecated Use formatMoney — kept as alias during migration. */
export function formatChips(amount: number): string {
  return formatMoney(amount)
}

export function randomGuestName(): string {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `Guest ${n}`
}
