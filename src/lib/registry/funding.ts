export type GiftFunding = {
  targetPrice: number
  totalContributed: number
  remaining: number
  /** Whole percent, capped at 100 for display and the progress bar. */
  percentage: number
  fullyFunded: boolean
}

export function sumConfirmedContributions(
  contributions: readonly number[],
): number {
  return contributions.reduce((total, amount) => {
    return Number.isFinite(amount) ? total + amount : total
  }, 0)
}

export function getGiftFunding(
  targetPrice: number,
  contributions: readonly number[],
): GiftFunding {
  const safeTarget = Number.isFinite(targetPrice) ? targetPrice : 0
  const totalContributed = sumConfirmedContributions(contributions)
  const remaining = Math.max(0, safeTarget - totalContributed)
  const rawPercent =
    safeTarget > 0 ? (totalContributed / safeTarget) * 100 : 0
  const percentage = Math.min(100, Math.max(0, Math.round(rawPercent)))

  return {
    targetPrice: safeTarget,
    totalContributed,
    remaining,
    percentage,
    fullyFunded: safeTarget > 0 && totalContributed >= safeTarget,
  }
}

export function formatNaira(amount: number): string {
  const value = Number.isFinite(amount) ? Math.round(amount) : 0
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Fictional gift used only to verify the progress indicator. */
export const SAMPLE_GIFT = {
  title: 'Sample gift',
  targetPrice: 500_000,
} as const

export const SAMPLE_GIFT_FUNDING_SCENARIOS = [
  {
    id: 'none',
    label: 'No contributions',
    contributions: [] as readonly number[],
  },
  {
    id: 'half',
    label: 'Half funded',
    contributions: [250_000],
  },
  {
    id: 'full',
    label: 'Fully funded',
    contributions: [500_000],
  },
  {
    id: 'over',
    label: 'Overfunded',
    contributions: [600_000],
  },
] as const
