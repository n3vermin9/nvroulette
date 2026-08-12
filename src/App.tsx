import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import logo from '@/assets/logo.png'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { PlinkoPage } from '@/games/plinko/PlinkoPage'
import { BlackjackPage } from '@/games/blackjack/BlackjackPage'
import { CrashPage } from '@/games/crash/CrashPage'
import { MinesPage } from '@/games/mines/MinesPage'
import { RoulettePage } from '@/games/roulette/RoulettePage'
import { ActivityPage } from '@/pages/ActivityPage'
import { LobbyPage } from '@/pages/LobbyPage'
import { ProfilePage } from '@/pages/ProfilePage'

function BrandMark({ subtitle }: { subtitle?: string }) {
  return (
    <>
      <img src={logo} alt="" width={64} height={64} className="brand-mark-lg" />
      <p className="mt-4 font-display text-[1.85rem] text-[var(--label)]">
        nvRoulette
      </p>
      {subtitle ? (
        <p className="mt-2 text-sm text-[var(--secondary-label)]">{subtitle}</p>
      ) : null}
    </>
  )
}

function BootGate({ children }: { children: ReactNode }) {
  const { ready, error, mode } = useAuth()

  if (!ready) {
    return (
      <div className="boot-screen">
        <div className="atmosphere" aria-hidden />
        <BrandMark subtitle="Opening the floor…" />
      </div>
    )
  }

  if (error && mode === 'firebase') {
    return (
      <div className="boot-screen">
        <div className="atmosphere" aria-hidden />
        <BrandMark />
        <p className="mt-3 max-w-sm text-center text-sm text-[var(--red)]">
          {error}
        </p>
        <p className="mt-2 max-w-sm text-center text-xs text-[var(--secondary-label)]">
          Check Firebase env values, or remove them to use local demo mode.
        </p>
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <BootGate>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<LobbyPage />} />
              <Route path="games/plinko" element={<PlinkoPage />} />
              <Route path="games/blackjack" element={<BlackjackPage />} />
              <Route path="games/crash" element={<CrashPage />} />
              <Route path="games/roulette" element={<RoulettePage />} />
              <Route path="games/mines" element={<MinesPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BootGate>
      </BrowserRouter>
    </AuthProvider>
  )
}
