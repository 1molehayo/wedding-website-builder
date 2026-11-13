import { describe, expect, it } from 'vitest'
import {
  currencyForCountry,
  pickContributionDefaultCurrency,
} from '@/lib/currency/currencies'

describe('registry location currency', () => {
  it('maps supported visitor countries to curated currencies', () => {
    expect(currencyForCountry('NG')).toBe('NGN')
    expect(currencyForCountry('GB')).toBe('GBP')
    expect(currencyForCountry('FR')).toBe('EUR')
    expect(currencyForCountry('US')).toBe('USD')
  })

  it('prefers the visitor currency when its account is available', () => {
    expect(
      pickContributionDefaultCurrency({
        availableCurrencies: ['USD', 'NGN', 'EUR'],
        visitorCountry: 'NG',
        giftCurrency: 'USD',
      }),
    ).toBe('NGN')
  })

  it('falls back to the gift currency and then the first account', () => {
    expect(
      pickContributionDefaultCurrency({
        availableCurrencies: ['USD', 'EUR'],
        visitorCountry: 'NG',
        giftCurrency: 'EUR',
      }),
    ).toBe('EUR')
    expect(
      pickContributionDefaultCurrency({
        availableCurrencies: ['GBP', 'USD'],
        visitorCountry: 'CA',
        giftCurrency: 'CAD',
      }),
    ).toBe('GBP')
  })
})
