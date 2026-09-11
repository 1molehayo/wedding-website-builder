import { useEffect, useMemo, useRef } from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { PRODUCT_SHORT_NAME, PRODUCT_TAGLINE } from '@/lib/constants'
import { reportClientError } from '@/lib/errors/report-client-error'
import {
  isAbortError,
  logRouteError,
  normalizeRouteError,
  toClientErrorReport,
} from '@/lib/errors/route-error'
import type { RouteError, RouteErrorCode } from '@/lib/errors/route-error'

type ErrorAction = {
  to: '/' | '/admin' | '/admin/login'
  label: string
}

type AppErrorContentProps = {
  status: 403 | 404 | 500
  title: string
  message: string
  errorId?: string
  onRetry?: () => void
  actions: ErrorAction[]
}

export function AppErrorContent({
  status,
  title,
  message,
  errorId,
  onRetry,
  actions,
}: AppErrorContentProps) {
  return (
    <div className="bg-background text-foreground flex min-h-dvh w-full items-center justify-center px-6 py-16">
      <div className="flex max-w-lg flex-col items-center text-center">
        <p className="font-serif text-2xl italic">{PRODUCT_SHORT_NAME}</p>
        <p className="text-foreground-secondary mt-1 text-[0.65rem] tracking-[0.2em] uppercase">
          {PRODUCT_TAGLINE}
        </p>

        <p className="public-kicker mt-10 mb-6">{status}</p>
        <h1 className="public-section-title">{title}</h1>
        <p className="text-foreground-secondary mt-4 text-sm leading-relaxed">
          {message}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          {actions.map((action, index) => (
            <Button
              key={action.to}
              asChild
              variant={index === 0 ? 'primary' : 'outline'}
            >
              <Link to={action.to}>{action.label}</Link>
            </Button>
          ))}
        </div>

        {errorId ? (
          <p className="text-foreground-secondary mt-10 text-xs tracking-wide">
            Reference: {errorId}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function actionsForCode(
  code: RouteErrorCode,
  isAdminPath: boolean,
): ErrorAction[] {
  switch (code) {
    case 'UNAUTHORIZED':
      return [{ to: '/admin/login', label: 'Sign in' }]
    case 'ADMIN_FORBIDDEN':
    case 'FORBIDDEN':
      return [{ to: '/admin', label: 'Back to admin' }]
    case 'NOT_FOUND':
    case 'INTERNAL':
    default:
      return [
        {
          to: isAdminPath ? '/admin' : '/',
          label: isAdminPath ? 'Back to admin' : 'Back home',
        },
      ]
  }
}

function contentFromRouteError(
  routeError: RouteError,
  isAdminPath: boolean,
  onRetry?: () => void,
): AppErrorContentProps {
  return {
    status: routeError.status,
    title: routeError.publicTitle,
    message: routeError.publicMessage,
    errorId: routeError.errorId,
    onRetry: routeError.status === 500 ? onRetry : undefined,
    actions: actionsForCode(routeError.code, isAdminPath),
  }
}

/** Unknown routes — same visual language as other access errors. */
export function NotFoundPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAdminPath =
    pathname.startsWith('/admin') && pathname !== '/admin/login'

  return (
    <AppErrorContent
      status={404}
      title="Page not found"
      message="That link doesn't match anything on this site."
      actions={[
        {
          to: isAdminPath ? '/admin' : '/',
          label: isAdminPath ? 'Back to admin' : 'Back home',
        },
      ]}
    />
  )
}

/**
 * Route-level failures only (loaders / beforeLoad).
 * Form and server-action failures should keep using toasts.
 */
export function AppRouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (isAbortError(error)) {
    return null
  }
  const routeError = useMemo(() => normalizeRouteError(error), [error])
  const isAdminPath =
    pathname.startsWith('/admin') && pathname !== '/admin/login'
  const reportedId = useRef<string | null>(null)

  useEffect(() => {
    // Browser console (FE debugging)
    logRouteError(routeError, error, {
      source: 'client',
      pathname,
    })

    // Mirror into Vercel Runtime Logs with the same errorId
    if (reportedId.current === routeError.errorId) return
    reportedId.current = routeError.errorId

    void reportClientError({
      data: toClientErrorReport(routeError, { pathname, original: error }),
    }).catch((reportError) => {
      console.error('[RouteError] failed to report client error to server', {
        errorId: routeError.errorId,
        reportError,
      })
    })
  }, [error, pathname, routeError])

  const onRetry = () => {
    reset()
    void router.invalidate()
  }

  return (
    <AppErrorContent
      {...contentFromRouteError(routeError, isAdminPath, onRetry)}
    />
  )
}
