import type { ReactNode } from 'react'
import { formatMoney } from '@/lib/format'
import { playSound, unlockAudio } from '@/lib/sounds'

type Props = {
  bet: number
  betInput: string
  minBet: number
  balance: number
  /** Locks stake stepper / presets only. */
  disabled?: boolean
  actionLabel: string
  actionBusyLabel?: string
  /** Amount shown on the action button (defaults to bet). */
  actionAmount?: number
  /** Skip balance >= bet check (e.g. cash-out after debit). */
  skipBalanceCheck?: boolean
  busy?: boolean
  canAct: boolean
  resultMsg: string | null
  onBetInputChange: (value: string) => void
  onCommitInput: () => void
  onStep: (direction: 1 | -1) => void
  onMin: () => void
  onHalf: () => void
  onDouble: () => void
  onMax: () => void
  onAction: () => void
  canHalf: boolean
  canDouble: boolean
  canMinOrMax: boolean
  /** Game-specific controls above the shared stake row (e.g. roulette bets). */
  children?: ReactNode
}

function withClick(fn: () => void) {
  return () => {
    unlockAudio()
    playSound('click')
    fn()
  }
}

export function GameBetControls({
  bet,
  betInput,
  minBet,
  balance,
  disabled = false,
  actionLabel,
  actionBusyLabel,
  actionAmount,
  skipBalanceCheck = false,
  busy = false,
  canAct,
  resultMsg,
  onBetInputChange,
  onCommitInput,
  onStep,
  onMin,
  onHalf,
  onDouble,
  onMax,
  onAction,
  canHalf,
  canDouble,
  canMinOrMax,
  children,
}: Props) {
  const stakeLocked = disabled || busy
  const shownAmount = actionAmount ?? bet
  const actionDisabled =
    busy ||
    !canAct ||
    (!skipBalanceCheck && balance < bet)

  return (
    <div className="game-controls" onPointerDown={unlockAudio}>
      {children}

      <div className="game-stake">
        <div className="game-stepper">
          <button
            type="button"
            className="game-step-btn"
            aria-label="Decrease bet"
            disabled={stakeLocked}
            onClick={withClick(() => onStep(-1))}
          >
            −
          </button>
          <div className="game-input-wrap">
            <span className="game-input-prefix">$</span>
            <input
              className="game-input"
              inputMode="numeric"
              pattern="[0-9]*"
              value={betInput}
              aria-label="Bet amount"
              disabled={stakeLocked}
              onChange={(e) => onBetInputChange(e.target.value)}
              onBlur={onCommitInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
            />
          </div>
          <button
            type="button"
            className="game-step-btn"
            aria-label="Increase bet"
            disabled={stakeLocked}
            onClick={withClick(() => onStep(1))}
          >
            +
          </button>
        </div>

        <div className="game-presets">
          <button
            type="button"
            className={['game-preset', bet === minBet ? 'active' : ''].join(' ')}
            disabled={stakeLocked || !canMinOrMax}
            onClick={withClick(onMin)}
          >
            Min
          </button>
          <button
            type="button"
            className="game-preset"
            disabled={stakeLocked || !canHalf}
            onClick={withClick(onHalf)}
          >
            ½
          </button>
          <button
            type="button"
            className="game-preset"
            disabled={stakeLocked || !canDouble}
            onClick={withClick(onDouble)}
          >
            x2
          </button>
          <button
            type="button"
            className="game-preset"
            disabled={stakeLocked || !canMinOrMax}
            onClick={withClick(onMax)}
          >
            Max
          </button>
        </div>
      </div>

      <button
        type="button"
        className="btn-primary game-action-btn"
        disabled={actionDisabled}
        onClick={() => {
          unlockAudio()
          onAction()
        }}
      >
        {busy && actionBusyLabel
          ? actionBusyLabel
          : `${actionLabel} · ${formatMoney(shownAmount)}`}
      </button>

      <p className="game-result" aria-live="polite">
        {resultMsg ?? '\u00a0'}
      </p>
    </div>
  )
}
