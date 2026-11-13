import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultPhoneCountry } from '@/lib/auth/phone'

describe('defaultPhoneCountry', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the region from navigator.language', () => {
    vi.stubGlobal('navigator', {
      language: 'en-GB',
      languages: ['en-GB'],
    })
    expect(defaultPhoneCountry()).toBe('GB')
  })

  it('prefers a trusted visitor region over the browser locale', () => {
    vi.stubGlobal('navigator', {
      language: 'en-US',
      languages: ['en-US'],
    })
    expect(defaultPhoneCountry('NG')).toBe('NG')
  })

  it('prefers the first languages entry with a region', () => {
    vi.stubGlobal('navigator', {
      language: 'en',
      languages: ['fr-FR', 'en'],
    })
    expect(defaultPhoneCountry()).toBe('FR')
  })

  it('falls back to NG when navigator is unavailable', () => {
    vi.stubGlobal('navigator', undefined)
    expect(defaultPhoneCountry()).toBe('NG')
  })

  it('maximizes language-only tags to a default region (en → US)', () => {
    vi.stubGlobal('navigator', {
      language: 'en',
      languages: ['en'],
    })
    expect(defaultPhoneCountry()).toBe('US')
  })
})
