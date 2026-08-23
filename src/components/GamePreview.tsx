import { TgGiftLottie } from '@/components/TgGiftLottie'
import { giftPngForRole, giftPngUrl } from '@/gifts/catalog'
import { bjCardBackPng, bjSuitPng } from '@/games/blackjack/gifts'
import { SLOT_SYMBOLS } from '@/games/slots/engine'

type Props = {
  gameId: string
}

/** Lightweight static previews for lobby cards. */
export function GamePreview({ gameId }: Props) {
  if (gameId === 'plinko') return <PlinkoPreview />
  if (gameId === 'roulette') return <RoulettePreview />
  if (gameId === 'mines') return <MinesPreview />
  if (gameId === 'blackjack') return <BlackjackPreview />
  if (gameId === 'crash') return <CrashPreview />
  if (gameId === 'slots') return <SlotsPreview />
  return <div className="game-preview-fallback" />
}

function PlinkoPreview() {
  const rows = 6
  const pegs: { cx: number; cy: number }[] = []
  const gapX = 18
  const gapY = 16
  const top = 22
  const width = 200

  for (let row = 0; row < rows; row++) {
    const cols = row + 3
    const rowW = (cols - 1) * gapX
    const startX = (width - rowW) / 2
    for (let col = 0; col < cols; col++) {
      pegs.push({ cx: startX + col * gapX, cy: top + row * gapY })
    }
  }

  const bins = 7
  const binW = 18
  const binStart = (width - bins * binW) / 2

  return (
    <svg
      className="game-preview-svg"
      viewBox={`0 0 ${width} 140`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="plinkoPreviewBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c2c2e" />
          <stop offset="100%" stopColor="#1c1c1e" />
        </linearGradient>
      </defs>
      <rect width={width} height={140} fill="url(#plinkoPreviewBg)" />
      {pegs.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="2.6" fill="#c7c7cc" />
      ))}
      <circle cx={width / 2} cy={12} r="4.5" fill="#f2f2f7" opacity="0.9" />
      {Array.from({ length: bins }, (_, i) => (
        <rect
          key={i}
          x={binStart + i * binW + 1}
          y={118}
          width={binW - 2}
          height={14}
          rx="3"
          fill={i === 0 || i === bins - 1 ? '#0a84ff' : 'rgba(120,120,128,0.35)'}
        />
      ))}
    </svg>
  )
}

function RoulettePreview() {
  const cx = 100
  const cy = 70
  const r = 48
  const pockets = 18

  return (
    <div className="roulette-preview" aria-hidden>
      <svg
        className="game-preview-svg"
        viewBox="0 0 200 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="roulettePreviewBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c2c2e" />
            <stop offset="100%" stopColor="#1c1c1e" />
          </linearGradient>
        </defs>
        <rect width="200" height="140" fill="url(#roulettePreviewBg)" />
        <circle cx={cx} cy={cy} r={r + 6} fill="#3a3a3c" />
        {Array.from({ length: pockets }, (_, i) => {
          const a0 = (i / pockets) * Math.PI * 2 - Math.PI / 2
          const a1 = ((i + 1) / pockets) * Math.PI * 2 - Math.PI / 2
          const x0 = cx + Math.cos(a0) * r
          const y0 = cy + Math.sin(a0) * r
          const x1 = cx + Math.cos(a1) * r
          const y1 = cy + Math.sin(a1) * r
          const color =
            i === 0 ? '#30d158' : i % 2 === 0 ? '#ff453a' : '#1c1c1e'
          return (
            <path
              key={i}
              d={`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`}
              fill={color}
            />
          )
        })}
        <circle
          cx={cx}
          cy={cy}
          r="14"
          fill="#2c2c2e"
          stroke="#8e8e93"
          strokeWidth="1"
        />
        <circle cx={cx + 28} cy={cy - 26} r="3.5" fill="#f2f2f7" />
      </svg>
      <div className="roulette-preview-hero">
        <TgGiftLottie
          role="roulette"
          play={false}
          className="roulette-preview-hero-lottie"
          fallback={
            <img
              src={giftPngForRole('roulette')}
              alt=""
              className="roulette-preview-static"
              draggable={false}
            />
          }
        />
      </div>
    </div>
  )
}

function MinesPreview() {
  const mines = new Set([1, 7, 11, 16, 22])
  const gems = new Set([0, 3, 8, 12, 14])

  return (
    <div className="mines-preview" aria-hidden>
      <div className="mines-preview-grid">
        {Array.from({ length: 25 }, (_, i) => {
          const isMine = mines.has(i)
          const isGem = gems.has(i)
          return (
            <div
              key={i}
              className={[
                'mines-preview-tile',
                isMine ? 'is-mine' : '',
                isGem ? 'is-gem' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {isGem ? (
                <TgGiftLottie
                  role="gem"
                  play={false}
                  className="mines-preview-lottie"
                />
              ) : null}
              {isMine ? (
                <TgGiftLottie
                  role="mine"
                  play={false}
                  className="mines-preview-lottie"
                />
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="mines-preview-hero-skull">
        <TgGiftLottie
          role="mine"
          play={false}
          className="mines-preview-hero-lottie"
        />
      </div>
    </div>
  )
}

function BlackjackPreview() {
  const fan: {
    x: number
    y: number
    rot: number
    rank: string
    art: string
    red: boolean
  }[] = [
    {
      x: 48,
      y: 40,
      rot: -22,
      rank: 'A',
      art: bjSuitPng('spades', 64),
      red: false,
    },
    {
      x: 68,
      y: 34,
      rot: -8,
      rank: 'K',
      art: bjSuitPng('hearts', 64),
      red: true,
    },
    {
      x: 88,
      y: 34,
      rot: 8,
      rank: 'Q',
      art: bjSuitPng('diamonds', 64),
      red: true,
    },
    {
      x: 108,
      y: 40,
      rot: 22,
      rank: 'J',
      art: bjSuitPng('clubs', 64),
      red: false,
    },
  ]

  return (
    <div className="bj-preview" aria-hidden>
      <svg
        className="game-preview-svg"
        viewBox="0 0 200 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="bjPreviewBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f3d2e" />
            <stop offset="100%" stopColor="#14261c" />
          </linearGradient>
        </defs>
        <rect width="200" height="140" fill="url(#bjPreviewBg)" />
        {fan.map((c, i) => (
          <g
            key={i}
            transform={`translate(${c.x} ${c.y}) rotate(${c.rot} 21 30)`}
          >
            <rect
              width="42"
              height="60"
              rx="6"
              fill="#f2f2f7"
              stroke="rgba(255,255,255,0.14)"
            />
            <text
              x="6"
              y="14"
              fill={c.red ? '#ff453a' : '#1c1c1e'}
              fontSize="10"
              fontWeight="700"
            >
              {c.rank}
            </text>
            <image
              href={c.art}
              x="8"
              y="18"
              width="26"
              height="26"
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        ))}
      </svg>
      <div className="bj-preview-hero">
        <TgGiftLottie
          gift="signet-ring"
          play={false}
          className="bj-preview-hero-lottie"
          fallback={
            <img
              src={bjCardBackPng(128)}
              alt=""
              className="bj-preview-static"
              draggable={false}
            />
          }
        />
      </div>
    </div>
  )
}

function CrashPreview() {
  return (
    <div className="crash-preview" aria-hidden>
      <svg
        className="game-preview-svg"
        viewBox="0 0 200 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="crashPreviewBg" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#07090f" />
            <stop offset="55%" stopColor="#10182a" />
            <stop offset="100%" stopColor="#0a1020" />
          </linearGradient>
        </defs>
        <rect width="200" height="140" fill="url(#crashPreviewBg)" />
        {[118, 96, 74, 52, 34].map((y, i) => (
          <g key={y} opacity={0.35 + i * 0.08}>
            <line
              x1="28"
              y1={y}
              x2="188"
              y2={y}
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="1"
            />
            <text
              x="8"
              y={y + 3}
              fill="rgba(235,235,245,0.55)"
              fontSize="8"
              fontWeight="700"
            >
              {['1x', '2x', '3x', '5x', '10x'][i]}
            </text>
          </g>
        ))}
        <path
          d="M 22 118 C 48 114, 88 88, 128 52"
          fill="none"
          stroke="#ff453a"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <text
          x="118"
          y="44"
          fill="#64d2ff"
          fontSize="14"
          fontWeight="700"
        >
          2.40x
        </text>
      </svg>
      <div className="crash-preview-hero">
        <TgGiftLottie
          role="crash"
          play={false}
          className="crash-preview-hero-lottie"
          fallback={
            <img
              src={giftPngForRole('crash')}
              alt=""
              className="crash-preview-hero-img"
              draggable={false}
            />
          }
        />
      </div>
    </div>
  )
}

function SlotsPreview() {
  const hero = SLOT_SYMBOLS[0]

  return (
    <div className="slots-preview" aria-hidden>
      <svg
        className="game-preview-svg"
        viewBox="0 0 200 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="slotsPreviewBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2d2144" />
            <stop offset="55%" stopColor="#1c1c2d" />
            <stop offset="100%" stopColor="#131721" />
          </linearGradient>
        </defs>
        <rect width="200" height="140" fill="url(#slotsPreviewBg)" />
        <g opacity="0.45">
          {[31, 78, 125].map((x) => (
            <rect
              key={x}
              x={x}
              y="30"
              width="36"
              height="82"
              rx="8"
              fill="rgba(0,0,0,0.34)"
              stroke="rgba(255,255,255,0.22)"
            />
          ))}
        </g>
        <path d="M 22 70 H 178" stroke="#ff453a" strokeWidth="2" opacity="0.72" />
        {[49, 96, 143].map((x) => (
          <text
            key={x}
            x={x}
            y="79"
            textAnchor="middle"
            fill="#ffd60a"
            fontSize="24"
            fontWeight="700"
          >
            ✦
          </text>
        ))}
      </svg>
      <div className="slots-preview-hero">
        <TgGiftLottie
          gift={hero.slug}
          play={false}
          className="slots-preview-hero-lottie"
          fallback={
            <img
              src={giftPngUrl(hero.slug, 128)}
              alt=""
              className="slots-preview-static"
              draggable={false}
            />
          }
        />
      </div>
    </div>
  )
}
