/**
 * Shared UI / navigation / product branding constants.
 * Domain catalogs (themes, wedding statuses) stay in their dedicated modules.
 */

/** Product brand — Yoruba tone marks for UI (`ìgbéyàwó` + wa ≈ our wedding). */
export const PRODUCT_NAME = 'Ìgbéyàwówa'
export const PRODUCT_SHORT_NAME = 'Ìgbéyàwówa'
/** ASCII form for domains / slug-safe contexts. */
export const PRODUCT_NAME_ASCII = 'Igbeyawowa'
export const PRODUCT_TAGLINE = 'Wedding websites'
/** Studio credit (optional). */
export const STUDIO_NAME = 'Onemole'
/** v1 donations (PayPal.Me). Freemium/subscriptions can replace this in v2. */
export const DONATE_URL = 'https://paypal.me/OlusegunOmilabu641'
export const DONATE_LABEL = 'Donate'

/** Footer / marketing credit on public wedding sites + landing. */
export function productBuiltWithCredit() {
  return `Built with ${PRODUCT_NAME}`
}

export const ADMIN_PREVIEW_NAV_LABELS = [
  'Overview',
  'Guests',
  'RSVPs',
  'Story',
  'Photos',
  'Guest photos',
  'Registry',
  'Website',
] as const

export type AdminNavItem = {
  to:
    | '/admin'
    | '/admin/settings'
    | '/admin/pages'
    | '/admin/media'
    | '/admin/guests'
    | '/admin/registry'
    | '/admin/activity'
    | '/admin/admins'
    | '/admin/onboarding'
    | '/admin/profile'
    | '/admin/support'
    | '/admin/feedback'
  label: string
  exact: boolean
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { to: '/admin', label: 'Overview', exact: true },
  { to: '/admin/settings', label: 'Wedding settings', exact: false },
  { to: '/admin/pages', label: 'Page content', exact: false },
  { to: '/admin/media', label: 'Media', exact: false },
  { to: '/admin/guests', label: 'Guests', exact: false },
  { to: '/admin/registry', label: 'Registry', exact: false },
  { to: '/admin/activity', label: 'Activity', exact: false },
]

export const ADMIN_SUPER_NAV_ITEMS: readonly AdminNavItem[] = [
  { to: '/admin/admins', label: 'Admins', exact: false },
]

/** Super-admin only; always rendered last in the sidebar. */
export const ADMIN_BACKLOG_NAV_ITEM: AdminNavItem = {
  to: '/admin/feedback',
  label: 'Backlog',
  exact: false,
}

export const ADMIN_ACCOUNT_NAV_ITEMS: readonly AdminNavItem[] = [
  { to: '/admin/profile', label: 'Profile', exact: false },
]

export const ADMIN_SUPPORT_NAV_ITEM: AdminNavItem = {
  to: '/admin/support',
  label: 'Support',
  exact: false,
}

export function getAdminNavItems(
  isSuperAdmin: boolean,
  options?: { hasWedding?: boolean },
): AdminNavItem[] {
  const hasWedding = options?.hasWedding ?? true
  const items: AdminNavItem[] = []

  if (!hasWedding) {
    items.push(
      { to: '/admin', label: 'Overview', exact: true },
      { to: '/admin/onboarding', label: 'Wedding settings', exact: false },
    )
  } else {
    items.push(...ADMIN_NAV_ITEMS)
  }

  if (isSuperAdmin) {
    items.push(...ADMIN_SUPER_NAV_ITEMS)
  } else {
    items.push(ADMIN_SUPPORT_NAV_ITEM)
  }

  items.push(...ADMIN_ACCOUNT_NAV_ITEMS)

  if (isSuperAdmin) {
    items.push(ADMIN_BACKLOG_NAV_ITEM)
  }

  return items
}

export function formatCoupleNames(groomName: string, brideName: string) {
  return `${groomName} & ${brideName}`
}

export const COLOR_MODES = ['light', 'dark'] as const
