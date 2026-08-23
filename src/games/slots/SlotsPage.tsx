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
import {
  clampSlotsBet,
  nextSlotsBetStep,
  sampleSlotSpin,
  SLOTS_MIN_BET,
  slotsPayout,
  winningSlotSymbol,
  type SlotSpin,
} from '@/games/slots/engine'
import { preloadSlotsAssets } from '@/games/slots/gifts'
import { SlotsBoard } from '@/games/slots/SlotsBoard'
import { useGameBet } from '@/hooks/useGameBet'
import { formatMoneyDelta } from '@/lib/format'
import { playOutcome, playSound } from '@/lib/sounds'

const SPIN_MS = 1000
const STOP_STAGGER_MS = 500

export function SlotsPage() {
  const { debitBet, creditPayout } = useAuth()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<SlotSpin | null>(null)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [banner, setBanner] = useState<ResultBannerState | null>(null)
  const pendingRef = useRef<{
    bet: number
    refId: string
    spin: SlotSpin
  } | null>(null)

  const stake = useGameBet({
    minBet: SLOTS_MIN_BET,
    clamp: clampSlotsBet,
    nextStep: nextSlotsBetStep,
  })

  useEffect(() => {
    void preloadSlotsAssets()
  }, [])

  useEffect(() => {
    if (!spinning || !pendingRef.current) return

    const settleTimer = window.setTimeout(
      () => {
        const pending = pendingRef.current
        if (!pending) return

        const payout = slotsPayout(pending.bet, pending.spin)
        const winner = winningSlotSymbol(pending.spin)
        creditPayout({
          game: 'slots',
          amount: payout,
          refId: pending.refId,
          bet: pending.bet,
          countStats: true,
        })

        const net = payout - pending.bet
        const detail = winner
          ? winner.id === 'jester'
            ? `${winner.label} · Bet returned · ${formatMoneyDelta(net)}`
            : `${winner.label} · ${winner.multiplier}x · ${formatMoneyDelta(net)}`
          : `No match · ${formatMoneyDelta(net)}`
        setBanner({
          tone: toneFromNet(net),
          title: net > 0 ? 'You win' : net < 0 ? 'You lose' : 'Push',
          detail,
        })
        playOutcome(net)
        if (winner && winner.multiplier >= 50) playSound('win')
        setResultMsg(detail)
        setSpinning(false)
        pendingRef.current = null
      },
      SPIN_MS + STOP_STAGGER_MS * 2 + 120,
    )

    return () => window.clearTimeout(settleTimer)
  }, [spinning, creditPayout])

  function onSpin() {
    if (!stake.profile || spinning) return
    const amount = clampSlotsBet(stake.bet, stake.profile.chipBalance)
    if (amount !== stake.bet) stake.applyBet(amount)

    const refId = crypto.randomUUID()
    const debited = debitBet({ game: 'slots', amount, refId })
    if (!debited.ok) {
      setResultMsg(debited.message)
      return
    }

    const spin = sampleSlotSpin()
    pendingRef.current = { bet: amount, refId, spin }
    setResult(spin)
    setSpinning(true)
    setBanner(null)
    setResultMsg(null)
    playSound('spin')
  }

  return (
    <GameOpenOverlay gameId="slots" title="Slots">
      <div className="slots-screen">
        <div className="slots-topbar">
          <Link to="/" className="back-link">
            ← Games
          </Link>
          <h1 className="font-display text-[1.15rem] text-[var(--label)]">
            Slots
          </h1>
        </div>

        <div className="slots-board-slot">
          <GameResultBanner banner={banner} />
          <SlotsBoard
            spinning={spinning}
            result={result}
            spinMs={SPIN_MS}
            stopStaggerMs={STOP_STAGGER_MS}
          />
        </div>

        <GameBetControls
          bet={stake.bet}
          betInput={stake.betInput}
          minBet={stake.minBet}
          balance={stake.balance}
          disabled={spinning}
          busy={spinning}
          actionLabel="Spin"
          actionBusyLabel="Spinning…"
          canAct={stake.canAfford}
          resultMsg={resultMsg}
          onBetInputChange={stake.onBetInputChange}
          onCommitInput={stake.commitInput}
          onStep={stake.step}
          onMin={stake.setMin}
          onHalf={stake.setHalf}
          onDouble={stake.setDouble}
          onMax={stake.setMax}
          onAction={onSpin}
          canHalf={stake.canHalf}
          canDouble={stake.canDouble}
          canMinOrMax={stake.canMinOrMax}
        />
      </div>
    </GameOpenOverlay>
  )
}
