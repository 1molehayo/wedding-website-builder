import { describe, expect, it } from 'vitest'
import {
  buildWeddingPublicSlug,
  parsePublicSlug,
  withPublicSlugUuid,
} from '@/lib/wedding/slug'

describe('wedding public slug', () => {
  it('builds bride-groom-year from wedding date', () => {
    expect(
      buildWeddingPublicSlug({
        brideName: 'Ada',
        groomName: 'Theo',
        weddingDate: '2027-08-15',
        createdAt: '2025-01-10T12:00:00.000Z',
      }),
    ).toBe('ada-theo-2027')
  })

  it('uses setup year when wedding date is unset', () => {
    expect(
      buildWeddingPublicSlug({
        brideName: 'Ada',
        groomName: 'Theo',
        weddingDate: null,
        createdAt: '2025-11-02T18:00:00.000Z',
      }),
    ).toBe('ada-theo-2025')
  })

  it('appends randomUUID when the base slug is taken', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(withPublicSlugUuid('ada-theo-2027', uuid)).toBe(
      'ada-theo-2027-550e8400-e29b-41d4-a716-446655440000',
    )
  })

  it('rejects reserved slugs', () => {
    expect(() => parsePublicSlug('admin')).toThrow(/reserved/)
    expect(() => parsePublicSlug('photos')).toThrow(/reserved/)
  })

  it('normalizes input', () => {
    expect(parsePublicSlug('  Ada--Theo-2026  ')).toBe('ada-theo-2026')
  })
})
