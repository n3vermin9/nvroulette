import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { GameBetControls } from '@/components/GameBetControls'
import { GameOpenOverlay } from '@/components/GameOpenOverlay'
import {
  GameResultBanner,
  type ResultBannerState,
} from '@/components/GameResultBanner'
import { useAuth } from '@/context/AuthContext'
import { BlackjackCard } from '@/games/blackjack/BlackjackCard'
import { BlackjackGreeting } from '@/games/blackjack/BlackjackGreeting'
import {
  BJ_MIN_BET,
  clampBlackjackBet,
  createShoe,
  dealerShouldHit,
  drawCard,
  handValue,
  nextBlackjackBetStep,
  payoutForOutcome,
  settleRound,
  type Card,
  type RoundOutcome,
} from '@/games/blackjack/engine'
import { preloadBjAssets } from '@/games/blackjack/gifts'
import { useGameBet } from '@/hooks/useGameBet'
import { formatMoneyDelta } from '@/lib/format'
import { playOutcome, playSound } from '@/lib/sounds'

type Phase = 'idle' | 'player' | 'dealer' | 'settled'

function outcomeLabel(outcome: RoundOutcome): string {
  switch (outcome) {
    case 'player-blackjack':
      return 'Blackjack!'
    case 'dealer-blackjack':
      return 'Dealer blackjack'
    case 'player-bust':
      return 'You bust'
    case 'dealer-bust':
      return 'Dealer busts'
    case 'player-win':
      return 'You win'
    case 'dealer-win':
      return 'You lose'
    case 'push':
      return 'Push'
  }
}

function outcomeTone(outcome: RoundOutcome): ResultBannerState['tone'] {
  switch (outcome) {
    case 'player-blackjack':
    case 'player-win':
    case 'dealer-bust':
      return 'win'
    case 'push':
      return 'push'
    default:
      return 'lose'
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function BlackjackPage() {
  const { debitBet, creditPayout } = useAuth()
  const [shoe, setShoe] = useState<Card[]>(() => createShoe(4))
  const [player, setPlayer] = useState<Card[]>([])
  const [dealer, setDealer] = useState<Card[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeBet, setActiveBet] = useState(0)
  const [refId, setRefId] = useState<string | null>(null)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [banner, setBanner] = useState<ResultBannerState | null>(null)
  const [giftsReady, setGiftsReady] = useState(false)
  const [hideHole, setHideHole] = useState(true)
  const [canDoubleDown, setCanDoubleDown] = useState(false)

  const stake = useGameBet({
    minBet: BJ_MIN_BET,
    clamp: clampBlackjackBet,
    nextStep: nextBlackjackBetStep,
  })

  useEffect(() => {
    let cancelled = false
    preloadBjAssets()
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

  const playerVal = handValue(player)
  const dealerVal = handValue(dealer)
  const inRound = phase === 'player' || phase === 'dealer'
  const handActive = player.length > 0 || dealer.length > 0
  const showGreeting = !handActive && !banner

  function take(from: Card[]): { card: Card; rest: Card[] } {
    const { card, shoe: rest } = drawCard(from)
    return { card, rest }
  }

  function finish(
    playerHand: Card[],
    dealerHand: Card[],
    bet: number,
    id: string,
  ) {
    const outcome = settleRound(playerHand, dealerHand)
    const payout = payoutForOutcome(bet, outcome)
    creditPayout({
      game: 'blackjack',
      amount: payout,
      refId: id,
      bet,
      countStats: true,
    })
    const net = payout - bet
    const title = outcomeLabel(outcome)
    const detail = `${handValue(playerHand).total} vs ${handValue(dealerHand).total} · ${formatMoneyDelta(net)}`
    setBanner({ tone: outcomeTone(outcome), title, detail })
    setResultMsg(`${title} · ${formatMoneyDelta(net)}`)
    playOutcome(net)
    setPhase('settled')
    setActiveBet(0)
    setRefId(null)
    setCanDoubleDown(false)
  }

  async function runDealer(
    playerHand: Card[],
    dealerHand: Card[],
    restShoe: Card[],
    bet: number,
    id: string,
  ) {
    setPhase('dealer')
    setHideHole(false)
    playSound('card')
    let d = [...dealerHand]
    let s = restShoe

    await wait(420)

    while (dealerShouldHit(d)) {
      const { card, rest } = take(s)
      d = [...d, card]
      s = rest
      setDealer(d)
      setShoe(s)
      playSound('card')
      await wait(380)
    }

    setDealer(d)
    setShoe(s)
    finish(playerHand, d, bet, id)
  }

  function onDeal() {
    if (!stake.profile || inRound || !giftsReady) return
    const amount = clampBlackjackBet(stake.bet, stake.profile.chipBalance)
    if (amount !== stake.bet) stake.applyBet(amount)

    const id = crypto.randomUUID()
    const debited = debitBet({ game: 'blackjack', amount, refId: id })
    if (!debited.ok) {
      setResultMsg(debited.message)
      return
    }

    let s = shoe
    const p: Card[] = []
    const d: Card[] = []
    for (let i = 0; i < 2; i++) {
      const a = take(s)
      p.push(a.card)
      s = a.rest
      const b = take(s)
      d.push(b.card)
      s = b.rest
    }

    setShoe(s)
    setPlayer(p)
    setDealer(d)
    setActiveBet(amount)
    setRefId(id)
    setHideHole(true)
    setResultMsg(null)
    setBanner(null)
    setCanDoubleDown(stake.profile.chipBalance >= amount * 2)
    playSound('start')
    playSound('card')

    const pv = handValue(p)
    const dv = handValue(d)
    if (pv.blackjack || dv.blackjack) {
      setHideHole(false)
      finish(p, d, amount, id)
      return
    }

    setPhase('player')
  }

  function onHit() {
    if (phase !== 'player' || !refId) return
    setCanDoubleDown(false)
    const { card, rest } = take(shoe)
    const next = [...player, card]
    setPlayer(next)
    setShoe(rest)
    playSound('card')
    const v = handValue(next)
    if (v.bust) {
      setHideHole(false)
      finish(next, dealer, activeBet, refId)
      return
    }
    if (v.total === 21) {
      void runDealer(next, dealer, rest, activeBet, refId)
    }
  }

  function onStand() {
    if (phase !== 'player' || !refId) return
    playSound('click')
    void runDealer(player, dealer, shoe, activeBet, refId)
  }

  function onDoubleDown() {
    if (
      phase !== 'player' ||
      !refId ||
      !canDoubleDown ||
      player.length !== 2 ||
      !stake.profile
    ) {
      return
    }
    if (stake.profile.chipBalance < activeBet) return

    const id = refId
    const extra = activeBet
    const debited = debitBet({
      game: 'blackjack',
      amount: extra,
      refId: `${id}-dbl`,
      countStats: false,
    })
    if (!debited.ok) {
      setResultMsg(debited.message)
      return
    }

    const totalBet = activeBet + extra
    setActiveBet(totalBet)
    setCanDoubleDown(false)
    playSound('bet')

    const { card, rest } = take(shoe)
    const next = [...player, card]
    setPlayer(next)
    setShoe(rest)
    playSound('card')

    if (handValue(next).bust) {
      setHideHole(false)
      finish(next, dealer, totalBet, id)
      return
    }
    void runDealer(next, dealer, rest, totalBet, id)
  }

  const actionLabel =
    !giftsReady
      ? 'Loading'
      : phase === 'dealer'
        ? '…'
        : phase === 'player'
          ? 'Your turn'
          : 'Deal'

  function onAction() {
    if (phase === 'idle' || phase === 'settled') {
      onDeal()
    }
  }

  return (
    <GameOpenOverlay gameId="blackjack" title="Blackjack">
      <div className="bj-screen">
        <div className="bj-topbar">
          <Link to="/" className="back-link">
            ← Games
          </Link>
          <h1 className="font-display text-[1.15rem] text-[var(--label)]">
            Blackjack
          </h1>
          <span className="w-14 text-right text-[11px] tabular-nums text-[var(--secondary-label)]">
            {player.length > 0 ? playerVal.total : ''}
          </span>
        </div>

        <div className="bj-table">
          <GameResultBanner banner={banner} />

          {showGreeting ? <BlackjackGreeting /> : null}

          <div
            className={[
              'bj-hand bj-hand-dealer',
              handActive ? 'is-active' : '',
            ].join(' ')}
          >
            {handActive ? (
              <div className="bj-hand-meta">
                <span>Dealer</span>
                <span className="bj-hand-total">
                  {hideHole
                    ? handValue([dealer[0]!]).total
                    : dealerVal.total}
                </span>
              </div>
            ) : null}
            <div className="bj-cards">
              {dealer.map((c, i) => (
                <BlackjackCard
                  key={c.id}
                  card={c}
                  hidden={hideHole && i === 1}
                  className="bj-card-deal"
                  style={{ '--i': i } as CSSProperties}
                />
              ))}
            </div>
          </div>

          <div
            className={[
              'bj-hand bj-hand-player',
              handActive ? 'is-active' : '',
            ].join(' ')}
          >
            {handActive ? (
              <div className="bj-hand-meta">
                <span>You</span>
                <span className="bj-hand-total">{playerVal.total}</span>
              </div>
            ) : null}
            <div className="bj-cards">
              {player.map((c, i) => (
                <BlackjackCard
                  key={c.id}
                  card={c}
                  className="bj-card-deal"
                  style={{ '--i': i } as CSSProperties}
                />
              ))}
            </div>
          </div>
        </div>

        <GameBetControls
          bet={stake.bet}
          betInput={stake.betInput}
          minBet={stake.minBet}
          balance={stake.balance}
          disabled={inRound}
          busy={phase === 'dealer'}
          actionLabel={actionLabel}
          actionBusyLabel="Dealer…"
          canAct={
            phase === 'player' || phase === 'dealer'
              ? false
              : giftsReady && stake.canAfford
          }
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
          <div
            className={[
              'bj-actions',
              phase === 'player' ? 'is-open' : '',
            ].join(' ')}
            role="group"
            aria-label="Play"
            aria-hidden={phase !== 'player'}
          >
            <button
              type="button"
              className="bj-action-btn"
              disabled={phase !== 'player'}
              tabIndex={phase === 'player' ? 0 : -1}
              onClick={onHit}
            >
              Hit
            </button>
            <button
              type="button"
              className="bj-action-btn bj-action-primary"
              disabled={phase !== 'player'}
              tabIndex={phase === 'player' ? 0 : -1}
              onClick={onStand}
            >
              Stand
            </button>
            <button
              type="button"
              className="bj-action-btn"
              disabled={
                phase !== 'player' || !canDoubleDown || player.length !== 2
              }
              tabIndex={phase === 'player' ? 0 : -1}
              onClick={onDoubleDown}
            >
              Double
            </button>
          </div>
        </GameBetControls>
      </div>
    </GameOpenOverlay>
  )
}
