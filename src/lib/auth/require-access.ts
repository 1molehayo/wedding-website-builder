import { isSuperAdminProfile } from '@/lib/auth/roles'
import type { AdminSession } from '@/lib/auth/types'
import {
  forbidden,
  raiseRouteError,
  unauthorized,
} from '@/lib/errors/route-error'

/**
 * Page-access gate for super-admin-only routes.
 * Throws RouteError (403) — do not use inside form/server-action handlers.
 */
export function requireSuperAdmin(session: AdminSession | null): AdminSession {
  if (!session) {
    throw raiseRouteError(
      unauthorized({
        message: 'Unauthenticated access attempt to a super-admin route',
      }),
      { source: 'server', pathname: '/admin/admins' },
    )
  }

  if (!isSuperAdminProfile(session.profile)) {
    throw raiseRouteError(
      forbidden({
        code: 'ADMIN_FORBIDDEN',
        message: `User ${session.user.id} (${session.profile.role}) blocked from super-admin route`,
      }),
      {
        source: 'server',
        pathname: '/admin/admins',
        extra: { userId: session.user.id, role: session.profile.role },
      },
    )
  }

  return session
}
