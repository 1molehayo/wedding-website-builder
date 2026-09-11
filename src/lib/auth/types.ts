import type { AdminProfile, Wedding } from '@/lib/supabase/types'

export type AdminSession = {
  user: {
    id: string
    email: string | undefined
  }
  profile: AdminProfile
  /** Null until onboarding creates the wedding row. */
  wedding: Wedding | null
}

export type AdminAccountStatus =
  | 'active'
  | 'pending'
  | 'deletion_requested'
  | 'cancelled'

export type AdminListItem = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  display_name: string | null
  role: AdminProfile['role']
  deletion_requested_at: string | null
  deletion_reason: string | null
  invite_token: string | null
  invited_at: string | null
  invite_accepted_at: string | null
  cancelled_at: string | null
  created_at: string
  last_sign_in_at: string | null
  status: AdminAccountStatus
}

export const ADMIN_STATUS_LABELS: Record<AdminAccountStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  deletion_requested: 'Deletion requested',
  cancelled: 'Cancelled',
}

export const DEFAULT_VISIBLE_ADMIN_STATUSES: readonly AdminAccountStatus[] = [
  'active',
  'pending',
  'deletion_requested',
] as const

export function deriveAdminStatus(input: {
  deletion_requested_at: string | null
  cancelled_at: string | null
  invite_accepted_at: string | null
  last_sign_in_at: string | null
}): AdminAccountStatus {
  if (input.cancelled_at) return 'cancelled'
  if (input.deletion_requested_at) return 'deletion_requested'
  if (!input.invite_accepted_at) return 'pending'
  return 'active'
}

export function adminFirstName(
  profile: Pick<AdminProfile, 'first_name' | 'display_name'>,
): string {
  const first = profile.first_name?.trim()
  if (first) return first
  const legacy = profile.display_name?.trim()
  if (legacy) return legacy.split(/\s+/)[0] ?? legacy
  return 'Admin'
}

export function adminFullName(
  profile: Pick<AdminProfile, 'first_name' | 'last_name' | 'display_name'>,
): string {
  const first = profile.first_name?.trim()
  const last = profile.last_name?.trim()
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  return profile.display_name?.trim() || 'Admin'
}

export function hasCompleteAdminName(
  profile: Pick<AdminProfile, 'first_name' | 'last_name'>,
): boolean {
  return Boolean(profile.first_name?.trim() && profile.last_name?.trim())
}
