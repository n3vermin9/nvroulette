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
    id: 'blackjack',
    name: 'Blackjack',
    blurb: 'Hit · stand · custom gift cards',
    mark: 'B',
    status: 'live',
    path: '/games/blackjack',
  },
  {
    id: 'crash',
    name: 'Crash',
    blurb: 'Surf · climb · cash out',
    mark: 'C',
    status: 'live',
    path: '/games/crash',
  },
  {
    id: 'mines',
    name: 'Mines',
    blurb: 'Gems · mines · cash out',
    mark: 'M',
    status: 'live',
    path: '/games/mines',
  },
  {
    id: 'roulette',
    name: 'Roulette',
    blurb: 'European wheel · outside bets',
    mark: 'R',
    status: 'live',
    path: '/games/roulette',
  },
  {
    id: 'plinko',
    name: 'Plinko',
    blurb: 'Drop · pegs · multipliers',
    mark: 'P',
    status: 'live',
    path: '/games/plinko',
  },
]
