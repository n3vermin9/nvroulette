import { EUROPEAN_WHEEL, pocketColor } from '@/games/roulette/engine'
import { TgGiftLottie } from '@/components/TgGiftLottie'
import { giftPngForRole } from '@/gifts/catalog'

type Props = {
  rotationDeg: number
  spinning: boolean
  highlightNumber: number | null
}

const SIZE = 320
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER = 148
const INNER = 92
const LABEL_R = 122
const SLICE = 360 / EUROPEAN_WHEEL.length

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function slicePath(index: number): string {
  const a0 = index * SLICE
  const a1 = (index + 1) * SLICE
  const p0 = polar(CX, CY, OUTER, a0)
  const p1 = polar(CX, CY, OUTER, a1)
  const p2 = polar(CX, CY, INNER, a1)
  const p3 = polar(CX, CY, INNER, a0)
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${OUTER} ${OUTER} 0 0 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${INNER} ${INNER} 0 0 0 ${p3.x} ${p3.y}`,
    'Z',
  ].join(' ')
}

export function RouletteWheel({
  rotationDeg,
  spinning,
  highlightNumber,
}: Props) {
  return (
    <div className="roulette-wheel-wrap">
      <div className="roulette-pointer" aria-hidden />
      <svg
        className={[
          'roulette-wheel',
          spinning ? 'is-spinning' : '',
        ].join(' ')}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: `rotate(${rotationDeg}deg)` }}
        aria-hidden
      >
        <circle cx={CX} cy={CY} r={OUTER + 8} fill="#3a3a3c" />
        <circle cx={CX} cy={CY} r={OUTER + 2} fill="#1c1c1e" />
        {EUROPEAN_WHEEL.map((n, i) => {
          const color = pocketColor(n)
          const fill =
            color === 'green'
              ? '#30d158'
              : color === 'red'
                ? '#ff453a'
                : '#1c1c1e'
          const mid = i * SLICE + SLICE / 2
          const label = polar(CX, CY, LABEL_R, mid)
          const active = highlightNumber === n && !spinning
          return (
            <g key={n}>
              <path d={slicePath(i)} fill={fill} opacity={active ? 1 : 0.92} />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={active ? 11 : 9}
                fontWeight={active ? 700 : 600}
                transform={`rotate(${mid}, ${label.x}, ${label.y})`}
              >
                {n}
              </text>
            </g>
          )
        })}
        <circle cx={CX} cy={CY} r={INNER - 4} fill="#2c2c2e" />
        <circle
          cx={CX}
          cy={CY}
          r={50}
          fill="#1c1c1e"
          stroke="rgba(255,255,255,0.12)"
        />
      </svg>
      <div className="roulette-hub-gift" aria-hidden>
        <TgGiftLottie
          role="roulette"
          loop={false}
          play={spinning}
          className="roulette-hub-lottie"
          fallback={
            <img
              src={giftPngForRole('roulette')}
              alt=""
              className="roulette-hub-static"
              draggable={false}
            />
          }
        />
      </div>
    </div>
  )
}
