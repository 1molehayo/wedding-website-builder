import { describe, expect, it } from 'vitest'
import { invitationDateParts } from '@/lib/invitation/date-parts'
import {
  INVITATION_CATEGORIES,
  INVITATION_DESIGNS,
  filterInvitationDesigns,
  nameInitial,
} from '@/lib/invitation/designs'

describe('invitation monogram initials', () => {
  it('uses the first letter', () => {
    expect(nameInitial('Marvelous')).toBe('M')
    expect(nameInitial('  lillian ')).toBe('L')
  })

  it('keeps an accented first letter', () => {
    expect(nameInitial('Émile')).toBe('É')
  })

  it('uses a mark when the name is empty', () => {
    expect(nameInitial('   ')).toBe('·')
  })
})

describe('invitation design catalog', () => {
  it('has twelve named designs', () => {
    expect(INVITATION_DESIGNS).toHaveLength(12)
    expect(new Set(INVITATION_DESIGNS.map((design) => design.id)).size).toBe(12)
  })

  it('gives every category at least two designs', () => {
    for (const category of INVITATION_CATEGORIES) {
      const matches = INVITATION_DESIGNS.filter((design) =>
        design.categories.some((id) => id === category.id),
      )
      expect(matches.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('shows a design under each category it belongs to', () => {
    const facet = filterInvitationDesigns('floral', '').find(
      (design) => design.id === 'facet',
    )
    expect(facet).toBeDefined()
    expect(
      filterInvitationDesigns('geometric', '').some(
        (design) => design.id === 'facet',
      ),
    ).toBe(true)
  })

  it('searches by design name and composition tag', () => {
    expect(filterInvitationDesigns('all', 'masthead').map((design) => design.id)).toEqual([
      'masthead',
    ])
    expect(
      filterInvitationDesigns('all', 'acrylic').map((design) => design.id),
    ).toEqual(['facet'])
  })

  it('keeps the category tab and the search together', () => {
    expect(
      filterInvitationDesigns('floral', 'acrylic').map((design) => design.id),
    ).toEqual(['facet'])
    expect(filterInvitationDesigns('editorial', 'acrylic')).toEqual([])
  })
})

describe('invitation date parts', () => {
  it('splits a stored date', () => {
    expect(invitationDateParts('2026-09-27')).toEqual({
      weekday: 'Sunday',
      month: 'September',
      day: '27',
      year: '2026',
      label: 'September 27, 2026',
    })
  })

  it('announces a missing date', () => {
    expect(invitationDateParts(null).label).toBe('Date to be announced')
    expect(invitationDateParts('').day).toBeNull()
    expect(invitationDateParts('not-a-date').label).toBe('Date to be announced')
  })
})
