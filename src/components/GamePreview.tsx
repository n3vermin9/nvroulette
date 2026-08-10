type Props = {
  gameId: string
}

/** Lightweight static previews for lobby cards. */
export function GamePreview({ gameId }: Props) {
  if (gameId === 'plinko') return <PlinkoPreview />
  if (gameId === 'roulette') return <RoulettePreview />
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
      aria-hidden
    >
      <defs>
        <linearGradient id="plinkoPreviewBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c2c2e" />
          <stop offset="100%" stopColor="#1c1c1e" />
        </linearGradient>
      </defs>
      <rect width={width} height={140} rx="16" fill="url(#plinkoPreviewBg)" />
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
    <svg className="game-preview-svg" viewBox="0 0 200 140" aria-hidden>
      <defs>
        <linearGradient id="roulettePreviewBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c2c2e" />
          <stop offset="100%" stopColor="#1c1c1e" />
        </linearGradient>
      </defs>
      <rect width="200" height="140" rx="16" fill="url(#roulettePreviewBg)" />
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
      <circle cx={cx} cy={cy} r="14" fill="#2c2c2e" stroke="#8e8e93" strokeWidth="1" />
      <circle cx={cx + 28} cy={cy - 26} r="3.5" fill="#f2f2f7" />
    </svg>
  )
}
