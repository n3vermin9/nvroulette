import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ENTERTAINMENT_DISCLAIMER } from '@/lib/constants'

export function ProfilePage() {
  const { profile, mode, user, rename, signOut, error } = useAuth()
  const [name, setName] = useState(profile?.displayName ?? '')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (profile?.displayName) setName(profile.displayName)
  }, [profile?.displayName])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    try {
      await rename(name)
      setStatus('Display name updated')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not update name')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="motion-fade-up">
        <h1 className="font-display text-[1.75rem] text-[var(--label)]">
          Profile
        </h1>
        <p className="mt-1 text-[0.95rem] text-[var(--secondary-label)]">
          Account settings
        </p>
      </header>

      <section className="panel motion-fade-up motion-delay-1">
        <dl className="space-y-3 text-[0.95rem]">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--secondary-label)]">Mode</dt>
            <dd className="text-[var(--label)]">
              {mode === 'demo' ? 'Demo (local)' : 'Firebase'}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--secondary-label)]">Player ID</dt>
            <dd className="truncate text-[var(--tertiary-label)]">
              {user?.uid ?? profile?.uid ?? '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel motion-fade-up motion-delay-2">
        <h2 className="font-display text-[1.2rem] text-[var(--label)]">
          Display name
        </h2>
        <form className="mt-3 space-y-3" onSubmit={onSubmit}>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            placeholder="Guest name"
            aria-label="Display name"
          />
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save name'}
          </button>
        </form>
        {status ? (
          <p className="mt-3 text-sm text-[var(--tint)]">{status}</p>
        ) : null}
      </section>

      <section className="panel motion-fade-up motion-delay-2">
        <h2 className="font-display text-[1.2rem] text-[var(--label)]">
          Session
        </h2>
        <p className="mt-2 text-sm text-[var(--secondary-label)]">
          {mode === 'demo'
            ? 'Reset clears your local demo wallet and creates a fresh guest.'
            : 'Sign out ends the anonymous session; a new guest is created next launch.'}
        </p>
        <button
          type="button"
          className="btn-ghost mt-4"
          onClick={() => void signOut()}
        >
          {mode === 'demo' ? 'Reset demo player' : 'Sign out'}
        </button>
        {error ? (
          <p className="mt-3 text-sm text-[var(--red)]">{error}</p>
        ) : null}
      </section>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-[var(--tertiary-label)]">
        {ENTERTAINMENT_DISCLAIMER}
      </p>
    </div>
  )
}
