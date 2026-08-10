import { useEffect, useState, type ReactNode } from 'react'
import { GamePreview } from '@/components/GamePreview'

type Props = {
  gameId: string
  title: string
  children: ReactNode
  /** ms before the game UI is revealed */
  durationMs?: number
}

export function GameOpenOverlay({
  gameId,
  title,
  children,
  durationMs = 1400,
}: Props) {
  const [phase, setPhase] = useState<'in' | 'out' | 'done'>('in')

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      setPhase('done')
      return
    }

    const outTimer = window.setTimeout(() => setPhase('out'), durationMs - 320)
    const doneTimer = window.setTimeout(() => setPhase('done'), durationMs)
    return () => {
      window.clearTimeout(outTimer)
      window.clearTimeout(doneTimer)
    }
  }, [durationMs])

  return (
    <div className="game-open-root">
      <div
        className={[
          'game-open-content',
          phase === 'done' ? 'game-open-content-ready' : 'game-open-content-wait',
        ].join(' ')}
      >
        {children}
      </div>

      {phase !== 'done' ? (
        <div
          className={['game-open-overlay', phase === 'out' ? 'is-out' : ''].join(
            ' ',
          )}
          aria-hidden
        >
          <div className="game-open-card">
            <div className="game-open-preview">
              <GamePreview gameId={gameId} />
            </div>
            <p className="game-open-title">{title}</p>
            <p className="game-open-sub">Get ready</p>
            <div className="game-open-bar" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
