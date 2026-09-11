import type { AdminProfile, AdminRole } from '@/lib/supabase/types'

/** Production super admin — hardcoded by product decision. */
export const PRODUCTION_SUPER_ADMIN_EMAIL = 'omilabuolusegun@gmail.com'

/** Local-only Mailpit test accounts (never used in production Auth rules). */
export const LOCAL_SUPER_ADMIN_EMAIL = 'superadmin@supabase.com'
export const LOCAL_ADMIN_EMAIL = 'admin@supabase.com'

export const LOCAL_ALLOWED_EMAILS = [
  LOCAL_SUPER_ADMIN_EMAIL,
  LOCAL_ADMIN_EMAIL,
] as const

/** @deprecated Prefer PRODUCTION_SUPER_ADMIN_EMAIL or getSuperAdminEmail(). */
export const SUPER_ADMIN_EMAIL = PRODUCTION_SUPER_ADMIN_EMAIL

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getSuperAdminEmail(isLocal: boolean): string {
  return isLocal ? LOCAL_SUPER_ADMIN_EMAIL : PRODUCTION_SUPER_ADMIN_EMAIL
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
  return (
    normalized === PRODUCTION_SUPER_ADMIN_EMAIL ||
    normalized === LOCAL_SUPER_ADMIN_EMAIL
  )
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
