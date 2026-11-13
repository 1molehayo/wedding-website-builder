import { describe, expect, it } from 'vitest'
import { whatsappRsvpShareUrl } from '@/lib/guests/whatsapp'

describe('WhatsApp guest invitation', () => {
  it('includes the guest-facing invitation details', () => {
    const url = whatsappRsvpShareUrl({
      phone: '+2348031234567',
      guestFirstName: 'Ada',
      coupleLabel: 'Theo & Ada',
      weddingDateLabel: 'August 15, 2026',
      rsvpUrl: 'https://example.com/rsvp/token123',
      partyName: 'Lovelace household',
      plusOnes: 1,
      inviteMessage: 'Please arrive by 2pm.',
    })

    expect(url).not.toBeNull()
    const message = new URL(url!).searchParams.get('text')

    expect(message).toContain('Party / household: Lovelace household')
    expect(message).toContain('you and up to 1 guest')
    expect(message).toContain('A message from the couple:')
    expect(message).toContain('Please arrive by 2pm.')
  })
})
