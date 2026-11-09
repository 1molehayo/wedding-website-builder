/** Curated currencies for registry gifts and bank accounts (v1). */
export const CURATED_CURRENCIES = [
  {
    code: 'USD',
    name: 'US Dollar',
    country: 'United States',
    flag: '🇺🇸',
  },
  {
    code: 'EUR',
    name: 'Euro',
    country: 'Eurozone',
    flag: '🇪🇺',
  },
  {
    code: 'GBP',
    name: 'British Pound',
    country: 'United Kingdom',
    flag: '🇬🇧',
  },
  {
    code: 'NGN',
    name: 'Nigerian Naira',
    country: 'Nigeria',
    flag: '🇳🇬',
  },
] as const

export type CuratedCurrencyCode = (typeof CURATED_CURRENCIES)[number]['code']

export const CURATED_CURRENCY_CODES = CURATED_CURRENCIES.map(
  (item) => item.code,
) as [CuratedCurrencyCode, ...CuratedCurrencyCode[]]

export const DEFAULT_CURRENCY: CuratedCurrencyCode = 'USD'

export function isCuratedCurrencyCode(
  value: string,
): value is CuratedCurrencyCode {
  return CURATED_CURRENCY_CODES.includes(value as CuratedCurrencyCode)
}

export function getCurrencyMeta(code: string) {
  const normalized = code.trim().toUpperCase()
  return CURATED_CURRENCIES.find((item) => item.code === normalized) ?? null
}

/** Compact label for selects: "🇺🇸 USD" */
export function currencyOptionLabel(code: string): string {
  const meta = getCurrencyMeta(code)
  if (meta) return `${meta.flag} ${meta.code}`
  return code.trim().toUpperCase()
}

/** Longer label: "🇺🇸 United States · USD" */
export function currencyDetailLabel(code: string): string {
  const meta = getCurrencyMeta(code)
  if (meta) return `${meta.flag} ${meta.country} · ${meta.code}`
  return code.trim().toUpperCase()
}
