import { TgGiftLottie } from '@/components/TgGiftLottie'
import {
  MINES_GRID,
  MINES_TILES,
  type MineCount,
} from '@/games/mines/engine'

export type TileState = 'hidden' | 'gem' | 'mine'

type Props = {
  tiles: TileState[]
  disabled?: boolean
  /** Only this mine tile plays its reveal animation; others show last frame. */
  animatedMineIndex?: number | null
  onReveal: (index: number) => void
}

export function MinesBoard({
  tiles,
  disabled,
  animatedMineIndex = null,
  onReveal,
}: Props) {
  return (
    <div
      className="mines-board"
      style={{ gridTemplateColumns: `repeat(${MINES_GRID}, minmax(0, 1fr))` }}
      role="grid"
      aria-label="Mines board"
    >
      {Array.from({ length: MINES_TILES }, (_, i) => {
        const state = tiles[i] ?? 'hidden'
        const isAnimatedMine = state === 'mine' && animatedMineIndex === i
        return (
          <button
            key={i}
            type="button"
            className={[
              'mines-tile',
              state === 'gem' ? 'is-gem' : '',
              state === 'mine' ? 'is-mine' : '',
              state !== 'hidden' ? 'is-revealed' : '',
            ].join(' ')}
            disabled={disabled || state !== 'hidden'}
            aria-label={
              state === 'hidden'
                ? `Tile ${i + 1}`
                : state === 'gem'
                  ? 'Gem'
                  : 'Mine'
            }
            onClick={() => onReveal(i)}
          >
            {state === 'gem' ? (
              <span className="mines-tile-icon" aria-hidden>
                <TgGiftLottie
                  role="gem"
                  loop={false}
                  className="mines-tile-lottie"
                  fallback="◆"
                />
              </span>
            ) : null}
            {state === 'mine' ? (
              <span className="mines-tile-icon" aria-hidden>
                <TgGiftLottie
                  role="mine"
                  loop={false}
                  play={isAnimatedMine}
                  className="mines-tile-lottie"
                  fallback="●"
                />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function emptyTiles(): TileState[] {
  return Array.from({ length: MINES_TILES }, () => 'hidden')
}

export function revealAllMines(
  tiles: TileState[],
  mines: Set<number>,
): TileState[] {
  return tiles.map((t, i) => (mines.has(i) ? 'mine' : t))
}

export type { MineCount }
