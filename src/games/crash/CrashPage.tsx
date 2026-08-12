import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GameBetControls } from '@/components/GameBetControls'
import { GameOpenOverlay } from '@/components/GameOpenOverlay'
import {
  GameResultBanner,
  toneFromNet,
  type ResultBannerState,
} from '@/components/GameResultBanner'
import { useAuth } from '@/context/AuthContext'
import { CrashBoard, type CrashBoardPhase } from '@/games/crash/CrashBoard'
import {
  clampCrashBet,
  crashPayout,
  CRASH_MIN_BET,
  formatMultiplier,
  multiplierAt,
  nextCrashBetStep,
  sampleCrashPoint,
  surfProgress,
} from '@/games/crash/engine'
import { preloadGiftRoles } from '@/gifts/loadGiftLottie'
import { useGameBet } from '@/hooks/useGameBet'
import { formatMoneyDelta } from '@/lib/format'
import { playSound } from '@/lib/sounds'

export function CrashPage() {
  const { debitBet, creditPayout } = useAuth()
  const [phase, setPhase] = useState<CrashBoardPhase>('idle')
  const [multiplier, setMultiplier] = useState(1)
  const [progress, setProgress] = useState(0)
  const [activeBet, setActiveBet] = useState(0)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [banner, setBanner] = useState<ResultBannerState | null>(null)

  const crashAtRef = useRef(1)
  const startRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef<CrashBoardPhase>('idle')
  const betRef = useRef(0)
  const refIdRef = useRef<string | null>(null)
  const multRef = useRef(1)
  const tickFloorRef = useRef(1)

  const stake = useGameBet({
    minBet: CRASH_MIN_BET,
    clamp: clampCrashBet,
    nextStep: nextCrashBetStep,
  })

  useEffect(() => {
    void preloadGiftRoles(['crash'])
  }, [])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function stopLoop() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  function settleCrash(bet: number, id: string, crashAt: number) {
    creditPayout({
      game: 'crash',
      amount: 0,
      refId: id,
      bet,
      countStats: true,
    })
    const loss = formatMoneyDelta(-bet)
    setBanner({
      tone: 'lose',
      title: 'You lose',
      detail: `Crashed at ${formatMultiplier(crashAt)} · ${loss}`,
    })
    playSound('boom')
    setResultMsg(`Crashed · ${formatMultiplier(crashAt)} · ${loss}`)
    setActiveBet(0)
    betRef.current = 0
    refIdRef.current = null
  }

  function tick() {
    if (phaseRef.current !== 'flying') return
    const elapsed = performance.now() - startRef.current
    const crashAt = crashAtRef.current
    const live = multiplierAt(elapsed)
    multRef.current = live

    if (live >= crashAt) {
      stopLoop()
      setMultiplier(crashAt)
      setProgress(1)
      setPhase('crashed')
      const bet = betRef.current
      const id = refIdRef.current
      if (bet > 0 && id) settleCrash(bet, id, crashAt)
      return
    }

    setMultiplier(live)
    setProgress(surfProgress(live, crashAt))
    const floor = Math.floor(live)
    if (floor > tickFloorRef.current) {
      tickFloorRef.current = floor
      playSound('tick')
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function onStart() {
    if (!stake.profile || phase === 'flying') return
    const amount = clampCrashBet(stake.bet, stake.profile.chipBalance)
    if (amount !== stake.bet) stake.applyBet(amount)

    const id = crypto.randomUUID()
    const debited = debitBet({ game: 'crash', amount, refId: id })
    if (!debited.ok) {
      setResultMsg(debited.message)
      return
    }

    const crashAt = sampleCrashPoint()
    crashAtRef.current = crashAt
    startRef.current = performance.now()
    betRef.current = amount
    refIdRef.current = id
    multRef.current = 1
    tickFloorRef.current = 1
    setActiveBet(amount)
    setBanner(null)
    setResultMsg(null)
    setMultiplier(1)
    setProgress(0)
    setPhase('flying')
    playSound('start')
    stopLoop()
    rafRef.current = requestAnimationFrame(tick)
  }

  function onCashOut() {
    if (phase !== 'flying' || !refIdRef.current || betRef.current <= 0) return
    stopLoop()
    const bet = betRef.current
    const id = refIdRef.current
    const mult = multRef.current
    const payout = crashPayout(bet, mult)
    creditPayout({
      game: 'crash',
      amount: payout,
      refId: id,
      bet,
      countStats: true,
    })
    const net = payout - bet
    setPhase('cashed')
    setMultiplier(mult)
    setProgress(surfProgress(mult, crashAtRef.current))
    setBanner({
      tone: toneFromNet(net),
      title: 'You win',
      detail: `Cashed · ${formatMultiplier(mult)} · ${formatMoneyDelta(net)}`,
    })
    playSound('cash')
    setResultMsg(`Cashed · ${formatMultiplier(mult)} · ${formatMoneyDelta(net)}`)
    setActiveBet(0)
    betRef.current = 0
    refIdRef.current = null
  }

  const flying = phase === 'flying'
  const canCash = flying && activeBet > 0
  const cashAmount = canCash ? crashPayout(activeBet, multiplier) : activeBet

  return (
    <GameOpenOverlay gameId="crash" title="Crash">
      <div className="crash-screen">
        <div className="crash-topbar">
          <Link to="/" className="back-link">
            ← Games
          </Link>
          <h1 className="font-display text-[1.15rem] text-[var(--label)]">
            Crash
          </h1>
          <span className="w-12 text-right text-[11px] text-[var(--secondary-label)]">
            Surf
          </span>
        </div>

        <div className="crash-board-slot">
          <GameResultBanner banner={banner} />
          <CrashBoard
            phase={phase}
            multiplier={multiplier}
            progress={progress}
          />
        </div>

        <GameBetControls
          bet={stake.bet}
          betInput={stake.betInput}
          minBet={stake.minBet}
          balance={stake.balance}
          disabled={flying}
          busy={false}
          actionLabel={flying ? 'Cash out' : 'Surf'}
          actionAmount={flying ? cashAmount : stake.bet}
          skipBalanceCheck={canCash}
          canAct={flying ? canCash : stake.canAfford}
          resultMsg={resultMsg}
          onBetInputChange={stake.onBetInputChange}
          onCommitInput={stake.commitInput}
          onStep={stake.step}
          onMin={stake.setMin}
          onHalf={stake.setHalf}
          onDouble={stake.setDouble}
          onMax={stake.setMax}
          onAction={flying ? onCashOut : onStart}
          canHalf={stake.canHalf}
          canDouble={stake.canDouble}
          canMinOrMax={stake.canMinOrMax}
        />
      </div>
    </GameOpenOverlay>
  )
}
