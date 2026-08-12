import {
  Component,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { useLottie } from 'lottie-react'
import {
  giftModelForRole,
  giftSlugForRole,
  type GiftRole,
} from '@/gifts/catalog'
import { loadGiftLottie } from '@/gifts/loadGiftLottie'

type Props = {
  /** GiftChanges slug, e.g. `ion-gem`. Ignored if `role` is set. */
  gift?: string
  /** Crafted / variant model name (GiftChanges). Ignored if `role` sets one. */
  model?: string
  /** Semantic role mapped in the gift catalog. */
  role?: GiftRole
  loop?: boolean
  /** When false, shows the last frame with no playback. */
  play?: boolean
  className?: string
  /** Fallback node while loading / on error (e.g. ◆). */
  fallback?: ReactNode
  /** Fires once when a non-looping play finishes (or immediately if not playing). */
  onComplete?: () => void
}

type PlayerProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
  loop: boolean
  play: boolean
  className?: string
  onComplete?: () => void
}

function lottieDurationMs(data: Record<string, unknown>): number {
  const fr = typeof data.fr === 'number' && data.fr > 0 ? data.fr : 60
  const ip = typeof data.ip === 'number' ? data.ip : 0
  const op = typeof data.op === 'number' ? data.op : fr
  return Math.max(300, ((op - ip) / fr) * 1000)
}

function LottiePlayer({ data, loop, play, className, onComplete }: PlayerProps) {
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const finishedRef = useRef(false)

  const { View, animationItem } = useLottie({
    animationData: data,
    loop,
    autoplay: play,
    style: { width: '100%', height: '100%' },
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid meet',
      viewBoxOnly: true,
    },
  })

  useEffect(() => {
    finishedRef.current = false
  }, [play, data])

  useEffect(() => {
    if (!animationItem) return
    if (play) {
      animationItem.goToAndPlay(0, true)
      return
    }
    const last = Math.max(0, animationItem.totalFrames - 1)
    animationItem.goToAndStop(last, true)
  }, [animationItem, play])

  useEffect(() => {
    const emit = () => {
      if (finishedRef.current) return
      finishedRef.current = true
      onCompleteRef.current?.()
    }

    if (!onCompleteRef.current) return

    if (!play) {
      emit()
      return
    }

    if (!animationItem) return

    animationItem.addEventListener('complete', emit)
    const safety = window.setTimeout(emit, lottieDurationMs(data) + 120)

    return () => {
      animationItem.removeEventListener('complete', emit)
      window.clearTimeout(safety)
    }
  }, [animationItem, play, data])

  return (
    <div
      className={['tg-gift-lottie', className].filter(Boolean).join(' ')}
      style={{ width: '100%', height: '100%' }}
    >
      {View}
    </div>
  )
}

class GiftErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Keep UI alive; tile falls back to symbol.
  }

  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

export function TgGiftLottie({
  gift,
  model,
  role,
  loop = false,
  play = true,
  className,
  fallback = null,
  onComplete,
}: Props) {
  const slug = role ? giftSlugForRole(role) : gift?.trim().toLowerCase()
  const modelName = role ? giftModelForRole(role) : model
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<Record<string, any> | null>(null)
  const [failed, setFailed] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const failedEmitted = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!slug) {
      setData(null)
      setFailed(true)
      return
    }

    let cancelled = false
    setFailed(false)
    setData(null)
    failedEmitted.current = false

    loadGiftLottie(slug, modelName)
      .then((animation) => {
        if (!cancelled) setData(animation)
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
          setData(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [slug, modelName])

  useEffect(() => {
    if (!onCompleteRef.current) return
    if ((!slug || failed) && !failedEmitted.current) {
      failedEmitted.current = true
      onCompleteRef.current()
    }
  }, [slug, failed])

  const fallbackNode = fallback ? (
    <span className={['tg-gift-fallback', className].filter(Boolean).join(' ')}>
      {fallback}
    </span>
  ) : null

  if (!slug || failed || !data) return fallbackNode

  const shouldPlay = play && !reduceMotion

  return (
    <GiftErrorBoundary fallback={fallbackNode}>
      <LottiePlayer
        data={data}
        loop={loop && shouldPlay}
        play={shouldPlay}
        className={className}
        onComplete={onComplete}
      />
    </GiftErrorBoundary>
  )
}
