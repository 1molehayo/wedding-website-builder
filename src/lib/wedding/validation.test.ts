import { describe, expect, it } from 'vitest'
import { parseUpdateWeddingInput } from './validation'

const base = {
  groom_name: 'Theo',
  bride_name: 'Ada',
  wedding_date: '2027-06-12',
  status: 'date_confirmed' as const,
  venue_name: 'Garden Hall',
  venue_location: 'Chicago',
  dress_code: 'Formal attire',
  announcement_text: 'Ceremony starts promptly at 3pm',
  active_public_theme: 'botanica' as const,
  public_slug: 'ada-theo-2027',
  invitation_design_id: 'wreath',
  invitation_design_mode: 'light' as const,
  invitation_card_path: null,
}

describe('parseUpdateWeddingInput', () => {
  it('accepts a full valid payload and trims strings', () => {
    const result = parseUpdateWeddingInput({
      ...base,
      groom_name: '  Theo ',
      bride_name: ' Ada ',
      venue_name: '  Garden Hall ',
      venue_location: ' Chicago ',
      dress_code: ' Formal attire ',
      announcement_text: '  Ceremony starts promptly at 3pm ',
      invitation_card_path: 'invitations/w1/card.png',
    })

    expect(result).toEqual({
      groom_name: 'Theo',
      bride_name: 'Ada',
      wedding_date: '2027-06-12',
      status: 'date_confirmed',
      venue_name: 'Garden Hall',
      venue_location: 'Chicago',
      dress_code: 'Formal attire',
      announcement_text: 'Ceremony starts promptly at 3pm',
      active_public_theme: 'botanica',
      public_slug: 'ada-theo-2027',
      invitation_design_id: 'wreath',
      invitation_design_mode: 'light',
      invitation_card_path: 'invitations/w1/card.png',
    })
  })

  it('allows a null wedding date and empty optional fields', () => {
    const result = parseUpdateWeddingInput({
      ...base,
      wedding_date: '',
      status: 'planning',
      venue_name: '   ',
      venue_location: null,
      dress_code: undefined,
      announcement_text: '   ',
      active_public_theme: 'celeste',
      public_slug: 'ada-theo-2026',
      invitation_design_mode: 'dark',
      invitation_card_path: '',
    })

    expect(result.wedding_date).toBeNull()
    expect(result.venue_name).toBeNull()
    expect(result.venue_location).toBeNull()
    expect(result.dress_code).toBeNull()
    expect(result.announcement_text).toBeNull()
    expect(result.invitation_design_mode).toBe('dark')
    expect(result.invitation_card_path).toBeNull()
  })

  it('rejects an invented placeholder-like invalid date', () => {
    expect(() =>
      parseUpdateWeddingInput({
        ...base,
        wedding_date: '2027-13-40',
        status: 'planning',
        venue_name: null,
        venue_location: null,
        dress_code: null,
        active_public_theme: 'celeste',
        public_slug: 'ada-theo-2026',
      }),
    ).toThrow(/invalid|YYYY-MM-DD/i)
  })

  it('rejects unknown themes, statuses, and invitation designs', () => {
    expect(() =>
      parseUpdateWeddingInput({
        ...base,
        wedding_date: null,
        status: 'draft',
        venue_name: null,
        venue_location: null,
        dress_code: null,
        active_public_theme: 'celeste',
        public_slug: 'ada-theo-2026',
      }),
    ).toThrow(/status/i)

    expect(() =>
      parseUpdateWeddingInput({
        ...base,
        wedding_date: null,
        status: 'planning',
        venue_name: null,
        venue_location: null,
        dress_code: null,
        active_public_theme: 'lavender',
        public_slug: 'ada-theo-2026',
      }),
    ).toThrow(/theme/i)

    expect(() =>
      parseUpdateWeddingInput({
        ...base,
        invitation_design_id: 'not-a-design',
      }),
    ).toThrow(/invitation design/i)
  })
})
