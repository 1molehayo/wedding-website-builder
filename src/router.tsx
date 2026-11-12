import {
  useRouterState,
  createRouter as createTanStackRouter,
} from '@tanstack/react-router'
import { AppRouteError, NotFoundPage } from '@/components/app-error-page'
import { AdminOutletPending, RoutePending } from '@/components/route-pending'
import { createAppQueryClient } from '@/lib/query/query-client'
import { routeTree } from './routeTree.gen'

function DefaultPending() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isDashboard =
    pathname.startsWith('/admin') &&
    pathname !== '/admin/login' &&
    !pathname.startsWith('/admin/invite/')

  if (isDashboard) {
    return <AdminOutletPending />
  }

  return <RoutePending />
}

export function getRouter() {
  const queryClient = createAppQueryClient()

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: false,
    // Drop stale loader shells so revisits do not flash outdated error/pending UI.
    defaultGcTime: 0,
    notFoundMode: 'root',
    defaultNotFoundComponent: NotFoundPage,
    defaultErrorComponent: AppRouteError,
    defaultPendingComponent: DefaultPending,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
