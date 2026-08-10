export type GameStatus = 'live' | 'soon'

export type GameEntry = {
  id: string
  name: string
  blurb: string
  mark: string
  status: GameStatus
  path: string | null
}

export const GAMES: GameEntry[] = [
  {
    id: 'plinko',
    name: 'Plinko',
    blurb: 'Drop · pegs · multipliers',
    mark: 'P',
    status: 'live',
    path: '/games/plinko',
  },
  {
    id: 'roulette',
    name: 'Roulette',
    blurb: 'European wheel · outside bets',
    mark: 'R',
    status: 'live',
    path: '/games/roulette',
  },
]
