/**
 * Live FX rates with NGN support.
 * Primary: Frankfurter (free, no key, includes NGN).
 * Fallback: open.er-api.com (free open access, includes NGN).
 * Rates are cached in-process for one hour.
 */

import { roundMoney } from '@/lib/fx/money'

export type LockedFxRate = {
  /** Pay-currency units per 1 base-currency unit. */
  rate: number
  baseCurrency: string
  payCurrency: string
  source: string
  lockedAt: string
}

type CacheEntry = {
  /** quote → units of quote per 1 base */
  rates: Record<string, number>
  fetchedAt: number
  source: string
}

const CACHE_TTL_MS = 60 * 60 * 1000
const cache = new Map<string, CacheEntry>()

function normalizeCurrency(code: string): string {
  return code.trim().toUpperCase()
}

async function fetchFrankfurterRates(
  base: string,
): Promise<CacheEntry | null> {
  const url = `https://api.frankfurter.dev/v2/rates?base=${encodeURIComponent(base.toLowerCase())}`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) return null

  const body: unknown = await response.json()
  const rates: Record<string, number> = { [base]: 1 }

  if (Array.isArray(body)) {
    for (const row of body) {
      if (
        row &&
        typeof row === 'object' &&
        'quote' in row &&
        'rate' in row &&
        typeof (row as { quote: unknown }).quote === 'string' &&
        typeof (row as { rate: unknown }).rate === 'number'
      ) {
        const quote = normalizeCurrency((row as { quote: string }).quote)
        const rate = (row as { rate: number }).rate
        if (rate > 0) rates[quote] = rate
      }
    }
  } else if (
    body &&
    typeof body === 'object' &&
    'rates' in body &&
    body.rates &&
    typeof body.rates === 'object'
  ) {
    for (const [quote, rate] of Object.entries(
      body.rates as Record<string, unknown>,
    )) {
      if (typeof rate === 'number' && rate > 0) {
        rates[normalizeCurrency(quote)] = rate
      }
    }
  } else {
    return null
  }

  return { rates, fetchedAt: Date.now(), source: 'frankfurter' }
}

async function fetchOpenErApiRates(base: string): Promise<CacheEntry | null> {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) return null

  const body: unknown = await response.json()
  if (
    !body ||
    typeof body !== 'object' ||
    !('rates' in body) ||
    !body.rates ||
    typeof body.rates !== 'object'
  ) {
    return null
  }

  const rates: Record<string, number> = { [base]: 1 }
  for (const [quote, rate] of Object.entries(
    body.rates as Record<string, unknown>,
  )) {
    if (typeof rate === 'number' && rate > 0) {
      rates[normalizeCurrency(quote)] = rate
    }
  }

  return { rates, fetchedAt: Date.now(), source: 'open-er-api' }
}

async function ratesForBase(base: string): Promise<CacheEntry> {
  const cached = cache.get(base)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached
  }

  let entry: CacheEntry | null = null
  try {
    entry = await fetchFrankfurterRates(base)
  } catch {
    entry = null
  }
  if (!entry) {
    try {
      entry = await fetchOpenErApiRates(base)
    } catch {
      entry = null
    }
  }
  if (!entry) {
    throw new Error(
      'Exchange rates are unavailable right now. Try again in a moment, or pay in the gift currency.',
    )
  }

  cache.set(base, entry)
  return entry
}

/**
 * Units of `payCurrency` per 1 unit of `baseCurrency`.
 * Example: base USD, pay NGN → ~1346.
 */
export async function getPayPerBaseRate(
  baseCurrency: string,
  payCurrency: string,
): Promise<{ rate: number; source: string }> {
  const base = normalizeCurrency(baseCurrency)
  const pay = normalizeCurrency(payCurrency)

  if (base === pay) {
    return { rate: 1, source: 'same_currency' }
  }

  const entry = await ratesForBase(base)
  const direct = entry.rates[pay]
  if (typeof direct === 'number' && direct > 0) {
    return { rate: direct, source: entry.source }
  }

  // Cross via the pay currency as base when the quote is missing.
  const reverseEntry = await ratesForBase(pay)
  const reverse = reverseEntry.rates[base]
  if (typeof reverse === 'number' && reverse > 0) {
    return {
      rate: 1 / reverse,
      source: reverseEntry.source,
    }
  }

  throw new Error(
    `No exchange rate found for ${base} → ${pay}. Choose another currency, or pay in ${base}.`,
  )
}

export async function lockFxRate(input: {
  baseCurrency: string
  payCurrency: string
}): Promise<LockedFxRate> {
  const baseCurrency = normalizeCurrency(input.baseCurrency)
  const payCurrency = normalizeCurrency(input.payCurrency)
  const { rate, source } = await getPayPerBaseRate(baseCurrency, payCurrency)

  return {
    rate: roundMoney(rate * 1e6) / 1e6,
    baseCurrency,
    payCurrency,
    source,
    lockedAt: new Date().toISOString(),
  }
}

/** Clear the in-process cache (tests). */
export function clearFxCache(): void {
  cache.clear()
}
