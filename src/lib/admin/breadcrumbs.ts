export type AdminBreadcrumb = {
  label: string
  to?: '/admin' | string
}

const EXACT_LABELS: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/settings': 'Wedding settings',
  '/admin/pages': 'Page content',
  '/admin/media': 'Media',
  '/admin/guests': 'Guests',
  '/admin/registry': 'Registry',
  '/admin/admins': 'Admins',
  '/admin/onboarding': 'Set up wedding',
  '/admin/profile': 'Profile',
  '/admin/support': 'Support',
  '/admin/feedback': 'Backlog',
  '/admin/notifications': 'Notifications',
}

export function adminBreadcrumbs(pathname: string): AdminBreadcrumb[] {
  const path = pathname.replace(/\/$/, '') || '/admin'
  const label = EXACT_LABELS[path]

  if (path === '/admin') {
    return [{ label: 'Overview' }]
  }

  if (label) {
    return [{ label: 'Admin', to: '/admin' }, { label }]
  }

  const segment = path.split('/').filter(Boolean).pop() ?? 'Admin'
  const fallback = segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  return [{ label: 'Admin', to: '/admin' }, { label: fallback }]
}
