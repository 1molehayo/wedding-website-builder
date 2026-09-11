import {
  isReservedSuperAdminEmail,
  isSuperAdminProfile,
  normalizeAdminEmail,
} from '@/lib/auth/roles'
import {
  requireAdminSession,
  requireSuperAdminSession,
} from '@/lib/auth/session.server'
import { adminFullName, deriveAdminStatus } from '@/lib/auth/types'
import type { AdminListItem } from '@/lib/auth/types'
import { formatCoupleNames } from '@/lib/constants'
import {
  sendAdminInviteEmail,
  sendAdminRemovedConfirmationEmail,
  sendAdminRemovedEmail,
  sendInviteAcceptedEmail,
} from '@/lib/email/resend.server'
import {
  adminInviteAcceptUrl,
  newInviteToken,
} from '@/lib/email/templates'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import { createServerSupabaseClient } from '@/lib/supabase/server.server'

const ADMIN_LIST_SELECT =
  'id, email, first_name, last_name, display_name, role, wedding_id, deletion_requested_at, deletion_reason, invite_token, invited_at, invite_accepted_at, cancelled_at, created_at'

type AdminProfileRow = Omit<AdminListItem, 'last_sign_in_at' | 'status'> & {
  wedding_id?: string | null
}

async function withAuthSignInTimes(
  rows: AdminProfileRow[],
): Promise<AdminListItem[]> {
  if (rows.length === 0) return []

  const admin = createAdminSupabaseClient()
  const signInById = new Map<string, string | null>()
  const wanted = new Set(rows.map((row) => row.id))

  // One (paginated) Auth list instead of N getUserById calls — keeps /admin/admins fast
  // so intent-preload is less likely to abort mid-flight and flash the error page.
  let page = 1
  const perPage = 200
  while (signInById.size < wanted.size && page <= 10) {
    const result = await admin.auth.admin.listUsers({ page, perPage })
    if (result.error) {
      break
    }
    for (const user of result.data.users) {
      if (wanted.has(user.id)) {
        signInById.set(user.id, user.last_sign_in_at ?? null)
      }
    }
    if (result.data.users.length < perPage) break
    page += 1
  }

  return rows.map((row) => {
    const last_sign_in_at = signInById.get(row.id) ?? null
    const { wedding_id: _weddingId, ...rest } = row
    return {
      ...rest,
      last_sign_in_at,
      status: deriveAdminStatus({
        deletion_requested_at: row.deletion_requested_at,
        cancelled_at: row.cancelled_at,
        invite_accepted_at: row.invite_accepted_at,
        last_sign_in_at,
      }),
    }
  })
}

async function coupleLabelForWeddingId(
  weddingId: string | null,
): Promise<string | null> {
  if (!weddingId) return null
  const admin = createAdminSupabaseClient()
  const result = await admin
    .from('weddings')
    .select('groom_name, bride_name')
    .eq('id', weddingId)
    .maybeSingle()
  if (result.error || !result.data) return null
  return formatCoupleNames(result.data.groom_name, result.data.bride_name)
}

async function sendInviteForProfile(
  profile: AdminProfileRow & { wedding_id?: string | null },
) {
  if (!profile.email || !profile.invite_token) {
    throw new Error('Invite cannot be sent without email and token.')
  }
  const acceptUrl = adminInviteAcceptUrl(profile.invite_token)
  const coupleLabel = await coupleLabelForWeddingId(profile.wedding_id ?? null)

  await sendAdminInviteEmail({
    to: profile.email,
    adminName: adminFullName(profile),
    acceptUrl,
    coupleLabel,
  })
}

export async function listAdminsHandler(): Promise<AdminListItem[]> {
  await requireSuperAdminSession()
  const admin = createAdminSupabaseClient()
  const result = await admin
    .from('admin_profiles')
    .select(ADMIN_LIST_SELECT)
    .order('created_at', { ascending: true })

  if (result.error) {
    throw new Error(result.error.message)
  }

  return withAuthSignInTimes(result.data)
}

export async function inviteAdminHandler(input: {
  email: string
  firstName: string
  lastName: string
}): Promise<AdminListItem> {
  const session = await requireSuperAdminSession()
  const admin = createAdminSupabaseClient()
  const email = normalizeAdminEmail(input.email)

  const existing = await admin
    .from('admin_profiles')
    .select(ADMIN_LIST_SELECT)
    .eq('email', email)
    .maybeSingle()

  if (existing.error) {
    throw new Error(existing.error.message)
  }

  if (existing.data) {
    if (!existing.data.cancelled_at) {
      throw new Error('An admin with this email already exists.')
    }
    return reinviteAdminHandler(existing.data.id, {
      firstName: input.firstName,
      lastName: input.lastName,
    })
  }

  const inviteToken = newInviteToken()
  const invitedAt = new Date().toISOString()

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `${crypto.randomUUID()}A1!`,
  })

  if (created.error) {
    throw new Error(created.error.message)
  }

  const userId = created.data.user.id

  const inserted = await admin
    .from('admin_profiles')
    .insert({
      id: userId,
      wedding_id: session.wedding?.id ?? null,
      first_name: input.firstName,
      last_name: input.lastName,
      display_name: input.firstName,
      email,
      role: 'admin',
      invite_token: inviteToken,
      invited_at: invitedAt,
      invite_accepted_at: null,
      cancelled_at: null,
    })
    .select(ADMIN_LIST_SELECT)
    .single()

  if (inserted.error) {
    await admin.auth.admin.deleteUser(userId)
    throw new Error(inserted.error.message)
  }

  try {
    await sendInviteForProfile(inserted.data)
  } catch (error) {
    await admin.from('admin_profiles').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
    throw error instanceof Error
      ? error
      : new Error('Unable to send invite email.')
  }

  return (await withAuthSignInTimes([inserted.data]))[0]
}

export async function resendAdminInviteHandler(
  adminId: string,
): Promise<AdminListItem> {
  await requireSuperAdminSession()
  const admin = createAdminSupabaseClient()

  const existing = await admin
    .from('admin_profiles')
    .select(ADMIN_LIST_SELECT)
    .eq('id', adminId)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Admin not found.')
  if (existing.data.role === 'super_admin') {
    throw new Error('Cannot resend invite for the super admin.')
  }
  if (existing.data.cancelled_at) {
    throw new Error('This invite was cancelled. Send a new invitation instead.')
  }
  if (existing.data.invite_accepted_at) {
    throw new Error('This admin has already accepted their invite.')
  }

  const inviteToken = existing.data.invite_token ?? newInviteToken()
  const updated = await admin
    .from('admin_profiles')
    .update({
      invite_token: inviteToken,
      invited_at: new Date().toISOString(),
    })
    .eq('id', adminId)
    .select(ADMIN_LIST_SELECT)
    .single()

  if (updated.error) throw new Error(updated.error.message)

  await sendInviteForProfile(updated.data)
  return (await withAuthSignInTimes([updated.data]))[0]
}

export async function cancelAdminInviteHandler(
  adminId: string,
): Promise<AdminListItem> {
  await requireSuperAdminSession()
  const admin = createAdminSupabaseClient()

  const existing = await admin
    .from('admin_profiles')
    .select(ADMIN_LIST_SELECT)
    .eq('id', adminId)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Admin not found.')
  if (existing.data.role === 'super_admin') {
    throw new Error('Cannot cancel the super admin.')
  }
  if (existing.data.invite_accepted_at) {
    throw new Error('Accepted invites cannot be cancelled. Delete the admin instead.')
  }
  if (existing.data.cancelled_at) {
    return (await withAuthSignInTimes([existing.data]))[0]
  }

  const updated = await admin
    .from('admin_profiles')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', adminId)
    .select(ADMIN_LIST_SELECT)
    .single()

  if (updated.error) throw new Error(updated.error.message)
  return (await withAuthSignInTimes([updated.data]))[0]
}

export async function reinviteAdminHandler(
  adminId: string,
  names?: { firstName: string; lastName: string },
): Promise<AdminListItem> {
  await requireSuperAdminSession()
  const admin = createAdminSupabaseClient()

  const existing = await admin
    .from('admin_profiles')
    .select(ADMIN_LIST_SELECT)
    .eq('id', adminId)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Admin not found.')
  if (!existing.data.cancelled_at) {
    throw new Error('Only cancelled invites can be re-sent this way.')
  }

  const inviteToken = newInviteToken()
  const updated = await admin
    .from('admin_profiles')
    .update({
      cancelled_at: null,
      invite_accepted_at: null,
      invite_token: inviteToken,
      invited_at: new Date().toISOString(),
      deletion_requested_at: null,
      deletion_reason: null,
      ...(names
        ? {
            first_name: names.firstName,
            last_name: names.lastName,
            display_name: names.firstName,
          }
        : {}),
    })
    .eq('id', adminId)
    .select(ADMIN_LIST_SELECT)
    .single()

  if (updated.error) throw new Error(updated.error.message)

  await sendInviteForProfile(updated.data)
  return (await withAuthSignInTimes([updated.data]))[0]
}

export async function updateAdminNamesHandler(
  adminId: string,
  input: { firstName: string; lastName: string },
): Promise<AdminListItem> {
  const session = await requireSuperAdminSession()
  const admin = createAdminSupabaseClient()

  const existing = await admin
    .from('admin_profiles')
    .select(ADMIN_LIST_SELECT)
    .eq('id', adminId)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Admin not found.')

  if (
    existing.data.role === 'super_admin' &&
    existing.data.id !== session.user.id
  ) {
    throw new Error('Cannot edit another super admin.')
  }

  const updated = await admin
    .from('admin_profiles')
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      display_name: input.firstName,
    })
    .eq('id', adminId)
    .select(ADMIN_LIST_SELECT)
    .single()

  if (updated.error) throw new Error(updated.error.message)
  return (await withAuthSignInTimes([updated.data]))[0]
}

export async function removeAdminHandler(adminId: string) {
  const session = await requireSuperAdminSession()

  if (adminId === session.user.id) {
    throw new Error('You cannot remove your own admin account.')
  }

  const admin = createAdminSupabaseClient()
  const existing = await admin
    .from('admin_profiles')
    .select('*')
    .eq('id', adminId)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Admin not found.')

  const profile = existing.data

  if (
    isSuperAdminProfile(profile) ||
    isReservedSuperAdminEmail(profile.email)
  ) {
    throw new Error('The super admin cannot be removed.')
  }

  const archiveReason = profile.deletion_requested_at
    ? 'Approved deletion request'
    : 'Removed by super admin'

  const archived = await admin.from('archived_admins').insert({
    original_user_id: profile.id,
    email: profile.email ?? 'unknown',
    first_name: profile.first_name,
    last_name: profile.last_name,
    display_name: profile.display_name,
    phone: profile.phone,
    role: profile.role,
    wedding_id: profile.wedding_id,
    deletion_requested_at: profile.deletion_requested_at,
    deletion_reason: profile.deletion_reason,
    invite_token: profile.invite_token,
    invited_at: profile.invited_at,
    invite_accepted_at: profile.invite_accepted_at,
    cancelled_at: profile.cancelled_at,
    profile_created_at: profile.created_at,
    profile_updated_at: profile.updated_at,
    archived_by: session.user.id,
    archive_reason: archiveReason,
  })

  if (archived.error) throw new Error(archived.error.message)

  const deletedProfile = await admin
    .from('admin_profiles')
    .delete()
    .eq('id', adminId)

  if (deletedProfile.error) throw new Error(deletedProfile.error.message)

  const deletedUser = await admin.auth.admin.deleteUser(adminId)
  if (deletedUser.error) throw new Error(deletedUser.error.message)

  const coupleLabel = session.wedding
    ? formatCoupleNames(session.wedding.groom_name, session.wedding.bride_name)
    : await coupleLabelForWeddingId(profile.wedding_id)

  const adminName = adminFullName(profile)
  const adminEmail = profile.email

  try {
    if (adminEmail) {
      await sendAdminRemovedEmail({
        to: adminEmail,
        adminName,
        coupleLabel,
      })
    }
    const actorEmail = session.profile.email ?? session.user.email
    if (actorEmail) {
      await sendAdminRemovedConfirmationEmail({
        to: actorEmail,
        removedAdminName: adminName,
        removedAdminEmail: adminEmail ?? 'unknown',
        coupleLabel,
      })
    }
  } catch (error) {
    console.error('[AdminRemove] notification email failed', error)
  }

  return { ok: true as const }
}

export async function acceptAdminInviteHandler(token: string): Promise<{
  redirectTo: '/admin' | '/admin/onboarding' | '/admin/profile'
}> {
  const normalized = token.trim()
  if (!normalized) throw new Error('Invite link is invalid.')

  const admin = createAdminSupabaseClient()
  const existing = await admin
    .from('admin_profiles')
    .select('*')
    .eq('invite_token', normalized)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('This invite link is invalid or expired.')
  if (existing.data.cancelled_at) {
    throw new Error('This invitation was cancelled.')
  }

  const profile = existing.data
  const alreadyAccepted = Boolean(profile.invite_accepted_at)

  if (!alreadyAccepted) {
    const updated = await admin
      .from('admin_profiles')
      .update({ invite_accepted_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select('*')
      .single()

    if (updated.error) throw new Error(updated.error.message)

    const coupleLabel = await coupleLabelForWeddingId(profile.wedding_id)
    try {
      await sendInviteAcceptedEmail({
        adminName: adminFullName(updated.data),
        adminEmail: updated.data.email ?? 'unknown',
        coupleLabel,
      })
    } catch (error) {
      console.error('[InviteAccept] notify super admin failed', error)
    }
  }

  if (!profile.email) {
    throw new Error('Invite is missing an email address.')
  }

  const link = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: profile.email,
  })

  if (link.error) throw new Error(link.error.message)

  const hashedToken = link.data.properties.hashed_token
  if (!hashedToken) {
    throw new Error('Unable to establish a session from this invite.')
  }

  const supabase = createServerSupabaseClient()
  const verified = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hashedToken,
  })

  if (verified.error) throw new Error(verified.error.message)

  const session = await requireAdminSession()
  const hasName =
    Boolean(session.profile.first_name?.trim()) &&
    Boolean(session.profile.last_name?.trim())
  const isSuper = isSuperAdminProfile(session.profile)

  if (!isSuper && !hasName) {
    return { redirectTo: '/admin/profile' }
  }
  if (!session.wedding && !isSuper) {
    return { redirectTo: '/admin/onboarding' }
  }
  return { redirectTo: '/admin' }
}
