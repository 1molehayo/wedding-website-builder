import { describe, expect, it } from 'vitest'
import {
  paginateItems,
  parsePage,
  parsePageSize,
} from '@/lib/pagination'

describe('pagination helpers', () => {
  it('normalizes page and page-size search values', () => {
    expect(parsePage('3')).toBe(3)
    expect(parsePage('-2')).toBe(1)
    expect(parsePage('not-a-page')).toBe(1)
    expect(parsePageSize('20')).toBe(20)
    expect(parsePageSize('15')).toBe(10)
  })

  it('returns the requested page without mutating the source', () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1)
    expect(paginateItems(items, 2, 10)).toEqual([
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ])
    expect(items).toHaveLength(25)
  })
})
