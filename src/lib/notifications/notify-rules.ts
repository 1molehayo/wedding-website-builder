/**
 * Which activity actions create in-app notifications, and where the bell links.
 * Keep draft saves and auth noise out of the inbox.
 */

const NOTIFY_ACTIONS = new Set([
  'guest.created',
  'guest.updated',
  'guest.deleted',
  'guest.invited',
  'guest.rsvp_submitted',
  'registry.gift_created',
  'registry.gift_updated',
  'registry.gift_deleted',
  'registry.account_created',
  'registry.account_updated',
  'registry.account_deleted',
  'registry.contribution_started',
  'registry.contribution_confirmed',
  'registry.contribution_received',
  'registry.contribution_not_received',
  'registry.contribution_status_updated',
  'registry.contribution_amount_edited',
  'pages.published',
  'pages.restored',
  'media.uploaded',
  'media.deleted',
  'media.share_created',
  'media.share_updated',
  'media.share_revoked',
  'media.share_emailed',
  'settings.saved',
  'settings.date_published',
  'settings.date_unpublished',
  'settings.invitation_card_regenerated',
  'profile.updated',
  'profile.deletion_requested',
  'admins.invited',
  'admins.invite_resent',
  'admins.invite_cancelled',
  'admins.invite_accepted',
  'admins.removed',
  'feedback.submitted',
])

export function shouldNotifyAction(action: string): boolean {
  return NOTIFY_ACTIONS.has(action)
}

export type NotificationHref =
  | '/admin/guests'
  | '/admin/registry'
  | '/admin/pages'
  | '/admin/media'
  | '/admin/settings'
  | '/admin/profile'
  | '/admin/admins'
  | '/admin/feedback'
  | '/admin/activity'

export function parseNotificationHref(value: string | null): NotificationHref {
  switch (value) {
    case '/admin/guests':
    case '/admin/registry':
    case '/admin/pages':
    case '/admin/media':
    case '/admin/settings':
    case '/admin/profile':
    case '/admin/admins':
    case '/admin/feedback':
    case '/admin/activity':
      return value
    default:
      return '/admin/activity'
  }
}

export function notificationHrefForAction(
  action: string,
): NotificationHref {
  const area = action.split('.')[0]
  switch (area) {
    case 'guest':
      return '/admin/guests'
    case 'registry':
      return '/admin/registry'
    case 'pages':
      return '/admin/pages'
    case 'media':
      return '/admin/media'
    case 'settings':
      return '/admin/settings'
    case 'profile':
      return '/admin/profile'
    case 'admins':
      return '/admin/admins'
    case 'feedback':
      return '/admin/feedback'
    default:
      return '/admin/activity'
  }
}
