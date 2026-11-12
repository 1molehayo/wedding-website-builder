import { queryOptions } from '@tanstack/react-query'
import { quoteContributionFx } from '@/lib/registry/registry'

export const fxQueryKeys = {
  contributionQuote: (input: {
    weddingSlug: string
    giftId: string | null
    currency: string
  }) =>
    [
      'fx',
      'contribution-quote',
      input.weddingSlug,
      input.giftId,
      input.currency,
    ] as const,
}

export function contributionFxQuoteQueryOptions(input: {
  weddingSlug: string
  giftId: string | null
  currency: string
}) {
  const weddingSlug = input.weddingSlug.trim().toLowerCase()
  const giftId = input.giftId?.trim() ? input.giftId.trim() : null
  const currency = input.currency.trim().toUpperCase()

  return queryOptions({
    queryKey: fxQueryKeys.contributionQuote({
      weddingSlug,
      giftId,
      currency,
    }),
    queryFn: () =>
      quoteContributionFx({
        data: {
          weddingSlug,
          giftId,
          currency,
        },
      }),
  })
}
