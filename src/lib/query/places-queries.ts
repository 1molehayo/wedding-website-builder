import { queryOptions } from '@tanstack/react-query'
import { normalizeAddressQuery } from '@/lib/places/cache'
import { searchAddresses } from '@/lib/places/search'

export const placesQueryKeys = {
  addressSearch: (normalizedQuery: string) =>
    ['places', 'address-search', normalizedQuery] as const,
}

/** Client address autocomplete; mirrors the former 30-minute TTL cache. */
export function addressSearchQueryOptions(query: string) {
  const normalized = normalizeAddressQuery(query)

  return queryOptions({
    queryKey: placesQueryKeys.addressSearch(normalized),
    queryFn: async () => {
      const result = await searchAddresses({ data: { query: normalized } })
      return result.suggestions
    },
    staleTime: 1000 * 60 * 30,
  })
}
