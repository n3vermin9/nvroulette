import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

type Options = {
  minBet: number
  clamp: (amount: number, balance: number) => number
  nextStep: (current: number, direction: 1 | -1) => number
}

/** Shared stake state for all games: input, Min / ½ / x2 / Max, balance clamp. */
export function useGameBet({ minBet, clamp, nextStep }: Options) {
  const { profile } = useAuth()
  const balance = profile?.chipBalance ?? 0
  const [bet, setBet] = useState(minBet)
  const [betInput, setBetInput] = useState(String(minBet))

  useEffect(() => {
    if (!profile) return
    setBet((current) => {
      const next = clamp(current, profile.chipBalance)
      setBetInput(String(next))
      return next
    })
  }, [profile, balance, clamp])

  const applyBet = useCallback(
    (value: number) => {
      const cap =
        profile && profile.chipBalance > 0 ? profile.chipBalance : minBet
      const next = clamp(value, cap)
      setBet(next)
      setBetInput(String(next))
    },
    [profile, clamp, minBet],
  )

  const commitInput = useCallback(() => {
    const parsed = Number(betInput.replace(/[^0-9.]/g, ''))
    applyBet(parsed)
  }, [betInput, applyBet])

  const onBetInputChange = useCallback((raw: string) => {
    setBetInput(raw.replace(/[^\d]/g, ''))
  }, [])

  const step = useCallback(
    (direction: 1 | -1) => {
      applyBet(nextStep(bet, direction))
    },
    [applyBet, nextStep, bet],
  )

  const setMin = useCallback(() => applyBet(minBet), [applyBet, minBet])
  const setHalf = useCallback(
    () => applyBet(Math.floor(bet / 2)),
    [applyBet, bet],
  )
  const setDouble = useCallback(() => applyBet(bet * 2), [applyBet, bet])
  const setMax = useCallback(() => applyBet(balance), [applyBet, balance])

  const canAfford = Boolean(profile && profile.chipBalance >= bet && bet >= minBet)
  const canHalf = Math.floor(bet / 2) >= minBet
  const canDouble = balance >= minBet && bet < balance
  const canMinOrMax = balance >= minBet

  return {
    profile,
    balance,
    bet,
    betInput,
    applyBet,
    commitInput,
    onBetInputChange,
    step,
    setMin,
    setHalf,
    setDouble,
    setMax,
    canAfford,
    canHalf,
    canDouble,
    canMinOrMax,
    minBet,
  }
}
