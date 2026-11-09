import { describe, expect, it } from 'vitest'
import { parseRegistryItemInput } from './schema'

const base = {
  title: 'Dinner set',
  description: '',
  store_url: '',
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

  it('rejects a second row in the same currency', () => {
    expect(() =>
      parseRegistryItemInput({
        ...base,
        prices: [
          { currency: 'USD', amount: '100' },
          { currency: 'usd', amount: '90' },
        ],
      }),
    ).toThrow(/only be listed once/)
  })

  it('rejects a gift with no price', () => {
    expect(() => parseRegistryItemInput({ ...base, prices: [] })).toThrow(
      /currency and price/,
    )
  })
})
