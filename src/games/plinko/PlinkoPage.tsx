import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GameBetControls } from '@/components/GameBetControls'
import { GameOpenOverlay } from '@/components/GameOpenOverlay'
import { useAuth } from '@/context/AuthContext'
import {
  PlinkoBoard,
  type BallLandedEvent,
  type PlinkoBoardHandle,
} from '@/games/plinko/PlinkoBoard'
import {
  clampBet,
  nextBetStep,
  PLINKO_MIN_BET,
} from '@/games/plinko/engine'
import { useGameBet } from '@/hooks/useGameBet'
import { formatMoneyDelta } from '@/lib/format'
import { playOutcome, playSound } from '@/lib/sounds'

export function PlinkoPage() {
  const { debitBet, creditPayout } = useAuth()
  const boardRef = useRef<PlinkoBoardHandle>(null)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [inFlight, setInFlight] = useState(0)

  const stake = useGameBet({
    minBet: PLINKO_MIN_BET,
    clamp: clampBet,
    nextStep: nextBetStep,
  })

  const onBallLanded = useCallback(
    (event: BallLandedEvent) => {
      setInFlight((n) => Math.max(0, n - 1))
      creditPayout({
        game: 'plinko',
        amount: event.payout,
        refId: event.id,
        bet: event.bet,
        countStats: true,
      })

      const net = event.payout - event.bet
      playSound('land')
      playOutcome(net)
      setResultMsg(`${event.multiplier}x · ${formatMoneyDelta(net)}`)
    },
    [creditPayout],
  )

  function onDrop() {
    if (!stake.profile) return
    const amount = clampBet(stake.bet, stake.profile.chipBalance)
    if (amount !== stake.bet) stake.applyBet(amount)

    const refId = crypto.randomUUID()
    const debited = debitBet({ game: 'plinko', amount, refId })
    if (!debited.ok) {
      setResultMsg(debited.message)
      return
    }

    const ok = boardRef.current?.dropBall(amount, refId)
    if (!ok) {
      creditPayout({
        game: 'plinko',
        amount,
        refId,
        countStats: false,
      })
      setResultMsg('Could not drop ball')
      return
    }

    setInFlight((n) => n + 1)
    playSound('start')
    setResultMsg(null)
  }

  return (
    <GameOpenOverlay gameId="plinko" title="Plinko">
      <div className="plinko-screen">
        <div className="plinko-topbar">
          <Link to="/" className="back-link">
            ← Games
          </Link>
          <h1 className="font-display text-[1.15rem] text-[var(--label)]">
            Plinko
          </h1>
          <span className="w-12 text-right text-[11px] tabular-nums text-[var(--secondary-label)]">
            {inFlight > 0 ? `${inFlight}` : ''}
          </span>
        </div>

        <div className="plinko-board-slot">
          <PlinkoBoard ref={boardRef} onBallLanded={onBallLanded} />
        </div>

        <GameBetControls
          bet={stake.bet}
          betInput={stake.betInput}
          minBet={stake.minBet}
          balance={stake.balance}
          actionLabel="Drop"
          canAct={stake.canAfford}
          resultMsg={resultMsg}
          onBetInputChange={stake.onBetInputChange}
          onCommitInput={stake.commitInput}
          onStep={stake.step}
          onMin={stake.setMin}
          onHalf={stake.setHalf}
          onDouble={stake.setDouble}
          onMax={stake.setMax}
          onAction={onDrop}
          canHalf={stake.canHalf}
          canDouble={stake.canDouble}
          canMinOrMax={stake.canMinOrMax}
        />
      </div>
    </GameOpenOverlay>
  )
}
