import { bjCardBackPng, bjSuitPng } from '@/games/blackjack/gifts'
import type { Suit } from '@/games/blackjack/engine'

const FAN: { suit: Suit | 'back'; rank: string; rotate: number }[] = [
  { suit: 'spades', rank: 'A', rotate: -28 },
  { suit: 'hearts', rank: 'K', rotate: -14 },
  { suit: 'back', rank: '', rotate: 0 },
  { suit: 'diamonds', rank: 'Q', rotate: 14 },
  { suit: 'clubs', rank: 'J', rotate: 28 },
]

/** Decorative idle fan shown before the first deal. */
export function BlackjackGreeting() {
  return (
    <div className="bj-greeting" aria-hidden>
      <div className="bj-greeting-fan">
        {FAN.map((c, i) => {
          const back = c.suit === 'back'
          const src = back ? bjCardBackPng(128) : bjSuitPng(c.suit, 128)
          const red = c.suit === 'hearts' || c.suit === 'diamonds'
          return (
            <div
              key={i}
              className={[
                'bj-greeting-card',
                back ? 'is-back' : '',
                red ? 'is-red' : 'is-black',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                ['--r' as string]: `${c.rotate}deg`,
                ['--i' as string]: i,
              }}
            >
              {back ? (
                <img src={src} alt="" className="bj-card-img" draggable={false} />
              ) : (
                <>
                  <span className="bj-greeting-rank">{c.rank}</span>
                  <img src={src} alt="" className="bj-card-img" draggable={false} />
                </>
              )}
            </div>
          )
        })}
      </div>
      <p className="bj-greeting-copy">Place a bet · Deal</p>
    </div>
  )
}
