import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { formatMoney, formatMoneyDelta } from '@/lib/format'

export function PlinkoPage() {
  const { profile, debitBet, creditPayout } = useAuth()
  const boardRef = useRef<PlinkoBoardHandle>(null)
  const [bet, setBet] = useState(PLINKO_MIN_BET)
  const [betInput, setBetInput] = useState(String(PLINKO_MIN_BET))
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [inFlight, setInFlight] = useState(0)

  const balance = profile?.chipBalance ?? 0

  useEffect(() => {
    setBet((current) => {
      const next = clampBet(current, balance || current)
      setBetInput(String(next))
      return next
    })
  }, [balance])

  const applyBet = useCallback(
    (value: number) => {
      const next = clampBet(value, balance > 0 ? balance : PLINKO_MIN_BET)
      setBet(next)
      setBetInput(String(next))
    },
    [balance],
  )

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
      setResultMsg(`${event.multiplier}x · ${formatMoneyDelta(net)}`)
    },
    [creditPayout],
  )

  function onDrop() {
    if (!profile) return
    const amount = clampBet(bet, profile.chipBalance)
    if (amount !== bet) applyBet(amount)

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
    setResultMsg(null)
  }

  function commitInput() {
    const parsed = Number(betInput.replace(/[^0-9.]/g, ''))
    applyBet(parsed)
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

        <div className="plinko-controls">
          <div className="bet-panel">
            <div className="bet-stepper">
              <button
                type="button"
                className="bet-step-btn"
                aria-label="Decrease bet"
                onClick={() => applyBet(nextBetStep(bet, -1))}
              >
                −
              </button>
              <div className="bet-input-wrap">
                <span className="bet-input-prefix">$</span>
                <input
                  className="bet-input"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={betInput}
                  aria-label="Bet amount"
                  onChange={(e) =>
                    setBetInput(e.target.value.replace(/[^\d]/g, ''))
                  }
                  onBlur={commitInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                />
              </div>
              <button
                type="button"
                className="bet-step-btn"
                aria-label="Increase bet"
                onClick={() => applyBet(nextBetStep(bet, 1))}
              >
                +
              </button>
            </div>

            <div className="bet-presets bet-presets-compact">
              <button
                type="button"
                className={['bet-chip', bet === PLINKO_MIN_BET ? 'active' : ''].join(
                  ' ',
                )}
                onClick={() => applyBet(PLINKO_MIN_BET)}
                disabled={balance < PLINKO_MIN_BET}
              >
                Min
              </button>
              <button
                type="button"
                className="bet-chip"
                onClick={() => applyBet(Math.floor(balance / 2))}
                disabled={balance < PLINKO_MIN_BET * 2}
              >
                ½
              </button>
              <button
                type="button"
                className="bet-chip"
                onClick={() => applyBet(bet * 2)}
                disabled={balance < PLINKO_MIN_BET || bet >= balance}
              >
                x2
              </button>
              <button
                type="button"
                className="bet-chip"
                onClick={() => applyBet(balance)}
                disabled={balance < PLINKO_MIN_BET}
              >
                Max
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary plinko-drop-btn"
            disabled={
              !profile || profile.chipBalance < bet || bet < PLINKO_MIN_BET
            }
            onClick={onDrop}
          >
            Drop · {formatMoney(bet)}
          </button>

          <p className="plinko-result" aria-live="polite">
            {resultMsg ?? '\u00a0'}
          </p>
        </div>
      </div>
    </GameOpenOverlay>
  )
}
