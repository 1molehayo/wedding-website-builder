/** Round to two decimal places (currency units). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * True when `rate` is a usable cross-currency quote (pay units per 1 base).
 * Same-currency and exact 1:1 cross rates are rejected so a failed FX lookup
 * cannot be shown as a real conversion.
 */
export function isUsableCrossCurrencyRate(
  baseCurrency: string,
  payCurrency: string,
  rate: number,
): boolean {
  const base = baseCurrency.trim().toUpperCase()
  const pay = payCurrency.trim().toUpperCase()
  if (!base || !pay || base === pay) return false
  if (!Number.isFinite(rate) || rate <= 0) return false
  // Exact 1:1 across different codes is treated as a failed/stale quote for
  // our curated pairs (USD/EUR/GBP/NGN). Near-parity pairs use non-exact rates.
  if (rate === 1) return false
  return true
}

export function isUsableSuggestedAmountQuote(
  quote: {
    baseCurrency: string
    payCurrency: string
    fxRate: number
    suggestedAmount: number | null
  },
  selectedPayCurrency: string,
): boolean {
  const base = quote.baseCurrency.trim().toUpperCase()
  const pay = quote.payCurrency.trim().toUpperCase()
  if (pay !== selectedPayCurrency.trim().toUpperCase()) return false
  if (
    quote.suggestedAmount == null ||
    !Number.isFinite(quote.suggestedAmount) ||
    quote.suggestedAmount <= 0
  ) {
    return false
  }
  if (base === pay) return quote.fxRate === 1
  return isUsableCrossCurrencyRate(base, pay, quote.fxRate)
}

/**
 * Convert a payment amount into the gift base currency.
 * `fxRate` is pay-currency units per 1 base unit (e.g. 1346.61 NGN per 1 USD).
 */
export function payAmountToBase(payAmount: number, fxRate: number): number {
  if (fxRate <= 0) throw new Error('Exchange rate must be greater than zero.')
  return roundMoney(payAmount / fxRate)
}

/**
 * Convert a remaining base amount into the guest's pay currency.
 * `fxRate` is pay-currency units per 1 base unit.
 */
export function baseAmountToPay(baseAmount: number, fxRate: number): number {
  if (fxRate <= 0) throw new Error('Exchange rate must be greater than zero.')
  return roundMoney(baseAmount * fxRate)
}
