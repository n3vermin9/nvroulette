import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { DAILY_BONUS_AMOUNT } from '@/lib/constants'
import { formatCount, formatMoney, formatMoneyDelta } from '@/lib/format'
import { emptyStats } from '@/types/user'

type Props = {
  open: boolean
  onClose: () => void
  onVisibleChange?: (visible: boolean) => void
}

export function WalletSheet({ open, onClose, onVisibleChange }: Props) {
  const { profile, claimDailyBonus } = useAuth()
  const [bonusMsg, setBonusMsg] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimBurst, setClaimBurst] = useState(false)
  const [balancePop, setBalancePop] = useState(false)
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const prevBalance = useRef(profile?.chipBalance)

  const stats = profile?.stats ?? emptyStats()
  const net = stats.totalWon - stats.totalWagered

  useEffect(() => {
    onVisibleChange?.(mounted)
  }, [mounted, onVisibleChange])

  useEffect(() => {
    if (open) {
      setMounted(true)
      setBonusMsg(null)
      setClaimBurst(false)
      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        setEntered(true)
        return
      }
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true))
      })
      return () => window.cancelAnimationFrame(id)
    }

    if (!mounted) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    setEntered(false)

    if (reduce) {
      setMounted(false)
      setBonusMsg(null)
      setClaimBurst(false)
      return
    }

    // Fallback if transitionend is skipped (tab background, etc.)
    const fallback = window.setTimeout(() => {
      setMounted(false)
      setBonusMsg(null)
      setClaimBurst(false)
    }, 220)
    return () => window.clearTimeout(fallback)
  }, [open, mounted])

  useEffect(() => {
    if (!mounted || !entered) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, entered, onClose])

  useEffect(() => {
    const next = profile?.chipBalance
    if (
      next != null &&
      prevBalance.current != null &&
      next > prevBalance.current
    ) {
      setBalancePop(true)
      const t = window.setTimeout(() => setBalancePop(false), 520)
      prevBalance.current = next
      return () => window.clearTimeout(t)
    }
    prevBalance.current = next
  }, [profile?.chipBalance])

  function finishClose() {
    if (open) return
    setMounted(false)
    setBonusMsg(null)
    setClaimBurst(false)
  }

  async function onClaim() {
    if (claiming) return
    setClaiming(true)
    try {
      const result = await claimDailyBonus()
      setBonusMsg(result.message)
      if (result.ok) {
        setClaimBurst(true)
        window.setTimeout(() => setClaimBurst(false), 900)
      }
    } finally {
      setClaiming(false)
    }
  }

  if (!mounted) return null

  return (
    <div
      className={[
        'wallet-sheet-root',
        entered ? 'is-open' : 'is-closed',
      ].join(' ')}
      role="presentation"
    >
      <button
        type="button"
        className="wallet-sheet-backdrop"
        aria-label="Close wallet"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="wallet-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onTransitionEnd={(e) => {
          if (e.target !== sheetRef.current) return
          if (e.propertyName !== 'transform') return
          if (!entered && !open) finishClose()
        }}
      >
        <div className="wallet-sheet-handle" aria-hidden />
        <header className="wallet-sheet-header">
          <div>
            <h2
              id={titleId}
              className="font-display text-[1.35rem] text-[var(--label)]"
            >
              Wallet
            </h2>
            <p className="mt-0.5 text-sm text-[var(--secondary-label)]">
              Virtual dollars · no cash value
            </p>
          </div>
          <div className="wallet-sheet-balance-wrap">
            <p
              className={[
                'wallet-sheet-balance tabular-nums',
                balancePop ? 'is-pop' : '',
              ].join(' ')}
            >
              {profile ? formatMoney(profile.chipBalance) : '—'}
            </p>
            {claimBurst ? (
              <span className="wallet-bonus-float" aria-hidden>
                {formatMoneyDelta(DAILY_BONUS_AMOUNT)}
              </span>
            ) : null}
          </div>
        </header>

        <section className="wallet-sheet-section">
          <h3 className="wallet-sheet-label">Statistics</h3>
          <div className="stats-grid">
            <div className="stat-tile">
              <p className="label">Rounds</p>
              <p className="value">{formatCount(stats.roundsPlayed)}</p>
            </div>
            <div className="stat-tile">
              <p className="label">Wagered</p>
              <p className="value">{formatMoney(stats.totalWagered)}</p>
            </div>
            <div className="stat-tile">
              <p className="label">Won</p>
              <p className="value">{formatMoney(stats.totalWon)}</p>
            </div>
            <div className="stat-tile">
              <p className="label">Net</p>
              <p
                className="value"
                style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)' }}
              >
                {formatMoneyDelta(net)}
              </p>
            </div>
            <div className="stat-tile">
              <p className="label">Biggest win</p>
              <p className="value">{formatMoney(stats.biggestWin)}</p>
            </div>
            <div className="stat-tile">
              <p className="label">Best multiplier</p>
              <p className="value">
                {stats.biggestMultiplier > 0
                  ? `${stats.biggestMultiplier.toFixed(2)}x`
                  : '—'}
              </p>
            </div>
          </div>
        </section>

        <section className="wallet-sheet-section">
          <h3 className="wallet-sheet-label">Daily bonus</h3>
          <p className="text-sm text-[var(--secondary-label)]">
            Claim {formatMoney(DAILY_BONUS_AMOUNT)} free virtual dollars once per
            day.
          </p>
          <button
            type="button"
            className={[
              'btn-primary mt-3 wallet-claim-btn',
              claimBurst ? 'is-success' : '',
            ].join(' ')}
            disabled={claiming}
            onClick={() => void onClaim()}
          >
            {claiming ? 'Claiming…' : claimBurst ? 'Claimed!' : 'Claim bonus'}
          </button>
          <p
            className={[
              'wallet-bonus-msg',
              bonusMsg ? 'is-show' : '',
            ].join(' ')}
            aria-live="polite"
          >
            {bonusMsg ?? '\u00a0'}
          </p>
        </section>

        <button
          type="button"
          className="btn-ghost wallet-sheet-done"
          onClick={onClose}
        >
          Done
        </button>
        <p className="wallet-sheet-credit">
          powered by{' '}
          <a
            href="https://api.changes.tg/"
            target="_blank"
            rel="noreferrer"
          >
            @GiftChanges
          </a>{' '}
          (api.changes.tg)
        </p>
      </div>
    </div>
  )
}
