import { describe, expect, it } from 'vitest'
import { guestNameKey, slugifyNamePart } from '@/lib/guests/name-key'

describe('guestNameKey', () => {
  it('matches names ignoring case, spaces, and punctuation', () => {
    expect(guestNameKey('John', 'Smith')).toBe(guestNameKey('john', 'smith'))
    expect(guestNameKey('John', 'Smith')).toBe(guestNameKey('  John  ', 'Smith!'))
    expect(guestNameKey('Mary-Jane', 'O’Brien')).toBe(
      guestNameKey('Mary Jane', 'OBrien'),
    )
  })

  it('slugify strips accents', () => {
    expect(slugifyNamePart('José')).toBe('jose')
  })

  it('does not match different names', () => {
    expect(guestNameKey('John', 'Smith')).not.toBe(guestNameKey('Jon', 'Smith'))
  })
})
