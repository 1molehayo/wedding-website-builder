import { createServerFn } from '@tanstack/react-start'
import { normalizeAdminEmail } from '@/lib/auth/roles'
import type { AdminSession } from '@/lib/auth/types'

export type { AdminSession }

export const getAdminSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminSession | null> => {
    const { getAdminSessionHandler } = await import('./session.server')
    return getAdminSessionHandler()
  },
)

/**
 * Client-only copy of the last admin session. Child page changes must not
 * wait on a fresh session round-trip or the admin layout is replaced by the
 * full-page spinner. Never read this on the server (it would leak across
 * requests). Cleared on logout and after profile / wedding changes.
 */
let clientAdminSession: AdminSession | null = null

export function getClientAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null
  return clientAdminSession
}

export function clearClientAdminSession() {
  clientAdminSession = null
}

export async function readAdminSession(): Promise<AdminSession | null> {
  if (typeof window !== 'undefined' && clientAdminSession) {
    return clientAdminSession
  }
  const session = await getAdminSession()
  if (typeof window !== 'undefined' && session) {
    clientAdminSession = session
  }
  return session
}

export const requestAdminOtp = createServerFn({ method: 'POST' })
  .validator((data: { email: string }) => {
    const email = normalizeAdminEmail(data.email)
    if (!email || !email.includes('@')) {
      throw new Error('A valid email is required.')
    }
    return { email }
  })
  .handler(async ({ data }): Promise<{ ok: true; email: string }> => {
    const { requestAdminOtpHandler } = await import('./session.server')
    return requestAdminOtpHandler(data.email)
  })

export const verifyAdminOtp = createServerFn({ method: 'POST' })
  .validator((data: { email: string; token: string }) => {
    const email = normalizeAdminEmail(data.email)
    const token = data.token.trim()
    if (!email || !email.includes('@')) {
      throw new Error('A valid email is required.')
    }
    if (!/^\d{6,8}$/.test(token)) {
      throw new Error('Enter the one-time code from your email.')
    }
    return { email, token }
  })
  .handler(async ({ data }): Promise<AdminSession> => {
    const { verifyAdminOtpHandler } = await import('./session.server')
    return verifyAdminOtpHandler(data)
  })

export const logoutAdmin = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { logoutAdminHandler } = await import('./session.server')
    return logoutAdminHandler()
  },
)
