import { describe, expect, it } from 'vitest'
import { guestFormSchemaFor, parseGuestInput } from '@/lib/guests/schema'

const base = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: '',
  phoneCountry: 'NG',
  phoneNational: '',
  inviteChannel: 'none' as const,
  partyName: '',
  plusOnes: 0,
  notes: '',
}

describe('guest form schema', () => {
  it('allows a create with no contact details when invite preference is none', () => {
    const parsed = guestFormSchemaFor('create').parse(base)
    expect(parsed.email).toBe('')
    expect(parsed.phone).toBeNull()
    expect(parsed.inviteChannel).toBe('none')
  })

  it('requires email when the invite preference is email', () => {
    const result = guestFormSchemaFor('create').safeParse({
      ...base,
      inviteChannel: 'email',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'email')).toBe(
        true,
      )
    }
  })

  it('requires a national number when the invite preference is WhatsApp', () => {
    const result = guestFormSchemaFor('create').safeParse({
      ...base,
      inviteChannel: 'whatsapp',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === 'phoneNational'),
      ).toBe(true)
    }
  })

  it('stores a valid national number as E.164 and rejects a typed calling code', () => {
    const parsed = guestFormSchemaFor('create').parse({
      ...base,
      inviteChannel: 'whatsapp',
      phoneNational: '8031234567',
    })
    expect(parsed.phone).toBe('+2348031234567')

    const withCode = guestFormSchemaFor('create').safeParse({
      ...base,
      inviteChannel: 'whatsapp',
      phoneNational: '2348031234567',
    })
    expect(withCode.success).toBe(false)
  })

  it('does not require email or phone when editing', () => {
    const parsed = guestFormSchemaFor('edit').parse({
      ...base,
      inviteChannel: 'both',
    })
    expect(parsed.email).toBe('')
    expect(parsed.phone).toBeNull()
  })

  it('accepts an empty email on the stored guest payload', () => {
    expect(
      parseGuestInput({
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: '',
        phone: '+2348031234567',
      }).email,
    ).toBe('')
  })
})
