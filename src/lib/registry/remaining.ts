/**
 * Remaining gift amounts in the gift's single base currency.
 * Applied contributions reduce remaining via their locked amount_base.
 */

import { roundMoney } from '@/lib/fx/money'

export type ListedPrice = {
  currency: string
  amount: number
}

export type AppliedPayment = {
  /** Converted amount in the gift base currency (locked at payment time). */
  amountBase: number
  status: 'pending' | 'received' | 'not_received'
  appliedAt: string | null
}

export type RemainingPrice = {
  currency: string
  original: number
  remaining: number
}

export function isContributionApplied(payment: AppliedPayment): boolean {
  return payment.appliedAt != null && payment.status !== 'not_received'
}

/** Pick the single base price. Legacy multi-price gifts use the first row. */
export function pickBasePrice(listed: ListedPrice[]): ListedPrice | null {
  if (listed.length === 0) return null
  const first = listed[0]
  return {
    currency: first.currency.toUpperCase(),
    amount: first.amount,
  }
}

/** Sum of applied base amounts / listed base amount. */
export function giftCoveredFraction(
  listed: ListedPrice[],
  payments: AppliedPayment[],
): number {
  const base = pickBasePrice(listed)
  if (!base || base.amount <= 0) return 0

  let paid = 0
  for (const payment of payments) {
    if (!isContributionApplied(payment)) continue
    paid += payment.amountBase
  }

  return paid / base.amount
}

export function remainingPrices(
  listed: ListedPrice[],
  payments: AppliedPayment[],
): RemainingPrice[] {
  const base = pickBasePrice(listed)
  if (!base) return []

  let paid = 0
  for (const payment of payments) {
    if (!isContributionApplied(payment)) continue
    paid += payment.amountBase
  }

  const remaining = roundMoney(Math.max(0, base.amount - paid))
  return [
    {
      currency: base.currency,
      original: base.amount,
      remaining,
    },
  ]
}

/** Gift stays open while base remaining is above zero. */
export function giftStillOpen(remaining: RemainingPrice[]): boolean {
  if (remaining.length === 0) return false
  return remaining.some((price) => price.remaining > 0)
}
