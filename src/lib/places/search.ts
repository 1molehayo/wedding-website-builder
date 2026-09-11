import { createServerFn } from '@tanstack/react-start'
import type { AddressSuggestion } from '@/lib/places/cache'

export type { AddressSuggestion }

export const searchAddresses = createServerFn({ method: 'POST' })
  .validator((data: { query: string }) => ({
    query: data.query.trim(),
  }))
  .handler(
    async ({
      data,
    }): Promise<{
      provider: 'google' | 'photon'
      suggestions: AddressSuggestion[]
    }> => {
      const { searchAddressesHandler } = await import('./search.server')
      return searchAddressesHandler(data.query)
    },
  )
