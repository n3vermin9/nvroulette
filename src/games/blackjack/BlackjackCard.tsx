import type { CSSProperties } from 'react'
import {
  isRedSuit,
  suitGlyph,
  type Card,
} from '@/games/blackjack/engine'
import { bjCardBackPng, bjSuitPng } from '@/games/blackjack/gifts'

type Props = {
  card?: Card | null
  /** Face-down / hole card. */
  hidden?: boolean
  className?: string
  style?: CSSProperties
}

export function BlackjackCard({
  card,
  hidden = false,
  className,
  style,
}: Props) {
  if (hidden || !card) {
    return (
      <div
        className={['bj-card', 'bj-card-back', className]
          .filter(Boolean)
          .join(' ')}
        style={style}
        aria-label="Hidden card"
      >
        <div className="bj-card-back-art" aria-hidden>
          <img
            src={bjCardBackPng(128)}
            alt=""
            className="bj-card-img"
            draggable={false}
          />
        </div>
      </div>
    )
  }

  const red = isRedSuit(card.suit)
  const glyph = suitGlyph(card.suit)

  return (
    <div
      className={[
        'bj-card',
        'bj-card-face',
        red ? 'is-red' : 'is-black',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <div className="bj-card-corner bj-card-corner-tl">
        <span className="bj-card-rank">{card.rank}</span>
        <span className="bj-card-pip">{glyph}</span>
      </div>
      <div className="bj-card-art" aria-hidden>
        <img
          src={bjSuitPng(card.suit, 128)}
          alt=""
          className="bj-card-img"
          draggable={false}
        />
      </div>
      <div className="bj-card-corner bj-card-corner-br">
        <span className="bj-card-rank">{card.rank}</span>
        <span className="bj-card-pip">{glyph}</span>
      </div>
    </div>
  )
}
