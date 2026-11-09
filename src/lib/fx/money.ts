/** Round to two decimal places (currency units). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
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
