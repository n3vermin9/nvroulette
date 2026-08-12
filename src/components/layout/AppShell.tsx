import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import logo from '@/assets/logo.png'
import { WalletSheet } from '@/components/WalletSheet'
import { BottomNav } from '@/components/layout/BottomNav'
import { useAuth } from '@/context/AuthContext'
import { APP_NAME } from '@/lib/constants'
import { formatMoney } from '@/lib/format'

export function AppShell() {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const inGame = pathname.startsWith('/games/')
  const [walletOpen, setWalletOpen] = useState(false)
  const [walletVisible, setWalletVisible] = useState(false)

  return (
    <div className={['app-root', inGame ? 'app-root-game' : ''].join(' ')}>
      <div className="atmosphere" aria-hidden />
      <header className="app-header glass-bar sticky top-0 z-20 border-b px-4 pb-2.5 pt-[max(0.55rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={logo}
              alt=""
              width={28}
              height={28}
              className="brand-mark"
            />
            <p className="font-display text-[1.15rem] leading-none text-[var(--label)]">
              {APP_NAME}
            </p>
          </div>
          <button
            type="button"
            className="chip-pill shrink-0"
            aria-label="Open wallet"
            aria-expanded={walletVisible}
            onClick={() => setWalletOpen(true)}
          >
            <span className="money-mark" aria-hidden>
              $
            </span>
            <span className="text-[1.05rem] font-semibold tabular-nums tracking-tight text-[var(--label)]">
              {profile
                ? formatMoney(profile.chipBalance).replace(/^\$/, '')
                : '—'}
            </span>
          </button>
        </div>
      </header>

      <main
        className={[
          'mx-auto w-full max-w-lg',
          inGame
            ? 'main-game'
            : 'min-h-[calc(100dvh-7.5rem)] px-4 pt-5 pb-[var(--nav-clearance)]',
        ].join(' ')}
      >
        <Outlet />
      </main>

      {inGame || walletVisible ? null : <BottomNav />}

      <WalletSheet
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        onVisibleChange={setWalletVisible}
      />
    </div>
  )
}
