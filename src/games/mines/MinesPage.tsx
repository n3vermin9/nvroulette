import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GameBetControls } from '@/components/GameBetControls'
import { GameOpenOverlay } from '@/components/GameOpenOverlay'
import {
  GameResultBanner,
  type ResultBannerState,
} from '@/components/GameResultBanner'
import { useAuth } from '@/context/AuthContext'
import {
  emptyTiles,
  MinesBoard,
  revealAllMines,
  type TileState,
} from '@/games/mines/MinesBoard'
import {
  clampMinesBet,
  MINE_COUNT_OPTIONS,
  minesMultiplier,
  minesPayout,
  MINES_MIN_BET,
  MINES_TILES,
  nextMinesBetStep,
  placeMines,
  type MineCount,
} from '@/games/mines/engine'
import { preloadGiftRoles } from '@/gifts/loadGiftLottie'
import { useGameBet } from '@/hooks/useGameBet'
import { formatMoneyDelta } from '@/lib/format'

type Phase = 'idle' | 'playing' | 'busted'

const LOSE_BANNER_DELAY_MS = 1000

export function MinesPage() {
  const { debitBet, creditPayout } = useAuth()
  const [mineCount, setMineCount] = useState<MineCount>(5)
  const [phase, setPhase] = useState<Phase>('idle')
  const [tiles, setTiles] = useState<TileState[]>(() => emptyTiles())
  const [mines, setMines] = useState<Set<number>>(() => new Set())
  const [revealed, setRevealed] = useState(0)
  const [activeBet, setActiveBet] = useState(0)
  const [refId, setRefId] = useState<string | null>(null)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [banner, setBanner] = useState<ResultBannerState | null>(null)
  const [giftsReady, setGiftsReady] = useState(false)
  const [animatedMineIndex, setAnimatedMineIndex] = useState<number | null>(
    null,
  )
  const [boardKey, setBoardKey] = useState(0)
  const loseEpoch = useRef(0)
  const loseBannerTimer = useRef<number | null>(null)

  const stake = useGameBet({
    minBet: MINES_MIN_BET,
    clamp: clampMinesBet,
    nextStep: nextMinesBetStep,
  })

  useEffect(() => {
    let cancelled = false
    preloadGiftRoles(['gem', 'mine'])
      .then(() => {
        if (!cancelled) setGiftsReady(true)
      })
      .catch(() => {
        if (!cancelled) setGiftsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (loseBannerTimer.current != null) {
        window.clearTimeout(loseBannerTimer.current)
      }
    }
  }, [])

  const multiplier = useMemo(
    () => minesMultiplier(mineCount, revealed),
    [mineCount, revealed],
  )
  const cashout = activeBet > 0 ? minesPayout(activeBet, multiplier) : 0
  const inRound = phase === 'playing'

  function clearLoseBannerTimer() {
    if (loseBannerTimer.current != null) {
      window.clearTimeout(loseBannerTimer.current)
      loseBannerTimer.current = null
    }
  }

  function onStart() {
    if (!stake.profile || phase === 'playing' || !giftsReady) return

    const balance = stake.profile.chipBalance
    if (balance < MINES_MIN_BET) {
      setResultMsg('Not enough balance')
      return
    }

    const amount = clampMinesBet(stake.bet, balance)
    stake.applyBet(amount)

    const id = crypto.randomUUID()
    const debited = debitBet({ game: 'mines', amount, refId: id })
    if (!debited.ok) {
      setResultMsg(debited.message)
      return
    }

    loseEpoch.current += 1
    clearLoseBannerTimer()
    setBanner(null)
    setRefId(id)
    setActiveBet(amount)
    setMines(placeMines(mineCount))
    setTiles(emptyTiles())
    setRevealed(0)
    setAnimatedMineIndex(null)
    setBoardKey((k) => k + 1)
    setPhase('playing')
    setResultMsg(null)
  }

  function onReveal(index: number) {
    if (phase !== 'playing' || !refId) return
    if (tiles[index] !== 'hidden') return

    if (mines.has(index)) {
      const epoch = ++loseEpoch.current
      setAnimatedMineIndex(index)
      setTiles((prev) => {
        const next = [...prev]
        next[index] = 'mine'
        return revealAllMines(next, mines)
      })
      setPhase('busted')
      const loss = formatMoneyDelta(-activeBet)
      const loseBanner: ResultBannerState = {
        tone: 'lose',
        title: 'You lose',
        detail: `Boom · ${loss}`,
      }
      setResultMsg(`Boom · ${loss}`)
      creditPayout({
        game: 'mines',
        amount: 0,
        refId,
        bet: activeBet,
        countStats: true,
      })
      setActiveBet(0)
      setRefId(null)

      clearLoseBannerTimer()
      loseBannerTimer.current = window.setTimeout(() => {
        if (loseEpoch.current !== epoch) return
        setBanner(loseBanner)
        loseBannerTimer.current = null
      }, LOSE_BANNER_DELAY_MS)
      return
    }

    const nextRevealed = revealed + 1
    const nextMult = minesMultiplier(mineCount, nextRevealed)
    const safeLeft = MINES_TILES - mineCount - nextRevealed

    if (safeLeft <= 0) {
      const payout = minesPayout(activeBet, nextMult)
      const net = payout - activeBet
      creditPayout({
        game: 'mines',
        amount: payout,
        refId,
        bet: activeBet,
        countStats: true,
      })
      setAnimatedMineIndex(null)
      setTiles((prev) => {
        const next = [...prev]
        next[index] = 'gem'
        return revealAllMines(next, mines)
      })
      setPhase('idle')
      setBanner({
        tone: 'win',
        title: 'You win',
        detail: `Cleared · ${nextMult.toFixed(2)}x · ${formatMoneyDelta(net)}`,
      })
      setResultMsg(
        `Cleared · ${nextMult.toFixed(2)}x · ${formatMoneyDelta(net)}`,
      )
      setActiveBet(0)
      setRefId(null)
      setRevealed(0)
      return
    }

    setTiles((prev) => {
      const next = [...prev]
      next[index] = 'gem'
      return next
    })
    setRevealed(nextRevealed)
    setResultMsg(`${nextMult.toFixed(2)}x`)
  }

  function onCashOut() {
    if (phase !== 'playing' || !refId || revealed < 1) return
    const payout = minesPayout(activeBet, multiplier)
    const net = payout - activeBet
    creditPayout({
      game: 'mines',
      amount: payout,
      refId,
      bet: activeBet,
      countStats: true,
    })
    setAnimatedMineIndex(null)
    setTiles((prev) => revealAllMines(prev, mines))
    setPhase('idle')
    setBanner({
      tone: 'win',
      title: 'You win',
      detail: `Cash out · ${multiplier.toFixed(2)}x · ${formatMoneyDelta(net)}`,
    })
    setResultMsg(
      `Cash out · ${multiplier.toFixed(2)}x · ${formatMoneyDelta(net)}`,
    )
    setActiveBet(0)
    setRefId(null)
    setRevealed(0)
  }

  function onAction() {
    if (phase === 'playing') {
      onCashOut()
      return
    }
    onStart()
  }

  const actionLabel =
    phase === 'playing'
      ? revealed > 0
        ? 'Cash out'
        : 'Pick tiles'
      : !giftsReady
        ? 'Loading'
        : phase === 'busted'
          ? 'Play again'
          : 'Start'

  const canStart = giftsReady && stake.balance >= MINES_MIN_BET

  return (
    <GameOpenOverlay gameId="mines" title="Mines">
      <div className="mines-screen">
        <div className="mines-topbar">
          <Link to="/" className="back-link">
            ← Games
          </Link>
          <h1 className="font-display text-[1.15rem] text-[var(--label)]">
            Mines
          </h1>
          <span className="w-14 text-right text-[11px] tabular-nums text-[var(--secondary-label)]">
            {inRound && revealed > 0 ? `${multiplier.toFixed(2)}x` : ''}
          </span>
        </div>

        <div className="mines-board-slot">
          <GameResultBanner banner={banner} />
          <MinesBoard
            key={boardKey}
            tiles={tiles}
            disabled={!inRound}
            animatedMineIndex={animatedMineIndex}
            onReveal={onReveal}
          />
        </div>

        <GameBetControls
          bet={stake.bet}
          betInput={stake.betInput}
          minBet={stake.minBet}
          balance={stake.balance}
          disabled={inRound}
          actionLabel={actionLabel}
          actionAmount={
            phase === 'playing' && revealed > 0 ? cashout : stake.bet
          }
          skipBalanceCheck
          canAct={phase === 'playing' ? revealed > 0 : canStart}
          resultMsg={resultMsg}
          onBetInputChange={stake.onBetInputChange}
          onCommitInput={stake.commitInput}
          onStep={stake.step}
          onMin={stake.setMin}
          onHalf={stake.setHalf}
          onDouble={stake.setDouble}
          onMax={stake.setMax}
          onAction={onAction}
          canHalf={stake.canHalf}
          canDouble={stake.canDouble}
          canMinOrMax={stake.canMinOrMax}
        >
          <div className="mines-options" role="group" aria-label="Mine count">
            {MINE_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={[
                  'mines-option',
                  mineCount === n ? 'active' : '',
                ].join(' ')}
                disabled={inRound}
                onClick={() => setMineCount(n)}
              >
                <span className="mines-option-name">{n}</span>
                <span className="mines-option-mult">mines</span>
              </button>
            ))}
          </div>
        </GameBetControls>
      </div>
    </GameOpenOverlay>
  )
}
