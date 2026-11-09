import type { AdminProfile, AdminRole } from '@/lib/supabase/types'

/**
 * Server-only production super-admin emails (`PRODUCTION_SUPER_ADMIN_EMAIL`).
 * Comma-separated list is supported. Never use a `VITE_` prefix — must not
 * ship to the browser bundle.
 */
function readProductionSuperAdminEmails(): string[] {
  if (typeof process === 'undefined') return []
  const value = process.env.PRODUCTION_SUPER_ADMIN_EMAIL?.trim()
  if (!value) return []

  return [
    ...new Set(
      value
        .split(',')
        .map((part) => normalizeAdminEmail(part))
        .filter((email) => email.length > 0),
    ),
  ]
}

/**
 * Production super admins from server env. Throws if unset (fail closed).
 * Local Mailpit auth uses {@link LOCAL_SUPER_ADMIN_EMAIL} instead.
 */
export function getProductionSuperAdminEmails(): string[] {
  const emails = readProductionSuperAdminEmails()
  if (emails.length === 0) {
    throw new Error(
      'Missing PRODUCTION_SUPER_ADMIN_EMAIL (server-only). Set it in .env / Vercel Environment Variables.',
    )
  }
  return emails
}

/** First configured production super-admin email. */
export function getProductionSuperAdminEmail(): string {
  return getProductionSuperAdminEmails()[0]
}

/** Local-only Mailpit test accounts (never used in production Auth rules). */
export const LOCAL_SUPER_ADMIN_EMAIL = 'superadmin@supabase.com'
export const LOCAL_ADMIN_EMAIL = 'admin@supabase.com'

export const LOCAL_ALLOWED_EMAILS = [
  LOCAL_SUPER_ADMIN_EMAIL,
  LOCAL_ADMIN_EMAIL,
] as const

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getSuperAdminEmails(isLocal: boolean): string[] {
  return isLocal ? [LOCAL_SUPER_ADMIN_EMAIL] : getProductionSuperAdminEmails()
}

export function getSuperAdminEmail(isLocal: boolean): string {
  return getSuperAdminEmails(isLocal)[0]
}

export function isSuperAdminEmail(
  email?: string | null,
  isLocal = false,
): boolean {
  if (!email) return false
  return getSuperAdminEmails(isLocal).includes(normalizeAdminEmail(email))
}

/** Any environment's super-admin address (cannot be invited/removed). */
export function isReservedSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const normalized = normalizeAdminEmail(email)
  if (normalized === LOCAL_SUPER_ADMIN_EMAIL) return true
  return readProductionSuperAdminEmails().includes(normalized)
}

export function isLocalAllowedEmail(email: string): boolean {
  const normalized = normalizeAdminEmail(email)
  return (LOCAL_ALLOWED_EMAILS as readonly string[]).includes(normalized)
}

/** Auto-create profile role for the two local test emails only. */
export function getLocalBootstrapRole(email: string): AdminRole | null {
  const normalized = normalizeAdminEmail(email)
  if (normalized === LOCAL_SUPER_ADMIN_EMAIL) return 'super_admin'
  if (normalized === LOCAL_ADMIN_EMAIL) return 'admin'
  return null
}

export function isSuperAdminProfile(
  profile: Pick<AdminProfile, 'role'>,
): boolean {
  return profile.role === 'super_admin'
}
