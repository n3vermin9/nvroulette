import { useAuth } from '@/context/AuthContext'
import { formatMoneyDelta } from '@/lib/format'
import type { Transaction } from '@/types/user'

export function ActivityPage() {
  const { transactions, mode } = useAuth()

  return (
    <div className="flex flex-col gap-5">
      <header className="motion-fade-up">
        <h1 className="font-display text-[1.75rem] text-[var(--label)]">
          Activity
        </h1>
        <p className="mt-1 text-[0.95rem] text-[var(--secondary-label)]">
          Chip history across your wallet
        </p>
      </header>

      <section className="motion-fade-up motion-delay-1">
        {transactions.length === 0 ? (
          <div className="panel">
            <p className="text-sm text-[var(--secondary-label)]">
              No transactions yet.
              {mode === 'demo'
                ? ' Claim a daily bonus or play Plinko to see activity.'
                : ' Settlements will show here once Cloud Functions write them.'}
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-[1.2rem] border border-white/[0.08] bg-[rgba(28,28,30,0.94)]">
            {transactions.map((tx, i) => (
              <li
                key={tx.id}
                className={[
                  'flex items-center justify-between gap-3 px-4 py-3.5',
                  i > 0 ? 'border-t border-[rgba(84,84,88,0.45)]' : '',
                ].join(' ')}
              >
                <div className="min-w-0">
                  <p className="text-[0.95rem] font-medium text-[var(--label)]">
                    {labelFor(tx)}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--secondary-label)]">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
                <p
                  className={[
                    'text-[1.05rem] font-semibold tabular-nums tracking-tight',
                    tx.amount >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]',
                  ].join(' ')}
                >
                  {formatMoneyDelta(tx.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function labelFor(tx: Transaction): string {
  if (tx.type === 'bonus') return 'Daily bonus'
  if (tx.type === 'bet') return tx.game ? `Bet · ${tx.game}` : 'Bet'
  if (tx.type === 'payout') return tx.game ? `Payout · ${tx.game}` : 'Payout'
  return tx.type
}
