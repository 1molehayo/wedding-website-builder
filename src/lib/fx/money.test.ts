import { describe, expect, it } from 'vitest'
import { baseAmountToPay, payAmountToBase, roundMoney } from './money'

describe('money helpers', () => {
  it('rounds to two decimals', () => {
    expect(roundMoney(10.005)).toBe(10.01)
    expect(roundMoney(10.004)).toBe(10)
  })

  it('converts pay → base with locked rate', () => {
    expect(payAmountToBase(1346.61, 1346.61)).toBe(1)
    expect(payAmountToBase(2693.22, 1346.61)).toBe(2)
  })

  it('converts base → pay with locked rate', () => {
    expect(baseAmountToPay(100, 1346.61)).toBe(134661)
  })
})
