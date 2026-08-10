import { Link } from 'react-router-dom'
import { GamePreview } from '@/components/GamePreview'
import { GAMES } from '@/games/catalog'

export function LobbyPage() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="sr-only">Games</h1>
      <ul className="motion-fade-up game-list">
        {GAMES.map((game) => {
          const inner = (
            <>
              <div className="game-preview" aria-hidden>
                <GamePreview gameId={game.id} />
              </div>
              <div className="game-card-meta">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[1.25rem] text-[var(--label)]">
                    {game.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-[var(--secondary-label)]">
                    {game.blurb}
                  </p>
                </div>
                {game.status === 'soon' ? (
                  <span className="status-chip soon">Soon</span>
                ) : (
                  <span className="status-chip play">Play</span>
                )}
              </div>
            </>
          )

          return (
            <li key={game.id}>
              {game.path && game.status === 'live' ? (
                <Link to={game.path} className="game-card game-card-link">
                  {inner}
                </Link>
              ) : (
                <div className="game-card game-card-disabled">{inner}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
