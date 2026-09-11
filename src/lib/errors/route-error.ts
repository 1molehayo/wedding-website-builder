import { isNotFound, isRedirect } from '@tanstack/react-router'
import {
  logAppError,
  serializeUnknownCause,
} from '@/lib/errors/logger'
import type { AppLogSource } from '@/lib/errors/logger'

export function isAbortError(cause: unknown) {
  if (!cause || typeof cause !== 'object') return false
  const name = 'name' in cause ? String(cause.name) : ''
  return name === 'AbortError'
}

/** Navigation cancels and auth redirects must not become the error page. */
export function shouldRethrowRouteFailure(cause: unknown): boolean {
  return isRedirect(cause) || isNotFound(cause) || isAbortError(cause)
}

export type RouteErrorStatus = 403 | 404 | 500

export type RouteErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'ADMIN_FORBIDDEN'
  | 'INTERNAL'

export type RouteErrorCopy = {
  status: RouteErrorStatus
  title: string
  message: string
}

/**
 * Stable code → user copy map (extend as new access errors appear).
 * Technical details stay on `RouteError.message` for logs only.
 */
export const ROUTE_ERROR_COPY: Record<RouteErrorCode, RouteErrorCopy> = {
  NOT_FOUND: {
    status: 404,
    title: 'Page not found',
    message: "That link doesn't match anything on this site.",
  },
  UNAUTHORIZED: {
    status: 403,
    title: 'Sign in required',
    message: 'You need to sign in before you can open this page.',
  },
  FORBIDDEN: {
    status: 403,
    title: 'Access denied',
    message:
      "You don't have permission to view this page. Ask a super admin if you need access.",
  },
  ADMIN_FORBIDDEN: {
    status: 403,
    title: 'Access denied',
    message:
      'Only a super admin can open this page. Ask your super admin if you need access.',
  },
  INTERNAL: {
    status: 500,
    title: 'Something went wrong',
    message:
      'We hit an unexpected problem loading this page. Please try again in a moment.',
  },
}

const ERROR_ID_PREFIX = /^\[(err_[a-z0-9]+_[a-z0-9]+)\]\s([\s\S]*)$/i

export function createErrorId() {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function parseErrorIdPrefix(message: string): {
  errorId?: string
  message: string
} {
  const match = message.match(ERROR_ID_PREFIX)
  if (!match?.[1]) return { message }
  return { errorId: match[1], message: match[2] }
}

export class RouteError extends Error {
  readonly status: RouteErrorStatus
  readonly code: RouteErrorCode
  readonly errorId: string
  readonly publicTitle: string
  readonly publicMessage: string

  constructor(input: {
    status?: RouteErrorStatus
    code: RouteErrorCode
    /** Technical detail for logs — not shown to users. */
    message: string
    publicTitle?: string
    publicMessage?: string
    cause?: unknown
    errorId?: string
  }) {
    const defaults = ROUTE_ERROR_COPY[input.code]
    const errorId = input.errorId ?? createErrorId()
    // Prefix survives some SSR/client serializations that drop custom fields.
    super(`[${errorId}] ${input.message}`, { cause: input.cause })
    this.name = 'RouteError'
    this.status = input.status ?? defaults.status
    this.code = input.code
    this.errorId = errorId
    this.publicTitle = input.publicTitle ?? defaults.title
    this.publicMessage = input.publicMessage ?? defaults.message
  }

  /** Technical message without the `[errorId]` prefix. */
  get technicalMessage(): string {
    return parseErrorIdPrefix(this.message).message
  }
}

export function isRouteError(error: unknown): error is RouteError {
  return error instanceof RouteError
}

export type ClientErrorReport = {
  errorId: string
  code: RouteErrorCode
  status: RouteErrorStatus
  /** Technical debugging message (not the public UI copy). */
  message: string
  pathname?: string
  stack?: string
  causeName?: string
  causeMessage?: string
  causeStack?: string
}

export function toClientErrorReport(
  routeError: RouteError,
  input?: { pathname?: string; original?: unknown },
): ClientErrorReport {
  const cause = serializeUnknownCause(routeError.cause ?? input?.original)
  return {
    errorId: routeError.errorId,
    code: routeError.code,
    status: routeError.status,
    message: routeError.technicalMessage,
    pathname: input?.pathname,
    stack: routeError.stack,
    ...cause,
  }
}

export function unauthorized(input: {
  message: string
  publicTitle?: string
  publicMessage?: string
  cause?: unknown
}) {
  return new RouteError({
    code: 'UNAUTHORIZED',
    message: input.message,
    publicTitle: input.publicTitle,
    publicMessage: input.publicMessage,
    cause: input.cause,
  })
}

export function forbidden(input: {
  code?: Extract<RouteErrorCode, 'FORBIDDEN' | 'ADMIN_FORBIDDEN'>
  message: string
  publicTitle?: string
  publicMessage?: string
  cause?: unknown
}) {
  return new RouteError({
    code: input.code ?? 'FORBIDDEN',
    message: input.message,
    publicTitle: input.publicTitle,
    publicMessage: input.publicMessage,
    cause: input.cause,
  })
}

export function notFoundError(input: {
  message: string
  publicTitle?: string
  publicMessage?: string
  cause?: unknown
}) {
  return new RouteError({
    code: 'NOT_FOUND',
    message: input.message,
    publicTitle: input.publicTitle,
    publicMessage: input.publicMessage,
    cause: input.cause,
  })
}

export function internalError(input: {
  message: string
  publicTitle?: string
  publicMessage?: string
  cause?: unknown
  errorId?: string
}) {
  return new RouteError({
    code: 'INTERNAL',
    message: input.message,
    publicTitle: input.publicTitle,
    publicMessage: input.publicMessage,
    cause: input.cause,
    errorId: input.errorId,
  })
}

function restoreFromUnknown(error: unknown): RouteError | null {
  if (!error || typeof error !== 'object') return null
  const record = error as Record<string, unknown>

  if (record.name === 'RouteError' && typeof record.errorId === 'string') {
    const code =
      typeof record.code === 'string' && record.code in ROUTE_ERROR_COPY
        ? (record.code as RouteErrorCode)
        : 'INTERNAL'
    return new RouteError({
      code,
      status:
        record.status === 403 || record.status === 404 || record.status === 500
          ? record.status
          : undefined,
      message:
        typeof record.message === 'string'
          ? parseErrorIdPrefix(record.message).message
          : 'Restored RouteError',
      errorId: record.errorId,
      publicTitle:
        typeof record.publicTitle === 'string' ? record.publicTitle : undefined,
      publicMessage:
        typeof record.publicMessage === 'string'
          ? record.publicMessage
          : undefined,
      cause: record.cause,
    })
  }

  return null
}

/** Map any thrown value into a RouteError for the page error boundary. */
export function normalizeRouteError(error: unknown): RouteError {
  if (isRouteError(error)) {
    return error
  }

  const restored = restoreFromUnknown(error)
  if (restored) return restored

  if (error instanceof Error) {
    const parsed = parseErrorIdPrefix(error.message)
    return internalError({
      message: parsed.message || 'Unexpected route error',
      errorId: parsed.errorId,
      cause: error,
    })
  }

  return internalError({
    message: 'Unexpected non-Error throw during route load',
    cause: error,
  })
}

export function logRouteError(
  routeError: RouteError,
  original?: unknown,
  context?: {
    source?: AppLogSource
    pathname?: string
    extra?: Record<string, unknown>
  },
) {
  const cause = serializeUnknownCause(routeError.cause ?? original)
  logAppError({
    kind: 'RouteError',
    level: 'error',
    errorId: routeError.errorId,
    code: routeError.code,
    status: routeError.status,
    message: routeError.technicalMessage,
    source: context?.source ?? 'server',
    pathname: context?.pathname,
    stack: routeError.stack,
    extra: context?.extra,
    ...cause,
  })
}

/** Log then return the error for `throw raiseRouteError(...)`. */
export function raiseRouteError(
  routeError: RouteError,
  context?: {
    source?: AppLogSource
    pathname?: string
    extra?: Record<string, unknown>
  },
): RouteError {
  logRouteError(routeError, routeError.cause, {
    source: context?.source ?? 'server',
    pathname: context?.pathname,
    extra: context?.extra,
  })
  return routeError
}
