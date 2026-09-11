import { createServerFn } from '@tanstack/react-start'
import type { ClientErrorReport } from '@/lib/errors/route-error'

function isClientErrorReport(data: unknown): data is ClientErrorReport {
  if (!data || typeof data !== 'object') return false
  const report = data as Record<string, unknown>
  return (
    typeof report.errorId === 'string' &&
    typeof report.code === 'string' &&
    typeof report.status === 'number' &&
    typeof report.message === 'string'
  )
}

/**
 * Mirrors a browser-side route error into Vercel Runtime Logs.
 * Search logs by the same `errorId` shown as Reference on the page.
 */
export const reportClientError = createServerFn({ method: 'POST' })
  .validator((data: unknown): ClientErrorReport => {
    if (!isClientErrorReport(data)) {
      throw new Error('Invalid client error report payload.')
    }
    return {
      errorId: data.errorId.slice(0, 64),
      code: data.code,
      status: data.status,
      message: data.message.slice(0, 2000),
      pathname:
        typeof data.pathname === 'string'
          ? data.pathname.slice(0, 500)
          : undefined,
      stack:
        typeof data.stack === 'string' ? data.stack.slice(0, 4000) : undefined,
      causeName:
        typeof data.causeName === 'string'
          ? data.causeName.slice(0, 200)
          : undefined,
      causeMessage:
        typeof data.causeMessage === 'string'
          ? data.causeMessage.slice(0, 2000)
          : undefined,
      causeStack:
        typeof data.causeStack === 'string'
          ? data.causeStack.slice(0, 4000)
          : undefined,
    }
  })
  .handler(async ({ data }) => {
    const { logAppError } = await import('@/lib/errors/logger')
    logAppError({
      kind: 'RouteError',
      level: 'error',
      errorId: data.errorId,
      code: data.code,
      status: data.status,
      message: data.message,
      source: 'client',
      pathname: data.pathname,
      stack: data.stack,
      causeName: data.causeName,
      causeMessage: data.causeMessage,
      causeStack: data.causeStack,
    })
    return { ok: true as const, errorId: data.errorId }
  })
