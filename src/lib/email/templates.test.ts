import { describe, expect, it } from 'vitest'
import {
  adminOtpEmailHtml,
  adminOtpEmailText,
  guestDateAnnouncedEmailHtml,
  guestDateAnnouncedEmailText,
  guestPhotoShareEmailHtml,
  guestPhotoShareEmailText,
  guestRsvpInviteEmailHtml,
  guestRsvpInviteEmailText,
} from '@/lib/email/templates'

describe('admin OTP email templates', () => {
  it('includes the token in text and html without inventing a couple', () => {
    const text = adminOtpEmailText({ token: '123456' })
    const html = adminOtpEmailHtml({ token: '123456' })
    expect(text).toContain('123456')
    expect(html).toContain('123456')
    expect(text).not.toContain('Theo')
    expect(html).not.toContain('Ada')
  })
})

describe('guest email templates', () => {
  it('includes RSVP and optional photo links in text', () => {
    const text = guestRsvpInviteEmailText({
      guestName: 'Ada',
      coupleLabel: 'Theo & Ada',
      weddingDateLabel: 'August 15, 2026',
      websiteUrl: 'https://example.com/ada-theo-2026',
      rsvpUrl: 'https://example.com/rsvp/token123',
      photosUrl: 'https://example.com/photos/share?g=token123',
      theme: 'celeste',
    })

    expect(text).toContain('Hi Ada,')
    expect(text).toContain('Theo & Ada')
    expect(text).toContain('https://example.com/rsvp/token123')
    expect(text).toContain('https://example.com/photos/share?g=token123')
    expect(text).toContain('https://example.com/ada-theo-2026')
  })

  it('omits photo and website lines when null', () => {
    const text = guestRsvpInviteEmailText({
      guestName: 'Ada',
      coupleLabel: 'Theo & Ada',
      weddingDateLabel: 'Date to be announced',
      websiteUrl: null,
      rsvpUrl: 'https://example.com/rsvp/token123',
      photosUrl: null,
      theme: 'celeste',
    })

    expect(text).toContain('https://example.com/rsvp/token123')
    expect(text).not.toContain('Wedding website:')
    expect(text).not.toContain('private photo album')
  })

  it('builds themed RSVP HTML with theme accent colors', () => {
    const html = guestRsvpInviteEmailHtml({
      guestName: 'Ada',
      coupleLabel: 'Theo & Ada',
      weddingDateLabel: 'Date to be announced',
      websiteUrl: null,
      rsvpUrl: 'https://example.com/rsvp/token123',
      photosUrl: null,
      theme: 'celeste',
      mode: 'light',
    })

    expect(html).toContain('#6f93b8')
    expect(html).toContain('RSVP now')
    expect(html).toContain('Theo &amp; Ada')
  })

  it('builds dark-mode themed RSVP HTML', () => {
    const html = guestRsvpInviteEmailHtml({
      guestName: 'Ada',
      coupleLabel: 'Theo & Ada',
      weddingDateLabel: 'Date to be announced',
      websiteUrl: null,
      rsvpUrl: 'https://example.com/rsvp/token123',
      photosUrl: null,
      theme: 'nocturne',
      mode: 'dark',
    })

    expect(html).toContain('#0a0e16')
    expect(html).toContain('#9bb8d4')
  })

  it('builds photo-share email text', () => {
    const text = guestPhotoShareEmailText({
      guestName: 'Ada',
      coupleLabel: 'Theo & Ada',
      shareName: 'Engagement set',
      photosUrl: 'https://example.com/photos/share?g=token123',
      theme: 'botanica',
    })

    expect(text).toContain('Engagement set')
    expect(text).toContain('https://example.com/photos/share?g=token123')
  })

  it('builds themed photo-share HTML', () => {
    const html = guestPhotoShareEmailHtml({
      guestName: 'Ada',
      coupleLabel: 'Theo & Ada',
      shareName: 'Engagement set',
      photosUrl: 'https://example.com/photos/share?g=token123',
      theme: 'rosewater',
      mode: 'light',
    })

    expect(html).toContain('#c99393')
    expect(html).toContain('View photos')
    expect(html).toContain('Engagement set')
  })

  it('builds themed date-announced HTML and text', () => {
    const input = {
      guestName: 'Ada',
      coupleLabel: 'Theo & Ada',
      weddingDateLabel: 'June 12, 2027',
      websiteUrl: 'https://example.com/ada-theo-2026',
      rsvpUrl: 'https://example.com/rsvp/token123',
      theme: 'botanica' as const,
      mode: 'light' as const,
    }

    const html = guestDateAnnouncedEmailHtml(input)
    const text = guestDateAnnouncedEmailText(input)

    expect(html).toContain('Date announced')
    expect(html).toContain('June 12, 2027')
    expect(text).toContain('June 12, 2027')
    expect(text).toContain('https://example.com/rsvp/token123')
  })
})
