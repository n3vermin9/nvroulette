import Matter from 'matter-js'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import {
  BALL_RADIUS,
  BOARD_HEIGHT,
  BOARD_INSET,
  BOARD_WIDTH,
  layoutBoard,
  PEG_RADIUS,
  PLINKO_MULTIPLIERS,
  payoutForBin,
} from '@/games/plinko/engine'
import { formatMoney } from '@/lib/format'

export type BallLandedEvent = {
  id: string
  bet: number
  binIndex: number
  multiplier: number
  payout: number
}

export type PlinkoBoardHandle = {
  dropBall: (bet: number, refId: string) => boolean
  activeBallCount: () => number
}

type Props = {
  onBallLanded: (event: BallLandedEvent) => void
}

type BallMeta = {
  id: string
  bet: number
  settled: boolean
}

type FlashBin = { index: number; until: number }

type PayoutFloat = {
  binIndex: number
  label: string
  positive: boolean
  born: number
  until: number
  particles: { angle: number; dist: number; size: number }[]
}

const LAYOUT = layoutBoard(BOARD_WIDTH, BOARD_HEIGHT)
const WALL = 36
/** Shorter payout bins under the peg field. */
const BIN_TOP = BOARD_HEIGHT * 0.905
const BIN_HEIGHT = BOARD_HEIGHT * 0.065
const BIN_MID = BIN_TOP + BIN_HEIGHT / 2
const PAYOUT_FLOAT_MS = 900
/** Visual frame drawn here. */
const INNER_LEFT = BOARD_INSET
const INNER_RIGHT = BOARD_WIDTH - BOARD_INSET
const INNER_TOP = BOARD_INSET
const INNER_BOTTOM = BOARD_HEIGHT - BOARD_INSET
/** Keep ball fully inside the stroked frame (stroke + safety). */
const PLAY_PAD = 3
const PLAY_LEFT = INNER_LEFT + PLAY_PAD
const PLAY_RIGHT = INNER_RIGHT - PLAY_PAD
const PLAY_TOP = INNER_TOP + PLAY_PAD
const PLAY_BOTTOM = INNER_BOTTOM - PLAY_PAD

function makePayoutFloat(binIndex: number, payout: number): PayoutFloat {
  const now = performance.now()
  return {
    binIndex,
    label: payout > 0 ? `+${formatMoney(payout)}` : formatMoney(0),
    positive: payout > 0,
    born: now,
    until: now + PAYOUT_FLOAT_MS,
    particles: Array.from({ length: 7 }, (_, i) => ({
      angle: (Math.PI * 2 * i) / 7 + (Math.random() - 0.5) * 0.35,
      dist: 10 + Math.random() * 14,
      size: 1.6 + Math.random() * 1.8,
    })),
  }
}

export const PlinkoBoard = forwardRef<PlinkoBoardHandle, Props>(
  function PlinkoBoard({ onBallLanded }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const engineRef = useRef<Matter.Engine | null>(null)
    const ballsRef = useRef(new Map<number, BallMeta>())
    const flashRef = useRef<FlashBin[]>([])
    const floatsRef = useRef<PayoutFloat[]>([])
    const onLandedRef = useRef(onBallLanded)
    onLandedRef.current = onBallLanded

    useImperativeHandle(ref, () => ({
      dropBall(bet: number, refId: string) {
        const engine = engineRef.current
        if (!engine) return false

        const minX = PLAY_LEFT + BALL_RADIUS
        const maxX = PLAY_RIGHT - BALL_RADIUS
        const jitter = (Math.random() - 0.5) * 10
        const x = Math.min(maxX, Math.max(minX, BOARD_WIDTH / 2 + jitter))

        const ball = Matter.Bodies.circle(x, PLAY_TOP + BALL_RADIUS + 2, BALL_RADIUS, {
          restitution: 0.45,
          friction: 0.04,
          frictionAir: 0.022,
          density: 0.003,
          slop: 0,
          label: 'ball',
          collisionFilter: { category: 0x0002, mask: 0x0003 },
        })

        Matter.Body.setVelocity(ball, {
          x: (Math.random() - 0.5) * 0.8,
          y: 0.5,
        })
        Matter.Body.setAngularVelocity(ball, (Math.random() - 0.5) * 0.15)

        ballsRef.current.set(ball.id, { id: refId, bet, settled: false })
        Matter.Composite.add(engine.world, ball)
        return true
      },
      activeBallCount() {
        return ballsRef.current.size
      },
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = BOARD_WIDTH * dpr
      canvas.height = BOARD_HEIGHT * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const engine = Matter.Engine.create({
        gravity: { x: 0, y: 1.1, scale: 0.001 },
      })
      engine.positionIterations = 12
      engine.velocityIterations = 10
      engine.constraintIterations = 4
      engineRef.current = engine

      const staticFilter = { category: 0x0001, mask: 0xffffffff }

      const makeWall = (
        x: number,
        y: number,
        w: number,
        h: number,
        label: string,
      ) =>
        Matter.Bodies.rectangle(x, y, w, h, {
          isStatic: true,
          restitution: 0.1,
          friction: 0.35,
          slop: 0,
          label,
          collisionFilter: staticFilter,
        })

      // Inner face of each wall aligns with the playable bounds (inside the frame).
      const left = makeWall(
        PLAY_LEFT - WALL / 2,
        BOARD_HEIGHT / 2,
        WALL,
        BOARD_HEIGHT + WALL * 2,
        'wall',
      )
      const right = makeWall(
        PLAY_RIGHT + WALL / 2,
        BOARD_HEIGHT / 2,
        WALL,
        BOARD_HEIGHT + WALL * 2,
        'wall',
      )
      const ceiling = makeWall(
        BOARD_WIDTH / 2,
        PLAY_TOP - WALL / 2,
        BOARD_WIDTH + WALL * 2,
        WALL,
        'ceiling',
      )
      const floor = makeWall(
        BOARD_WIDTH / 2,
        PLAY_BOTTOM + WALL / 2,
        BOARD_WIDTH + WALL * 2,
        WALL,
        'floor',
      )

      const pegs = LAYOUT.pegs.map((p) =>
        Matter.Bodies.circle(p.x, p.y, PEG_RADIUS, {
          isStatic: true,
          restitution: 0.55,
          friction: 0.04,
          slop: 0,
          label: 'peg',
          collisionFilter: staticFilter,
        }),
      )

      const binSensors = LAYOUT.bins.map((bin) =>
        Matter.Bodies.rectangle(
          bin.x + bin.width / 2,
          BIN_MID,
          bin.width - 2,
          BIN_HEIGHT,
          {
            isStatic: true,
            isSensor: true,
            label: `bin:${bin.index}`,
            collisionFilter: staticFilter,
          },
        ),
      )

      const dividers = LAYOUT.bins.slice(1).map((bin) =>
        Matter.Bodies.rectangle(bin.x, BIN_MID, 2.5, BIN_HEIGHT + 10, {
          isStatic: true,
          restitution: 0.1,
          friction: 0.3,
          label: 'divider',
          collisionFilter: staticFilter,
        }),
      )

      Matter.Composite.add(engine.world, [
        left,
        right,
        ceiling,
        floor,
        ...pegs,
        ...dividers,
        ...binSensors,
      ])

      const binIndexAt = (x: number) => {
        const found = LAYOUT.bins.find((b) => x >= b.x && x < b.x + b.width)
        return found?.index ?? Math.floor(LAYOUT.bins.length / 2)
      }

      const settleBall = (ball: Matter.Body, binIndex: number) => {
        const meta = ballsRef.current.get(ball.id)
        if (!meta || meta.settled) return
        meta.settled = true

        const { multiplier, payout } = payoutForBin(meta.bet, binIndex)
        onLandedRef.current({
          id: meta.id,
          bet: meta.bet,
          binIndex,
          multiplier,
          payout,
        })

        const now = performance.now()
        flashRef.current = [
          ...flashRef.current.filter((f) => f.until > now),
          { index: binIndex, until: now + 700 },
        ]
        floatsRef.current = [
          ...floatsRef.current.filter((f) => f.until > now),
          makePayoutFloat(binIndex, payout),
        ]

        Matter.Composite.remove(engine.world, ball)
        ballsRef.current.delete(ball.id)
      }

      const containBall = (ball: Matter.Body) => {
        const minX = PLAY_LEFT + BALL_RADIUS
        const maxX = PLAY_RIGHT - BALL_RADIUS
        const minY = PLAY_TOP + BALL_RADIUS
        const maxY = PLAY_BOTTOM - BALL_RADIUS
        let { x, y } = ball.position
        let vx = ball.velocity.x
        let vy = ball.velocity.y
        let clamped = false

        if (x < minX) {
          x = minX
          vx = Math.abs(vx) * 0.2
          clamped = true
        } else if (x > maxX) {
          x = maxX
          vx = -Math.abs(vx) * 0.2
          clamped = true
        }

        if (y < minY) {
          y = minY
          vy = Math.abs(vy) * 0.15
          clamped = true
        } else if (y > maxY) {
          settleBall(ball, binIndexAt(x))
          return
        }

        if (clamped) {
          Matter.Body.setPosition(ball, { x, y })
          Matter.Body.setVelocity(ball, {
            x: Math.max(-8, Math.min(8, vx)),
            y: Math.max(-8, Math.min(12, vy)),
          })
        }
      }

      Matter.Events.on(engine, 'collisionStart', (event) => {
        for (const pair of event.pairs) {
          const a = pair.bodyA
          const b = pair.bodyB
          const ball = a.label === 'ball' ? a : b.label === 'ball' ? b : null
          if (!ball) continue

          const other = ball === a ? b : a
          if (other.label.startsWith('bin:')) {
            settleBall(ball, Number(other.label.slice(4)))
          } else if (other.label === 'floor') {
            settleBall(ball, binIndexAt(ball.position.x))
          }
        }
      })

      Matter.Events.on(engine, 'collisionActive', (event) => {
        for (const pair of event.pairs) {
          const a = pair.bodyA
          const b = pair.bodyB
          const ball = a.label === 'ball' ? a : b.label === 'ball' ? b : null
          const peg = a.label === 'peg' ? a : b.label === 'peg' ? b : null
          if (!ball || !peg) continue
          if (Math.abs(ball.velocity.x) < 0.3) {
            Matter.Body.applyForce(ball, ball.position, {
              x: (Math.random() - 0.5) * 0.00028,
              y: 0,
            })
          }
        }
      })

      let raf = 0
      const draw = () => {
        raf = requestAnimationFrame(draw)
        // Two substeps reduce tunneling through thin contacts.
        Matter.Engine.update(engine, 1000 / 120)
        Matter.Engine.update(engine, 1000 / 120)

        for (const body of [...Matter.Composite.allBodies(engine.world)]) {
          if (body.label !== 'ball') continue
          containBall(body)
        }

        const now = performance.now()
        const hot = new Set(
          flashRef.current.filter((f) => f.until > now).map((f) => f.index),
        )

        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)

        const grad = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT)
        grad.addColorStop(0, '#2c2c2e')
        grad.addColorStop(1, '#1c1c1e')
        pathRoundRect(ctx, 0, 0, BOARD_WIDTH, BOARD_HEIGHT, 22)
        ctx.fillStyle = grad
        ctx.fill()

        pathRoundRect(
          ctx,
          INNER_LEFT,
          INNER_TOP,
          INNER_RIGHT - INNER_LEFT,
          INNER_BOTTOM - INNER_TOP,
          14,
        )
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
        ctx.lineWidth = 1
        ctx.stroke()

        // Clip pegs + balls to the playable frame so nothing draws over the border.
        ctx.save()
        pathRoundRect(
          ctx,
          PLAY_LEFT,
          PLAY_TOP,
          PLAY_RIGHT - PLAY_LEFT,
          PLAY_BOTTOM - PLAY_TOP,
          10,
        )
        ctx.clip()

        for (const peg of pegs) {
          ctx.beginPath()
          ctx.arc(peg.position.x, peg.position.y, PEG_RADIUS, 0, Math.PI * 2)
          const pegGrad = ctx.createRadialGradient(
            peg.position.x - 1,
            peg.position.y - 1,
            0.5,
            peg.position.x,
            peg.position.y,
            PEG_RADIUS,
          )
          pegGrad.addColorStop(0, '#f2f2f7')
          pegGrad.addColorStop(1, '#8e8e93')
          ctx.fillStyle = pegGrad
          ctx.fill()
        }

        let ballCount = 0
        for (const body of Matter.Composite.allBodies(engine.world)) {
          if (body.label !== 'ball') continue
          ballCount += 1
          const x = Math.min(
            PLAY_RIGHT - BALL_RADIUS,
            Math.max(PLAY_LEFT + BALL_RADIUS, body.position.x),
          )
          const y = Math.min(
            PLAY_BOTTOM - BALL_RADIUS,
            Math.max(PLAY_TOP + BALL_RADIUS, body.position.y),
          )
          ctx.beginPath()
          ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2)
          const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, BALL_RADIUS)
          g.addColorStop(0, '#ffffff')
          g.addColorStop(1, '#e5d8c4')
          ctx.fillStyle = g
          ctx.fill()
          ctx.strokeStyle = 'rgba(0,0,0,0.22)'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        if (ballCount === 0) {
          ctx.beginPath()
          ctx.arc(
            BOARD_WIDTH / 2,
            PLAY_TOP + BALL_RADIUS + 2,
            BALL_RADIUS - 0.5,
            0,
            Math.PI * 2,
          )
          ctx.fillStyle = 'rgba(243, 235, 224, 0.28)'
          ctx.fill()
        }

        ctx.restore()

        for (const bin of LAYOUT.bins) {
          const isHot = hot.has(bin.index)
          pathRoundRect(
            ctx,
            bin.x + 1,
            BIN_TOP,
            bin.width - 2,
            BIN_HEIGHT,
            4,
          )
          ctx.fillStyle = isHot ? '#0a84ff' : 'rgba(120,120,128,0.28)'
          ctx.fill()
          ctx.strokeStyle = isHot ? '#409cff' : 'rgba(255,255,255,0.08)'
          ctx.lineWidth = 1
          ctx.stroke()

          ctx.fillStyle = isHot ? '#ffffff' : 'rgba(235,235,245,0.6)'
          ctx.font = '600 9px -apple-system, BlinkMacSystemFont, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(
            `${PLINKO_MULTIPLIERS[bin.index]}`,
            bin.x + bin.width / 2,
            BIN_MID,
          )
        }

        const activeFloats = floatsRef.current.filter((f) => f.until > now)
        floatsRef.current = activeFloats
        for (const float of activeFloats) {
          const bin = LAYOUT.bins[float.binIndex]
          if (!bin) continue
          const t = Math.min(1, (now - float.born) / PAYOUT_FLOAT_MS)
          const ease = 1 - Math.pow(1 - t, 3)
          const cx = bin.x + bin.width / 2
          const cy = BIN_TOP - 4
          const rise = ease * 36
          const opacity =
            t < 0.15 ? t / 0.15 : t > 0.55 ? Math.max(0, (1 - t) / 0.45) : 1
          const scale = 0.88 + Math.min(1, t / 0.2) * 0.14

          for (const p of float.particles) {
            const pr = ease * p.dist
            const px = cx + Math.cos(p.angle) * pr
            const py = cy - rise * 0.35 + Math.sin(p.angle) * pr * 0.85
            ctx.beginPath()
            ctx.arc(px, py, p.size * (1 - ease * 0.35), 0, Math.PI * 2)
            ctx.fillStyle = float.positive
              ? `rgba(48, 209, 88, ${opacity * 0.9})`
              : `rgba(235, 235, 245, ${opacity * 0.55})`
            ctx.fill()
          }

          ctx.save()
          ctx.translate(cx, cy - rise)
          ctx.scale(scale, scale)
          ctx.globalAlpha = opacity
          ctx.font =
            '700 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.lineWidth = 3
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'
          ctx.strokeText(float.label, 0, 0)
          ctx.fillStyle = float.positive ? '#30d158' : '#f2f2f7'
          ctx.fillText(float.label, 0, 0)
          ctx.restore()
        }
      }

      raf = requestAnimationFrame(draw)

      return () => {
        cancelAnimationFrame(raf)
        Matter.Events.off(engine, 'collisionStart')
        Matter.Events.off(engine, 'collisionActive')
        Matter.World.clear(engine.world, false)
        Matter.Engine.clear(engine)
        engineRef.current = null
        ballsRef.current.clear()
        floatsRef.current = []
      }
    }, [])

    return (
      <canvas
        ref={canvasRef}
        className="plinko-board"
        aria-label="Plinko board"
      />
    )
  },
)

function pathRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
