import { describe, expect, it } from 'vitest'
import { parseRegistryItemInput } from './schema'

const base = {
  title: 'Dinner set',
  description: '',
  store_url: '',
  amazon_url: '',
  photo_path: null,
  prices: [{ currency: 'usd', amount: '100' }],
  desired_qty: 1,
  claimed_qty: 0,
  status: 'available' as const,
  is_visible: true,
}

describe('parseRegistryItemInput', () => {
  it('requires one price and uppercases the currency', () => {
    const parsed = parseRegistryItemInput(base)
    expect(parsed.store_url).toBeNull()
    expect(parsed.prices).toEqual([{ currency: 'USD', amount: 100 }])
  })

  it('rejects a second price row', () => {
    expect(() =>
      parseRegistryItemInput({
        ...base,
        prices: [
          { currency: 'USD', amount: '100' },
          { currency: 'EUR', amount: '90' },
        ],
      }),
    ).toThrow(/one price/i)
  })

  it('rejects a gift with no price', () => {
    expect(() => parseRegistryItemInput({ ...base, prices: [] })).toThrow(
      /currency and price/,
    )
  })

  it('rejects a currency outside the curated list', () => {
    expect(() =>
      parseRegistryItemInput({
        ...base,
        prices: [{ currency: 'CAD', amount: '100' }],
      }),
    ).toThrow(/USD, EUR, GBP, or NGN/i)
  })
})
