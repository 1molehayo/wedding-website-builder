import { describe, expect, it } from 'vitest'
import {
  notificationHrefForAction,
  parseNotificationHref,
  shouldNotifyAction,
} from '@/lib/notifications/notify-rules'

describe('notification rules', () => {
  it('notifies relevant activity but not draft noise', () => {
    expect(shouldNotifyAction('guest.rsvp_submitted')).toBe(true)
    expect(shouldNotifyAction('pages.published')).toBe(true)
    expect(shouldNotifyAction('pages.draft_saved')).toBe(false)
  })

  it('maps notification actions to typed admin destinations', () => {
    expect(notificationHrefForAction('guest.created')).toBe('/admin/guests')
    expect(notificationHrefForAction('registry.gift_created')).toBe(
      '/admin/registry',
    )
    expect(notificationHrefForAction('unknown.action')).toBe('/admin/activity')
  })

  it('falls back safely when a stored destination is unsupported', () => {
    expect(parseNotificationHref('/admin/pages')).toBe('/admin/pages')
    expect(parseNotificationHref('/admin/not-real')).toBe('/admin/activity')
    expect(parseNotificationHref(null)).toBe('/admin/activity')
  })
})
