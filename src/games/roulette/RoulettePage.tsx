import { useEffect, useState } from 'react'
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
  clampRouletteBet,
  COLOR_BETS,
  landingRotation,
  nextRouletteBetStep,
  payoutForBet,
  RANGE_BETS,
  ROULETTE_MIN_BET,
  spinEuropean,
  type OutsideBetType,
  type SpinResult,
} from '@/games/roulette/engine'
import { RouletteWheel } from '@/games/roulette/RouletteWheel'
import { preloadGiftRoles } from '@/gifts/loadGiftLottie'
import { useGameBet } from '@/hooks/useGameBet'
import { formatMoneyDelta } from '@/lib/format'
import { playOutcome, playSound } from '@/lib/sounds'

const SPIN_MS = 4200

export function RoulettePage() {
  const { debitBet, creditPayout } = useAuth()
  const [selected, setSelected] = useState<OutsideBetType>('red')
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [lastResult, setLastResult] = useState<SpinResult | null>(null)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [banner, setBanner] = useState<ResultBannerState | null>(null)

  const stake = useGameBet({
    minBet: ROULETTE_MIN_BET,
    clamp: clampRouletteBet,
    nextStep: nextRouletteBetStep,
  })

  useEffect(() => {
    void preloadGiftRoles(['roulette'])
  }, [])

  function onSpin() {
    if (!stake.profile || spinning) return
    const amount = clampRouletteBet(stake.bet, stake.profile.chipBalance)
    if (amount !== stake.bet) stake.applyBet(amount)

    const refId = crypto.randomUUID()
    const debited = debitBet({ game: 'roulette', amount, refId })
    if (!debited.ok) {
      setResultMsg(debited.message)
      return
    }

    const betType = selected
    const result = spinEuropean()
    const spins = 6 + Math.floor(Math.random() * 3)
    const landing = landingRotation(result.index)
    setSpinning(true)
    setResultMsg(null)
    setBanner(null)
    setLastResult(null)
    playSound('spin')
    setRotation((prev) => {
      const current = ((prev % 360) + 360) % 360
      let delta = landing - current
      if (delta <= 0) delta += 360
      return prev + delta + spins * 360
    })

    window.setTimeout(() => {
      const payout = payoutForBet({ type: betType, amount }, result)
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
      const detail = `${result.number} ${colorLabel} · ${formatMoneyDelta(net)}`
      setBanner({
        tone: toneFromNet(net),
        title: net > 0 ? 'You win' : net < 0 ? 'You lose' : 'Push',
        detail,
      })
      playOutcome(net)
      setResultMsg(detail)
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
          <GameResultBanner banner={banner} />
          <RouletteWheel
            rotationDeg={rotation}
            spinning={spinning}
            highlightNumber={lastResult?.number ?? null}
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
        >
          <div className="roulette-bets" role="group" aria-label="Bet type">
            <div className="roulette-bets-row roulette-bets-colors">
              {COLOR_BETS.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  className={[
                    'roulette-bet-chip',
                    b.type === 'red' ? 'is-red' : '',
                    b.type === 'green' ? 'is-green' : '',
                    b.type === 'black' ? 'is-black' : '',
                    selected === b.type ? 'active' : '',
                  ].join(' ')}
                  disabled={spinning}
                  onClick={() => {
                    playSound('click')
                    setSelected(b.type)
                  }}
                >
                  <span className="roulette-bet-name">{b.label}</span>
                  <span className="roulette-bet-mult">{b.multiplier}</span>
                </button>
              ))}
            </div>
            <div className="roulette-bets-row roulette-bets-ranges">
              {RANGE_BETS.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  className={[
                    'roulette-bet-chip',
                    selected === b.type ? 'active' : '',
                  ].join(' ')}
                  disabled={spinning}
                  onClick={() => {
                    playSound('click')
                    setSelected(b.type)
                  }}
                >
                  <span className="roulette-bet-name">{b.label}</span>
                  <span className="roulette-bet-mult">{b.multiplier}</span>
                </button>
              ))}
            </div>
          </div>
        </GameBetControls>
      </div>
    </GameOpenOverlay>
  )
}
