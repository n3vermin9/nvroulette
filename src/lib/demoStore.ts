import { INITIAL_CHIP_BALANCE } from '@/lib/constants'
import { randomGuestName } from '@/lib/format'
import {
  emptyStats,
  normalizeStats,
  type Transaction,
  type UserProfile,
} from '@/types/user'

const PROFILE_KEY = 'nvroulette.demo.profile'
const TX_KEY = 'nvroulette.demo.transactions'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function normalizeProfile(raw: UserProfile): UserProfile {
  return {
    ...raw,
    stats: normalizeStats(raw.stats),
  }
}

export function getOrCreateDemoProfile(): UserProfile {
  const existing = readJson<UserProfile | null>(PROFILE_KEY, null)
  if (existing) {
    const normalized = normalizeProfile(existing)
    if (!existing.stats) writeJson(PROFILE_KEY, normalized)
    return normalized
  }

  const profile: UserProfile = {
    uid: `demo_${crypto.randomUUID().slice(0, 8)}`,
    displayName: randomGuestName(),
    chipBalance: INITIAL_CHIP_BALANCE,
    createdAt: Date.now(),
    lastDailyBonusAt: null,
    stats: emptyStats(),
  }
  writeJson(PROFILE_KEY, profile)
  return profile
}

export function saveDemoProfile(profile: UserProfile) {
  writeJson(PROFILE_KEY, normalizeProfile(profile))
}

export function listDemoTransactions(): Transaction[] {
  return readJson<Transaction[]>(TX_KEY, []).sort(
    (a, b) => b.createdAt - a.createdAt,
  )
}

export function appendDemoTransaction(
  tx: Omit<Transaction, 'id' | 'createdAt'>,
): Transaction {
  const full: Transaction = {
    ...tx,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  }
  const next = [full, ...listDemoTransactions()]
  writeJson(TX_KEY, next)
  return full
}

export function clearDemoData() {
  localStorage.removeItem(PROFILE_KEY)
  localStorage.removeItem(TX_KEY)
}
