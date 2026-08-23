import { useEffect, useRef, useState } from 'react'
import { TgGiftLottie } from '@/components/TgGiftLottie'
import { giftPngForRole } from '@/gifts/catalog'
import {
  formatMultiplier,
  graphPath,
  gridTicks,
  tipPoint,
  type GridTick,
} from '@/games/crash/engine'

export type CrashBoardPhase = 'idle' | 'flying' | 'crashed' | 'cashed'

type Props = {
  phase: CrashBoardPhase
  multiplier: number
  progress: number
}

const FADE_MS = 520

type ExitTick = GridTick & { dyingAt: number }

/** Dark crash graph — compressing left grid + exponential red fly path. */
export function CrashBoard({ phase, multiplier }: Props) {
  const flying = phase === 'flying'
  const crashed = phase === 'crashed'
  const cashed = phase === 'cashed'
  const active = phase !== 'idle'
  const live = active ? Math.max(1, multiplier) : 1
  const ticks = active ? gridTicks(live) : []
  const tip = tipPoint(live)
  const pathD = active ? graphPath(live) : ''
  const png = giftPngForRole('crash')
  const tickKey = ticks.map((t) => t.value).join(',')

  const bornRef = useRef(new Map<number, number>())
  const exitRef = useRef(new Map<number, ExitTick>())
  const lastPoseRef = useRef(new Map<number, GridTick>())
  const [, setFadeTick] = useState(0)

  // Keep latest poses for smooth exit fades (ref write during render is fine).
  for (const tick of ticks) {
    lastPoseRef.current.set(tick.value, tick)
  }

  useEffect(() => {
    if (!active) {
      bornRef.current.clear()
      exitRef.current.clear()
      lastPoseRef.current.clear()
      return
    }

    const now = performance.now()
    const values = tickKey ? tickKey.split(',').map(Number) : []
    const visible = new Set(values)

    for (const value of values) {
      if (!bornRef.current.has(value)) {
        bornRef.current.set(value, now)
      }
      exitRef.current.delete(value)
    }

    for (const [value, pose] of [...lastPoseRef.current.entries()]) {
      if (visible.has(value)) continue
      if (!exitRef.current.has(value)) {
        exitRef.current.set(value, { ...pose, dyingAt: now })
      }
      lastPoseRef.current.delete(value)
      bornRef.current.delete(value)
    }

    let raf = 0
    const loop = () => {
      const t = performance.now()
      let needs = false
      for (const born of bornRef.current.values()) {
        if (t - born < FADE_MS) needs = true
      }
      for (const [value, exit] of [...exitRef.current.entries()]) {
        if (t - exit.dyingAt >= FADE_MS) exitRef.current.delete(value)
        else needs = true
      }
      if (!needs) return
      setFadeTick((n) => n + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active, tickKey])

  const now = performance.now()
  const exiting = [...exitRef.current.values()]

  return (
    <div
      className={[
        'crash-board',
        flying ? 'is-flying' : '',
        crashed ? 'is-crashed' : '',
        cashed ? 'is-cashed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <div className="crash-board-stars" />

      <div className="crash-grid">
        {ticks.map((tick) => {
          const born = bornRef.current.get(tick.value) ?? now
          const enter = Math.min(1, Math.max(0, (now - born) / FADE_MS))
          const base = tick.major ? 0.9 : 0.52
          const opacity = base * tick.hide * enter
          return (
            <div
              key={tick.value}
              className={[
                'crash-grid-line',
                tick.major ? 'is-major' : '',
                enter < 1 || tick.hide < 0.98 ? 'is-fading' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                top: `${tick.y}%`,
                opacity,
              }}
            >
              <span className="crash-grid-rule" />
              <span className="crash-grid-label">{tick.label}</span>
            </div>
          )
        })}
        {exiting.map((tick) => {
          const exit = Math.min(1, Math.max(0, (now - tick.dyingAt) / FADE_MS))
          const base = tick.major ? 0.9 : 0.52
          const opacity = base * (1 - exit)
          return (
            <div
              key={`exit-${tick.value}`}
              className={[
                'crash-grid-line',
                'is-fading',
                'is-exiting',
                tick.major ? 'is-major' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                top: `${Math.min(92, tick.y + exit * 6)}%`,
                opacity,
              }}
            >
              <span className="crash-grid-rule" />
              <span className="crash-grid-label">{tick.label}</span>
            </div>
          )
        })}
      </div>

      <svg
        className="crash-board-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {active ? (
          <path
            className={[
              'crash-board-trail',
              crashed ? 'is-crashed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            d={pathD}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      <div className="crash-board-mult">
        <span
          className={[
            'crash-board-mult-value',
            crashed ? 'is-lose' : '',
            cashed ? 'is-win' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {formatMultiplier(live)}
        </span>
        <span className="crash-board-mult-label">
          {crashed
            ? 'Crashed'
            : cashed
              ? 'Cashed out'
              : flying
                ? 'Riding'
                : 'Ready'}
        </span>
      </div>

      <div
        className={[
          'crash-board-rider',
          flying ? 'is-flying' : '',
          crashed ? 'is-crashed' : '',
          !active ? 'is-idle' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          left: active ? `${tip.x}%` : '50%',
          top: active ? `${tip.y}%` : '50%',
        }}
      >
        <TgGiftLottie
          key={flying ? 'fly' : 'idle'}
          role="crash"
          play={!crashed}
          loop={!active}
          className="crash-board-rider-lottie"
          fallback={
            <img
              src={png}
              alt=""
              className="crash-board-rider-img"
              draggable={false}
            />
          }
        />
      </div>
    </div>
  )
}
