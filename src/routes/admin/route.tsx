import { Outlet, createFileRoute, redirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { AdminShell } from '@/components/admin-shell'
import { AdminOutletPending, RoutePending } from '@/components/route-pending'
import { isSuperAdminProfile } from '@/lib/auth/roles'
import {
  clearClientAdminSession,
  getClientAdminSession,
  logoutAdmin,
  readAdminSession,
} from '@/lib/auth/session'
import { hasCompleteAdminName } from '@/lib/auth/types'
import type { AdminSession } from '@/lib/auth/types'

function isPublicAdminPath(pathname: string) {
  return pathname === '/admin/login' || pathname.startsWith('/admin/invite/')
}

export const Route = createFileRoute('/admin')({
  // Child page changes keep this layout matched. Do not refetch the session
  // or swap the shell for a pending state.
  shouldReload: false,
  pendingComponent: AdminPending,
  beforeLoad: async ({
    location,
  }): Promise<{ session: AdminSession | null }> => {
    if (isPublicAdminPath(location.pathname)) {
      return { session: null }
    }

    const session = await readAdminSession()
    if (!session) {
      throw redirect({ to: '/admin/login' })
    }

    const isSuper = isSuperAdminProfile(session.profile)
    const isProfile = location.pathname === '/admin/profile'
    const isSupport = location.pathname === '/admin/support'
    const isFeedback = location.pathname === '/admin/feedback'
    const isOnboarding = location.pathname === '/admin/onboarding'
    const hasName = hasCompleteAdminName(session.profile)
    const hasWedding = Boolean(session.wedding)

    if (!isSuper && !hasName && !isProfile) {
      throw redirect({ to: '/admin/profile' })
    }

    if (isSuper && isSupport) {
      throw redirect({ to: '/admin' })
    }

    if (!isSuper && isFeedback) {
      throw redirect({ to: '/admin' })
    }

    if (!hasWedding && !isSuper && !isOnboarding && hasName && !isProfile) {
      throw redirect({ to: '/admin/onboarding' })
    }

    if (hasWedding && isOnboarding) {
      throw redirect({ to: '/admin' })
    }

    return { session }
  },
  component: AdminLayout,
})

function AdminChrome({
  session,
  children,
}: {
  session: AdminSession
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const onLogout = async () => {
    setIsLoggingOut(true)
    try {
      clearClientAdminSession()
      await logoutAdmin()
      await navigate({ to: '/admin/login' })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <AdminShell
      session={session}
      onLogout={onLogout}
      isLoggingOut={isLoggingOut}
    >
      {children}
    </AdminShell>
  )
}

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { session } = Route.useRouteContext()

  if (isPublicAdminPath(pathname) || !session) {
    return <Outlet />
  }

  return (
    <AdminChrome session={session}>
      <Outlet />
    </AdminChrome>
  )
}

/** Shown if this layout itself is pending. The sidebar stays up. */
function AdminPending() {
  const session = getClientAdminSession()
  if (!session) return <RoutePending />

  return (
    <AdminChrome session={session}>
      <AdminOutletPending />
    </AdminChrome>
  )
}
