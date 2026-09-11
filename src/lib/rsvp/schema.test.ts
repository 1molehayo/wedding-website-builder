import { describe, expect, it } from 'vitest'
import {
  maxAttendingForPlusOnes,
  parseAdminRsvpInput,
  parsePublicRsvpInput,
} from '@/lib/rsvp/schema'

describe('rsvp schema', () => {
  it('computes max attending from plus-ones', () => {
    expect(maxAttendingForPlusOnes(0)).toBe(1)
    expect(maxAttendingForPlusOnes(2)).toBe(3)
  })

  it('parses a public attending RSVP', () => {
    expect(
      parsePublicRsvpInput(
        {
          status: 'attending',
          attendingCount: 2,
          dietaryNotes: 'Vegetarian',
          message: 'Excited!',
        },
        3,
      ),
    ).toEqual({
      status: 'attending',
      attending_count: 2,
      dietary_notes: 'Vegetarian',
      rsvp_message: 'Excited!',
    })
  })

  it('rejects attending count above invitation max', () => {
    expect(() =>
      parsePublicRsvpInput(
        { status: 'attending', attendingCount: 4 },
        2,
      ),
    ).toThrow(/cannot exceed 2/)
  })

  it('allows admin to reset to pending', () => {
    expect(
      parseAdminRsvpInput(
        { status: 'pending', attendingCount: 0 },
        2,
      ),
    ).toEqual({
      rsvp_status: 'pending',
      attending_count: null,
      dietary_notes: null,
      rsvp_message: null,
    })
  })
})
