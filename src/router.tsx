import { useRouterState } from '@tanstack/react-router'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { AppRouteError, NotFoundPage } from '@/components/app-error-page'
import { AdminOutletPending, RoutePending } from '@/components/route-pending'
import { routeTree } from './routeTree.gen'

function DefaultPending() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
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
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: false,
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
