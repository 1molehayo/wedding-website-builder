import type { AdminProfile, AdminRole } from '@/lib/supabase/types'

/**
 * Server-only production super-admin email (`PRODUCTION_SUPER_ADMIN_EMAIL`).
 * Never use a `VITE_` prefix — must not ship to the browser bundle.
 */
function readProductionSuperAdminEmail(): string | undefined {
  if (typeof process === 'undefined') return undefined
  const value = process.env.PRODUCTION_SUPER_ADMIN_EMAIL?.trim()
  return value ? normalizeAdminEmail(value) : undefined
}

/**
 * Production super admin from server env. Throws if unset (fail closed).
 * Local Mailpit auth uses {@link LOCAL_SUPER_ADMIN_EMAIL} instead.
 */
export function getProductionSuperAdminEmail(): string {
  const email = readProductionSuperAdminEmail()
  if (!email) {
    throw new Error(
      'Missing PRODUCTION_SUPER_ADMIN_EMAIL (server-only). Set it in .env / Vercel Environment Variables.',
    )
  }
  return email
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

export function getSuperAdminEmail(isLocal: boolean): string {
  return isLocal ? LOCAL_SUPER_ADMIN_EMAIL : getProductionSuperAdminEmail()
}

export function isSuperAdminEmail(
  email?: string | null,
  isLocal = false,
): boolean {
  if (!email) return false
  return normalizeAdminEmail(email) === getSuperAdminEmail(isLocal)
}

/** Either environment's super-admin address (cannot be invited/removed). */
export function isReservedSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const normalized = normalizeAdminEmail(email)
  if (normalized === LOCAL_SUPER_ADMIN_EMAIL) return true
  const production = readProductionSuperAdminEmail()
  return production !== undefined && normalized === production
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
