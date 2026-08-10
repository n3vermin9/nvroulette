import { createPortal } from 'react-dom'
import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const tabs = [
  { path: '/', end: true, label: 'Games', Icon: GamesIcon },
  { path: '/activity', end: false, label: 'Activity', Icon: ActivityIcon },
  { path: '/profile', end: false, label: 'Profile', Icon: ProfileIcon },
] as const

const pillSpring = { type: 'spring' as const, stiffness: 420, damping: 34 }
const tabSpring = { type: 'spring' as const, stiffness: 480, damping: 24 }

type Pill = {
  width: number
  height: number
  left: number
  top: number
  glowLeft: number
  glowWidth: number
}

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeIndex = tabs.findIndex((t) =>
    t.end ? location.pathname === t.path : location.pathname.startsWith(t.path),
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [pill, setPill] = useState<Pill | null>(null)

  useLayoutEffect(() => {
    if (activeIndex < 0) {
      setPill(null)
      return
    }

    const updatePill = () => {
      const container = containerRef.current
      const tab = tabRefs.current[activeIndex]
      if (!container || !tab) return

      const insetX = 4
      const insetY = 5
      const glowSpread = 8
      const containerRect = container.getBoundingClientRect()
      const tabRect = tab.getBoundingClientRect()
      const width = tabRect.width - insetX * 2
      const left = tabRect.left - containerRect.left + insetX
      const height = tabRect.height - insetY

      setPill({
        width,
        height,
        left,
        top: (containerRect.height - height) / 2,
        glowLeft: left - glowSpread,
        glowWidth: width + glowSpread * 2,
      })
    }

    updatePill()
    window.addEventListener('resize', updatePill)
    return () => window.removeEventListener('resize', updatePill)
  }, [activeIndex, location.pathname])

  if (typeof document === 'undefined') return null

  return createPortal(
    <nav className="bottom-nav-float" aria-label="Main">
      <div ref={containerRef} className="bottom-nav-shell">
        <div className="bottom-nav-blur" aria-hidden />

        <div className="bottom-nav-inner">
          {pill ? (
            <>
              <motion.div
                layoutId="nav-pill-glow-bottom"
                className="nav-pill-border-glow"
                style={{
                  left: pill.glowLeft,
                  width: pill.glowWidth,
                  bottom: 2,
                  height: 1,
                }}
                transition={pillSpring}
              />
              <motion.div
                layoutId="nav-pill"
                className="bottom-nav-pill"
                style={{
                  width: pill.width,
                  height: pill.height,
                  left: pill.left,
                  top: pill.top,
                }}
                transition={pillSpring}
              />
            </>
          ) : null}

          {tabs.map((tab, index) => {
            const isActive = activeIndex === index
            const Icon = tab.Icon
            return (
              <motion.button
                key={tab.path}
                ref={(el) => {
                  tabRefs.current[index] = el
                }}
                type="button"
                className="bottom-nav-tab"
                onClick={() => navigate(tab.path)}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1.14 : 1,
                    y: isActive ? -2 : 0,
                  }}
                  transition={tabSpring}
                >
                  <Icon active={isActive} />
                </motion.div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </nav>,
    document.body,
  )
}

function GamesIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="8.25"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.6}
      />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  )
}

function ActivityIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18V7M10 18V11M16 18V5M22 18H2"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.6}
        strokeLinecap="round"
      />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="8"
        r="3.25"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.6}
      />
      <path
        d="M5.5 19c1.4-3 3.7-4.5 6.5-4.5S17.1 16 18.5 19"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.6}
        strokeLinecap="round"
      />
    </svg>
  )
}
