import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { DAILY_BONUS_AMOUNT } from '@/lib/constants'
import { formatMoneyDelta } from '@/lib/format'
import {
  appendDemoTransaction,
  clearDemoData,
  getOrCreateDemoProfile,
  listDemoTransactions,
  saveDemoProfile,
} from '@/lib/demoStore'
import { auth, isFirebaseConfigured } from '@/lib/firebase'
import {
  ensureUserProfile,
  listTransactions,
  updateDisplayName,
} from '@/services/userService'
import { emptyStats, normalizeStats, type Transaction, type UserProfile } from '@/types/user'

type AuthContextValue = {
  ready: boolean
  mode: 'firebase' | 'demo'
  user: User | null
  profile: UserProfile | null
  transactions: Transaction[]
  error: string | null
  refreshProfile: () => Promise<void>
  claimDailyBonus: () => Promise<{ ok: boolean; message: string }>
  debitBet: (args: {
    game: string
    amount: number
    refId: string
    countStats?: boolean
  }) => { ok: boolean; message: string }
  creditPayout: (args: {
    game: string
    amount: number
    refId: string
    bet?: number
    countStats?: boolean
  }) => { ok: boolean; message: string }
  rename: (displayName: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function canClaimDailyBonus(lastDailyBonusAt: number | null): boolean {
  if (lastDailyBonusAt == null) return true
  const last = new Date(lastDailyBonusAt)
  const now = new Date()
  return (
    last.getUTCFullYear() !== now.getUTCFullYear() ||
    last.getUTCMonth() !== now.getUTCMonth() ||
    last.getUTCDate() !== now.getUTCDate()
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const profileRef = useRef<UserProfile | null>(null)

  const mode: 'firebase' | 'demo' = isFirebaseConfigured ? 'firebase' : 'demo'

  const commitProfile = useCallback((next: UserProfile) => {
    profileRef.current = next
    saveDemoProfile(next)
    setProfile(next)
    setTransactions(listDemoTransactions())
  }, [])

  const loadDemo = useCallback(() => {
    const demoProfile = getOrCreateDemoProfile()
    profileRef.current = demoProfile
    setProfile(demoProfile)
    setTransactions(listDemoTransactions())
    setUser(null)
    setReady(true)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (mode === 'demo') {
      const demoProfile = getOrCreateDemoProfile()
      profileRef.current = demoProfile
      setProfile(demoProfile)
      setTransactions(listDemoTransactions())
      return
    }
    if (!user) return
    const next = await ensureUserProfile(user.uid)
    setProfile(next)
    try {
      setTransactions(await listTransactions(user.uid))
    } catch {
      // Index may not be deployed yet; keep UI usable.
      setTransactions([])
    }
  }, [mode, user])

  useEffect(() => {
    if (mode === 'demo') {
      loadDemo()
      return
    }

    const firebaseAuth = auth
    if (!firebaseAuth) {
      setError('Firebase Auth failed to initialize')
      setReady(true)
      return
    }

    const unsub = onAuthStateChanged(firebaseAuth, async (nextUser) => {
      try {
        setError(null)
        if (!nextUser) {
          await signInAnonymously(firebaseAuth)
          return
        }
        setUser(nextUser)
        const nextProfile = await ensureUserProfile(nextUser.uid)
        profileRef.current = nextProfile
        setProfile(nextProfile)
        try {
          setTransactions(await listTransactions(nextUser.uid))
        } catch {
          setTransactions([])
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to sign in'
        setError(message)
      } finally {
        setReady(true)
      }
    })

    return () => unsub()
  }, [loadDemo, mode])

  const claimDailyBonus = useCallback(async () => {
    const current = profileRef.current
    if (!current) {
      return { ok: false, message: 'No profile loaded' }
    }

    if (!canClaimDailyBonus(current.lastDailyBonusAt)) {
      return { ok: false, message: 'Daily bonus already claimed. Come back tomorrow.' }
    }

    if (mode === 'demo') {
      const next: UserProfile = {
        ...current,
        chipBalance: current.chipBalance + DAILY_BONUS_AMOUNT,
        lastDailyBonusAt: Date.now(),
      }
      appendDemoTransaction({
        uid: next.uid,
        game: null,
        type: 'bonus',
        amount: DAILY_BONUS_AMOUNT,
        refId: 'daily',
      })
      commitProfile(next)
      return { ok: true, message: formatMoneyDelta(DAILY_BONUS_AMOUNT) }
    }

    return {
      ok: false,
      message:
        'Daily bonus will be granted by a Cloud Function. Demo mode works without Firebase.',
    }
  }, [commitProfile, mode])

  const debitBet = useCallback(
    (args: {
      game: string
      amount: number
      refId: string
      /** When false, still debits but skips rounds/wager stats (e.g. BJ double). */
      countStats?: boolean
    }) => {
      const current = profileRef.current
      if (!current) return { ok: false, message: 'No profile loaded' }
      if (args.amount <= 0) return { ok: false, message: 'Invalid bet' }
      if (current.chipBalance < args.amount) {
        return { ok: false, message: 'Not enough balance' }
      }
      if (mode !== 'demo') {
        return {
          ok: false,
          message:
            'Game settlement needs Cloud Functions. Remove Firebase env to play in demo mode.',
        }
      }

      const countStats = args.countStats !== false
      const stats = normalizeStats(current.stats)
      const next: UserProfile = {
        ...current,
        chipBalance: current.chipBalance - args.amount,
        stats: countStats
          ? {
              ...stats,
              roundsPlayed: stats.roundsPlayed + 1,
              totalWagered: stats.totalWagered + args.amount,
            }
          : {
              ...stats,
              totalWagered: stats.totalWagered + args.amount,
            },
      }
      appendDemoTransaction({
        uid: next.uid,
        game: args.game,
        type: 'bet',
        amount: -args.amount,
        refId: args.refId,
      })
      commitProfile(next)
      return { ok: true, message: 'Bet placed' }
    },
    [commitProfile, mode],
  )

  const creditPayout = useCallback(
    (args: {
      game: string
      amount: number
      refId: string
      bet?: number
      countStats?: boolean
    }) => {
      const current = profileRef.current
      if (!current) return { ok: false, message: 'No profile loaded' }
      if (mode !== 'demo') {
        return {
          ok: false,
          message:
            'Game settlement needs Cloud Functions. Remove Firebase env to play in demo mode.',
        }
      }

      const countStats = args.countStats !== false
      const stats = normalizeStats(current.stats ?? emptyStats())
      let nextStats = stats

      if (countStats) {
        const multiplier =
          args.bet && args.bet > 0 ? args.amount / args.bet : 0
        nextStats = {
          ...stats,
          totalWon: stats.totalWon + args.amount,
          biggestWin:
            args.amount > 0
              ? Math.max(stats.biggestWin, args.amount)
              : stats.biggestWin,
          biggestMultiplier:
            args.amount > 0
              ? Math.max(stats.biggestMultiplier, multiplier)
              : stats.biggestMultiplier,
        }
      } else {
        // Refund path — undo the wager counted on debit.
        nextStats = {
          ...stats,
          roundsPlayed: Math.max(0, stats.roundsPlayed - 1),
          totalWagered: Math.max(0, stats.totalWagered - args.amount),
        }
      }

      const next: UserProfile = {
        ...current,
        chipBalance: current.chipBalance + args.amount,
        stats: nextStats,
      }
      // Losing spins return $0 — don't spam Activity with empty payouts.
      if (args.amount > 0) {
        appendDemoTransaction({
          uid: next.uid,
          game: args.game,
          type: 'payout',
          amount: args.amount,
          refId: args.refId,
        })
      }
      commitProfile(next)
      return { ok: true, message: 'Payout credited' }
    },
    [commitProfile, mode],
  )

  const rename = useCallback(
    async (displayName: string) => {
      const current = profileRef.current
      if (!current) return
      const trimmed = displayName.trim()
      if (!trimmed || trimmed.length > 32) {
        throw new Error('Display name must be 1–32 characters')
      }

      if (mode === 'demo') {
        commitProfile({ ...current, displayName: trimmed })
        return
      }

      if (!user) throw new Error('Not signed in')
      await updateDisplayName(user.uid, trimmed)
      const next = { ...current, displayName: trimmed }
      profileRef.current = next
      setProfile(next)
    },
    [commitProfile, mode, user],
  )

  const signOut = useCallback(async () => {
    if (mode === 'demo') {
      clearDemoData()
      loadDemo()
      return
    }
    if (auth) {
      await firebaseSignOut(auth)
    }
  }, [loadDemo, mode])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      mode,
      user,
      profile,
      transactions,
      error,
      refreshProfile,
      claimDailyBonus,
      debitBet,
      creditPayout,
      rename,
      signOut,
    }),
    [
      ready,
      mode,
      user,
      profile,
      transactions,
      error,
      refreshProfile,
      claimDailyBonus,
      debitBet,
      creditPayout,
      rename,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
