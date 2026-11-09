import { describe, expect, it } from 'vitest'
import {
  assertActivityAction,
  maskAccountNumber,
  redactActivityMetadata,
} from './redact'

describe('assertActivityAction', () => {
  it('accepts area.verb', () => {
    expect(assertActivityAction('registry.contribution_received')).toBe(
      'registry.contribution_received',
    )
  })

  it('rejects free text', () => {
    expect(() => assertActivityAction('Saved the gift')).toThrow(
      /area\.verb/,
    )
  })
})

describe('redactActivityMetadata', () => {
  it('keeps the last four characters of an account number and drops tokens', () => {
    expect(
      redactActivityMetadata({
        account_number: '0012345678',
        confirm_token: 'secret-token',
        amount: 45,
        currency: 'EUR',
      }),
    ).toEqual({
      account_number: '••••5678',
      amount: 45,
      currency: 'EUR',
    })
  })

  it('masks a short account number completely', () => {
    expect(maskAccountNumber('12')).toBe('••••')
  })
})
