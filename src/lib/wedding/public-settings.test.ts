import { describe, expect, it } from 'vitest'
import {
  FALLBACK_PUBLIC_WEDDING,
  formatWeddingDate,
  hasPublicWedding,
  resolvePublicWeddingDate,
  toPublicSettings,
} from './public-settings'

describe('resolvePublicWeddingDate', () => {
  it('returns null when date is unset', () => {
    expect(
      resolvePublicWeddingDate({
        wedding_date: null,
        date_published_at: '2026-08-13T00:00:00.000Z',
      }),
    ).toBeNull()
  })

  it('returns null when date is draft / unpublished', () => {
    expect(
      resolvePublicWeddingDate({
        wedding_date: '2027-06-12',
        date_published_at: null,
      }),
    ).toBeNull()
  })

  it('returns the date when published', () => {
    expect(
      resolvePublicWeddingDate({
        wedding_date: '2027-06-12',
        date_published_at: '2026-08-13T00:00:00.000Z',
      }),
    ).toBe('2027-06-12')
  })
})

describe('toPublicSettings', () => {
  it('hides unpublished dates from public settings', () => {
    const publicSettings = toPublicSettings({
      groom_name: 'Theo',
      bride_name: 'Ada',
      wedding_date: '2027-06-12',
      date_published_at: null,
      venue_name: null,
      venue_location: null,
      dress_code: null,
      active_public_theme: 'celeste',
      status: 'planning',
      public_slug: 'ada-theo-2026',
    })

    expect(publicSettings.wedding_date).toBeNull()
    expect(formatWeddingDate(publicSettings.wedding_date)).toBe(
      'Date to be announced',
    )
  })

  it('does not invent a fictional couple when no wedding row exists', () => {
    const empty = toPublicSettings(null)
    expect(empty).toEqual(FALLBACK_PUBLIC_WEDDING)
    expect(empty.groom_name).toBe('')
    expect(empty.bride_name).toBe('')
    expect(empty.public_slug).toBeNull()
    expect(hasPublicWedding(empty)).toBe(false)
  })

  it('treats a slug-bearing wedding as public', () => {
    expect(
      hasPublicWedding({
        ...FALLBACK_PUBLIC_WEDDING,
        groom_name: 'Theo',
        bride_name: 'Ada',
        public_slug: 'ada-theo-2026',
      }),
    ).toBe(true)
  })
})
