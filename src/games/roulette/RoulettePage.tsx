import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GameOpenOverlay } from '@/components/GameOpenOverlay'
import { useAuth } from '@/context/AuthContext'
import {
  clampRouletteBet,
  nextRouletteBetStep,
  OUTSIDE_BETS,
  payoutForBet,
  rotationForIndex,
  ROULETTE_MIN_BET,
  spinEuropean,
  type OutsideBetType,
  type SpinResult,
} from '@/games/roulette/engine'
import { RouletteWheel } from '@/games/roulette/RouletteWheel'
import { formatMoney, formatMoneyDelta } from '@/lib/format'

const SPIN_MS = 4200

export function RoulettePage() {
  const { profile, debitBet, creditPayout } = useAuth()
  const [bet, setBet] = useState(ROULETTE_MIN_BET)
  const [betInput, setBetInput] = useState(String(ROULETTE_MIN_BET))
  const [selected, setSelected] = useState<OutsideBetType>('red')
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [lastResult, setLastResult] = useState<SpinResult | null>(null)
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  const balance = profile?.chipBalance ?? 0

  useEffect(() => {
    setBet((current) => {
      const next = clampRouletteBet(current, balance || current)
      setBetInput(String(next))
      return next
    })
  }, [balance])

  const applyBet = useCallback(
    (value: number) => {
      const next = clampRouletteBet(
        value,
        balance > 0 ? balance : ROULETTE_MIN_BET,
      )
      setBet(next)
      setBetInput(String(next))
    },
    [balance],
  )

  function commitInput() {
    const parsed = Number(betInput.replace(/[^0-9.]/g, ''))
    applyBet(parsed)
  }

  function onSpin() {
    if (!profile || spinning) return
    const amount = clampRouletteBet(bet, profile.chipBalance)
    if (amount !== bet) applyBet(amount)

    const refId = crypto.randomUUID()
    const debited = debitBet({ game: 'roulette', amount, refId })
    if (!debited.ok) {
      setResultMsg(debited.message)
      return
    }

    const result = spinEuropean()
    const spins = 6 + Math.floor(Math.random() * 3)
    const landing = rotationForIndex(result.index, 0)
    setSpinning(true)
    setResultMsg(null)
    setLastResult(null)
    setRotation((prev) => {
      const current = ((prev % 360) + 360) % 360
      let delta = landing - current
      if (delta <= 0) delta += 360
      return prev + delta + spins * 360
    })

    window.setTimeout(() => {
      const payout = payoutForBet({ type: selected, amount }, result)
      creditPayout({
        game: 'roulette',
        amount: payout,
        refId,
        bet: amount,
        countStats: true,
      })
      setLastResult(result)
      setSpinning(false)
      const net = payout - amount
      const colorLabel =
        result.color === 'green'
          ? 'Green'
          : result.color === 'red'
            ? 'Red'
            : 'Black'
      setResultMsg(
        payout > 0
          ? `${result.number} ${colorLabel} · ${formatMoneyDelta(net)}`
          : `${result.number} ${colorLabel} · ${formatMoneyDelta(-amount)}`,
      )
    }, SPIN_MS)
  }

  return (
    <GameOpenOverlay gameId="roulette" title="Roulette">
      <div className="roulette-screen">
        <div className="roulette-topbar">
          <Link to="/" className="back-link">
            ← Games
          </Link>
          <h1 className="font-display text-[1.15rem] text-[var(--label)]">
            Roulette
          </h1>
          <span className="w-12 text-right text-[11px] text-[var(--secondary-label)]">
            EU
          </span>
        </div>

        <div className="roulette-wheel-slot">
          <RouletteWheel
            rotationDeg={rotation}
            spinning={spinning}
            highlightNumber={lastResult?.number ?? null}
          />
        </div>

        <div className="roulette-controls">
          <div className="roulette-bets" role="group" aria-label="Bet type">
            {OUTSIDE_BETS.map((b) => (
              <button
                key={b.type}
                type="button"
                className={[
                  'roulette-bet-chip',
                  b.type === 'red' ? 'is-red' : '',
                  b.type === 'black' ? 'is-black' : '',
                  selected === b.type ? 'active' : '',
                ].join(' ')}
                disabled={spinning}
                onClick={() => setSelected(b.type)}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="bet-panel">
            <div className="bet-stepper">
              <button
                type="button"
                className="bet-step-btn"
                aria-label="Decrease bet"
                disabled={spinning}
                onClick={() => applyBet(nextRouletteBetStep(bet, -1))}
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
                  disabled={spinning}
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
                disabled={spinning}
                onClick={() => applyBet(nextRouletteBetStep(bet, 1))}
              >
                +
              </button>
            </div>

            <div className="bet-presets bet-presets-compact">
              <button
                type="button"
                className={[
                  'bet-chip',
                  bet === ROULETTE_MIN_BET ? 'active' : '',
                ].join(' ')}
                disabled={spinning || balance < ROULETTE_MIN_BET}
                onClick={() => applyBet(ROULETTE_MIN_BET)}
              >
                Min
              </button>
              <button
                type="button"
                className="bet-chip"
                disabled={spinning || balance < ROULETTE_MIN_BET * 2}
                onClick={() => applyBet(Math.floor(balance / 2))}
              >
                ½
              </button>
              <button
                type="button"
                className="bet-chip"
                disabled={spinning || balance < ROULETTE_MIN_BET || bet >= balance}
                onClick={() => applyBet(bet * 2)}
              >
                x2
              </button>
              <button
                type="button"
                className="bet-chip"
                disabled={spinning || balance < ROULETTE_MIN_BET}
                onClick={() => applyBet(balance)}
              >
                Max
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary roulette-spin-btn"
            disabled={
              spinning ||
              !profile ||
              profile.chipBalance < bet ||
              bet < ROULETTE_MIN_BET
            }
            onClick={onSpin}
          >
            {spinning ? 'Spinning…' : `Spin · ${formatMoney(bet)}`}
          </button>

          <p className="roulette-result" aria-live="polite">
            {resultMsg ?? '\u00a0'}
          </p>
        </div>
      </div>
    </GameOpenOverlay>
  )
}
