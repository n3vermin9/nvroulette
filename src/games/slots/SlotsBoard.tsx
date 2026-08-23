import { useEffect, useState } from 'react'
import { TgGiftLottie } from '@/components/TgGiftLottie'
import { giftPngUrl } from '@/gifts/catalog'
import {
  randomSlotSymbol,
  SLOT_SYMBOLS,
  type SlotSymbol,
  type SlotSpin,
  winningSlotSymbol,
} from '@/games/slots/engine'

type Props = {
  spinning: boolean
  result: SlotSpin | null
  /** ms between reel stops (left → right). */
  stopStaggerMs?: number
  spinMs?: number
}

const TICK_MS = 72
const RING_SYMBOLS = [...SLOT_SYMBOLS, ...SLOT_SYMBOLS, ...SLOT_SYMBOLS]

function adjacentSymbol(symbol: SlotSymbol, offset: number): SlotSymbol {
  const index = SLOT_SYMBOLS.findIndex((item) => item.id === symbol.id)
  return SLOT_SYMBOLS[(index + offset + SLOT_SYMBOLS.length) % SLOT_SYMBOLS.length]!
}

function Reel({
  symbol,
  reelIndex,
  spinning,
  settled,
  jackpot,
}: {
  symbol: SlotSymbol
  reelIndex: number
  spinning: boolean
  settled: boolean
  jackpot: boolean
}) {
  // Each reel gets a different neighbor pair, so a matched payout still
  // resolves into a varied top/current/bottom strip instead of three copies.
  const future = adjacentSymbol(symbol, reelIndex + 1)
  const previous = adjacentSymbol(symbol, -(reelIndex + 1))

  return (
    <div
      className={[
        'slots-reel',
        spinning ? 'is-spinning' : '',
        settled ? 'is-settled' : '',
        jackpot ? 'is-jackpot' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {spinning ? (
        <div className="slots-reel-window">
          <div
            className="slots-reel-ring"
            style={{ animationDelay: `${-reelIndex * 110}ms` }}
          >
            {RING_SYMBOLS.map((ringSymbol, index) => (
              <div className="slots-ring-symbol" key={`${ringSymbol.id}-${index}`}>
                <img src={giftPngUrl(ringSymbol.slug, 64)} alt="" draggable={false} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="slots-reel-static">
          <div className="slots-reel-symbol is-future">
            <img src={giftPngUrl(future.slug, 64)} alt="" draggable={false} />
          </div>
          <div className="slots-reel-inner">
            <TgGiftLottie
              key={symbol.id}
              gift={symbol.slug}
              play={false}
              className="slots-reel-lottie"
              fallback={
                <img
                  src={giftPngUrl(symbol.slug, 128)}
                  alt=""
                  className="slots-reel-img"
                  draggable={false}
                />
              }
            />
          </div>
          <div className="slots-reel-symbol is-previous">
            <img src={giftPngUrl(previous.slug, 64)} alt="" draggable={false} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Three-reel slots board with staggered stops. */
export function SlotsBoard({
  spinning,
  result,
  stopStaggerMs = 500,
  spinMs = 1000,
}: Props) {
  const [paytableOpen, setPaytableOpen] = useState(false)
  const [faces, setFaces] = useState<SlotSymbol[]>(() =>
    SLOT_SYMBOLS.slice(0, 3).map((s) => s),
  )
  const [stopped, setStopped] = useState(0)

  useEffect(() => {
    if (!spinning) {
      if (result) {
        setFaces([...result])
        setStopped(3)
      }
      return
    }

    setStopped(0)
    let tickTimer = 0
    let stopTimers: number[] = []
    const stoppedReels = new Set<number>()

    tickTimer = window.setInterval(() => {
      setFaces((current) =>
        current.map((face, index) =>
          stoppedReels.has(index) ? face : randomSlotSymbol(),
        ),
      )
    }, TICK_MS)

    for (let i = 0; i < 3; i++) {
      const t = window.setTimeout(
        () => {
          stoppedReels.add(i)
          if (result) {
            setFaces((prev) => {
              const next = [...prev]
              next[i] = result[i]
              return next
            })
          }
          setStopped((n) => n + 1)
        },
        spinMs + i * stopStaggerMs,
      )
      stopTimers.push(t)
    }

    return () => {
      window.clearInterval(tickTimer)
      for (const t of stopTimers) window.clearTimeout(t)
    }
  }, [spinning, result, spinMs, stopStaggerMs])

  const winner = result ? winningSlotSymbol(result) : null
  const jackpot = Boolean(winner && winner.multiplier >= 50 && stopped >= 3)

  return (
    <div className="slots-board">
      <div className="slots-machine">
        <button
          type="button"
          className="slots-info"
          aria-label="Show slot payouts"
          aria-haspopup="dialog"
          aria-expanded={paytableOpen}
          onClick={() => setPaytableOpen(true)}
        >
          i
        </button>
        {paytableOpen ? (
          <div
            className="slots-paytable-backdrop"
            role="presentation"
            onClick={() => setPaytableOpen(false)}
          >
            <section
              className="slots-paytable"
              role="dialog"
              aria-modal="true"
              aria-labelledby="slots-paytable-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="slots-paytable-heading">
                <h2 id="slots-paytable-title">Payouts</h2>
                <button
                  type="button"
                  className="slots-paytable-close"
                  aria-label="Close payouts"
                  onClick={() => setPaytableOpen(false)}
                >
                  ×
                </button>
              </div>
              <p className="slots-paytable-note">Match three symbols to win.</p>
              <div className="slots-paytable-grid">
                {SLOT_SYMBOLS.map((sym) => (
                  <div
                    key={sym.id}
                    className={[
                      'slots-pay-row',
                      winner?.id === sym.id && stopped >= 3 ? 'is-hit' : '',
                      sym.multiplier >= 50 ? 'is-rare' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <img
                      src={giftPngUrl(sym.slug, 64)}
                      alt=""
                      className="slots-pay-icon"
                      draggable={false}
                    />
                    <span className="slots-pay-mult">
                      {sym.id === 'jester' ? 'Bet back' : `${sym.multiplier}x`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
        <div className="slots-reels">
          {faces.map((sym, i) => (
            <Reel
              key={i}
              symbol={sym}
              reelIndex={i}
              spinning={spinning && stopped <= i}
              settled={!spinning || stopped > i}
              jackpot={jackpot && sym.id === winner?.id}
            />
          ))}
        </div>
        <div className="slots-machine-payline" />
      </div>
    </div>
  )
}
