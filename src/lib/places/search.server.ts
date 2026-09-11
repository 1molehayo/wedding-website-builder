import {
  createTtlCache,
  normalizeAddressQuery,
} from '@/lib/places/cache'
import type { AddressSuggestion } from '@/lib/places/cache'

type SearchResult = {
  provider: 'google' | 'photon'
  suggestions: AddressSuggestion[]
}

const resultCache = createTtlCache<SearchResult>(1000 * 60 * 60 * 12, 300)
const inflight = new Map<string, Promise<SearchResult>>()

function googleMapsApiKey(): string | undefined {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  return key || undefined
}

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string
      text?: { text?: string }
      structuredFormat?: {
        mainText?: { text?: string }
        secondaryText?: { text?: string }
      }
    }
  }>
}

async function searchGooglePlaces(
  query: string,
): Promise<AddressSuggestion[]> {
  const apiKey = googleMapsApiKey()
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured.')
  }

  const response = await fetch(
    'https://places.googleapis.com/v1/places:autocomplete',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
      },
      body: JSON.stringify({
        input: query,
        includedPrimaryTypes: ['geocode', 'establishment'],
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Google Places search failed (${response.status}): ${body.slice(0, 200)}`,
    )
  }

  const data = (await response.json()) as GoogleAutocompleteResponse
  const suggestions: AddressSuggestion[] = []
  for (const [index, item] of (data.suggestions ?? []).entries()) {
    const prediction = item.placePrediction
    if (!prediction) continue
    const label =
      prediction.text?.text?.trim() ||
      prediction.structuredFormat?.mainText?.text?.trim()
    if (!label) continue
    suggestions.push({
      id: prediction.placeId ?? `google-${index}-${label}`,
      label,
      secondary: prediction.structuredFormat?.secondaryText?.text?.trim(),
    })
  }
  return suggestions
}

type PhotonResponse = {
  features?: Array<{
    properties?: {
      osm_id?: number | string
      name?: string
      street?: string
      housenumber?: string
      city?: string
      state?: string
      country?: string
      postcode?: string
    }
  }>
}

/** Free fallback (no API key) via Photon / OpenStreetMap. */
async function searchPhoton(query: string): Promise<AddressSuggestion[]> {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '6')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'WeddingWebsiteBuilder/1.0 (admin venue search)',
    },
  })

  if (!response.ok) {
    throw new Error(`Address search failed (${response.status}).`)
  }

  const data = (await response.json()) as PhotonResponse
  const suggestions: AddressSuggestion[] = []
  for (const [index, feature] of (data.features ?? []).entries()) {
    const props = feature.properties ?? {}
    const line = [
      [props.housenumber, props.street].filter(Boolean).join(' ').trim(),
      props.name,
      props.city,
      props.state,
      props.country,
    ]
      .filter(Boolean)
      .filter((part, i, arr) => arr.indexOf(part) === i)

    const label = line.join(', ')
    if (!label) continue
    suggestions.push({
      id: String(props.osm_id ?? `photon-${index}-${label}`),
      label,
      secondary: props.country,
    })
  }
  return suggestions
}

export async function searchAddressesHandler(
  query: string,
): Promise<SearchResult> {
  const normalized = normalizeAddressQuery(query)
  const defaultProvider = googleMapsApiKey() ? 'google' : 'photon'

  if (normalized.length < 3) {
    return { provider: defaultProvider, suggestions: [] }
  }

  const cached = resultCache.get(normalized)
  if (cached) return cached

  const existing = inflight.get(normalized)
  if (existing) return existing

  const request = (async (): Promise<SearchResult> => {
    if (googleMapsApiKey()) {
      try {
        return {
          provider: 'google',
          suggestions: await searchGooglePlaces(query.trim()),
        }
      } catch (error) {
        console.error('[places] Google search failed, falling back to Photon', {
          error: error instanceof Error ? error.message : String(error),
        })
        return {
          provider: 'photon',
          suggestions: await searchPhoton(query.trim()),
        }
      }
    }
    return {
      provider: 'photon',
      suggestions: await searchPhoton(query.trim()),
    }
  })()

  inflight.set(normalized, request)
  try {
    const result = await request
    resultCache.set(normalized, result)
    return result
  } finally {
    inflight.delete(normalized)
  }
}
