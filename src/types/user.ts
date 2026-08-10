export type UserStats = {
  roundsPlayed: number
  totalWagered: number
  totalWon: number
  biggestWin: number
  biggestMultiplier: number
}

export type UserProfile = {
  uid: string
  displayName: string
  chipBalance: number
  createdAt: number
  lastDailyBonusAt: number | null
  stats: UserStats
}

export type TransactionType = 'bonus' | 'bet' | 'payout'

export type Transaction = {
  id: string
  uid: string
  game: string | null
  type: TransactionType
  amount: number
  refId: string | null
  createdAt: number
}

export function emptyStats(): UserStats {
  return {
    roundsPlayed: 0,
    totalWagered: 0,
    totalWon: 0,
    biggestWin: 0,
    biggestMultiplier: 0,
  }
}

export function normalizeStats(stats?: Partial<UserStats> | null): UserStats {
  const base = emptyStats()
  if (!stats) return base
  return {
    roundsPlayed: stats.roundsPlayed ?? 0,
    totalWagered: stats.totalWagered ?? 0,
    totalWon: stats.totalWon ?? 0,
    biggestWin: stats.biggestWin ?? 0,
    biggestMultiplier: stats.biggestMultiplier ?? 0,
  }
}
