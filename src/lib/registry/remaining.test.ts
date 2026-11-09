import { describe, expect, it } from 'vitest'
import {
  giftCoveredFraction,
  giftStillOpen,
  remainingPrices,
} from './remaining'

const listed = [{ currency: 'USD', amount: 100 }]

describe('remainingPrices', () => {
  it('leaves the full price when nothing is applied', () => {
    expect(
      remainingPrices(listed, [
        {
          amountBase: 45,
          status: 'pending',
          appliedAt: null,
        },
      ]),
    ).toEqual([{ currency: 'USD', original: 100, remaining: 100 }])
  })

  it('reduces the base amount by locked amount_base', () => {
    expect(
      remainingPrices(listed, [
        {
          amountBase: 40,
          status: 'pending',
          appliedAt: '2026-11-09T00:00:00.000Z',
        },
      ]),
    ).toEqual([{ currency: 'USD', original: 100, remaining: 60 }])
    expect(
      giftCoveredFraction(listed, [
        {
          amountBase: 40,
          status: 'pending',
          appliedAt: '2026-11-09T00:00:00.000Z',
        },
      ]),
    ).toBe(0.4)
  })

  it('puts the share back when marked not received', () => {
    expect(
      remainingPrices(listed, [
        {
          amountBase: 45,
          status: 'not_received',
          appliedAt: '2026-11-09T00:00:00.000Z',
        },
      ]),
    ).toEqual([{ currency: 'USD', original: 100, remaining: 100 }])
  })

  it('treats overfunding as fully covered', () => {
    const remaining = remainingPrices(listed, [
      {
        amountBase: 120,
        status: 'received',
        appliedAt: '2026-11-09T00:00:00.000Z',
      },
    ])
    expect(remaining.every((price) => price.remaining === 0)).toBe(true)
    expect(giftStillOpen(remaining)).toBe(false)
  })

  it('uses only the first listed price as base', () => {
    expect(
      remainingPrices(
        [
          { currency: 'USD', amount: 100 },
          { currency: 'EUR', amount: 90 },
        ],
        [
          {
            amountBase: 25,
            status: 'received',
            appliedAt: '2026-11-09T00:00:00.000Z',
          },
        ],
      ),
    ).toEqual([{ currency: 'USD', original: 100, remaining: 75 }])
  })
})
