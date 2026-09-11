import { isSuperAdminProfile, normalizeAdminEmail } from '@/lib/auth/roles'
import { requireAdminSession } from '@/lib/auth/session.server'
import type { AdminProfile } from '@/lib/supabase/types'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import { formatCoupleNames } from '@/lib/constants'
import {
  sendDeletionRequestEmail,
  sendSupportEmail,
} from '@/lib/email/resend.server'
import {
  assertSupportImage,
  supportCategoryLabel,
} from '@/lib/support/categories'

function requiredName(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${label} is required.`)
  }
  if (trimmed.length > 80) {
    throw new Error(`${label} must be 80 characters or fewer.`)
  }
  return trimmed
}

export async function updateProfileHandler(input: {
  firstName: string
  lastName: string
  phone: string | null
  email?: string
}): Promise<AdminProfile> {
  const session = await requireAdminSession()
  const isSuper = isSuperAdminProfile(session.profile)
  const firstName = requiredName(input.firstName, 'First name')
  const lastName = requiredName(input.lastName, 'Last name')

  let nextEmail = session.profile.email
  if (input.email !== undefined) {
    if (!isSuper) {
      throw new Error('Only the super admin can change email from the app.')
    }
    const email = normalizeAdminEmail(input.email)
    if (!email || !email.includes('@')) {
      throw new Error('A valid email is required.')
    }
    nextEmail = email
  }

  const admin = createAdminSupabaseClient()

  if (isSuper && nextEmail && nextEmail !== session.profile.email) {
    const authUpdated = await admin.auth.admin.updateUserById(session.user.id, {
      email: nextEmail,
      email_confirm: true,
    })
    if (authUpdated.error) {
      throw new Error(authUpdated.error.message)
    }
  }

  const updated = await admin
    .from('admin_profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      display_name: firstName,
      phone: input.phone,
      ...(isSuper && nextEmail ? { email: nextEmail } : {}),
    })
    .eq('id', session.user.id)
    .select('*')
    .single()

  if (updated.error) {
    throw new Error(updated.error.message)
  }

  return updated.data
}

export async function requestAccountDeletionHandler(input: {
  reason: string
}): Promise<AdminProfile> {
  const session = await requireAdminSession()

  if (isSuperAdminProfile(session.profile)) {
    throw new Error('Super admin accounts cannot request deletion this way.')
  }

  const reason = input.reason.trim()
  if (reason.length < 10) {
    throw new Error('Please share a bit more detail (at least 10 characters).')
  }
  if (reason.length > 2000) {
    throw new Error('Reason must be 2000 characters or fewer.')
  }

  if (session.profile.deletion_requested_at) {
    throw new Error('A deletion request is already pending for this account.')
  }

  const admin = createAdminSupabaseClient()
  const updated = await admin
    .from('admin_profiles')
    .update({
      deletion_requested_at: new Date().toISOString(),
      deletion_reason: reason,
    })
    .eq('id', session.user.id)
    .select('*')
    .single()

  if (updated.error) {
    throw new Error(updated.error.message)
  }

  const weddingLabel = session.wedding
    ? formatCoupleNames(session.wedding.groom_name, session.wedding.bride_name)
    : null

  try {
    await sendDeletionRequestEmail({
      adminName: `${updated.data.first_name} ${updated.data.last_name}`.trim(),
      adminEmail: updated.data.email ?? session.user.email ?? 'unknown',
      reason,
      weddingLabel,
    })
  } catch (error) {
    // Keep the request on the profile even if email fails — super admin still sees it in Admins.
    console.error('[DeletionRequest] email failed', {
      userId: session.user.id,
      error,
    })
  }

  return updated.data
}

export async function submitSupportHandler(input: {
  category: string
  message: string
  image?: { name: string; type: string; dataBase64: string } | null
}): Promise<{ ok: true }> {
  const session = await requireAdminSession()

  if (isSuperAdminProfile(session.profile)) {
    throw new Error('Support is for admins. Super admins manage issues directly.')
  }

  const message = input.message.trim()
  if (message.length < 10) {
    throw new Error('Please enter a message (at least 10 characters).')
  }
  if (message.length > 5000) {
    throw new Error('Message must be 5000 characters or fewer.')
  }

  const categoryLabel = supportCategoryLabel(input.category)
  const attachment = input.image ? assertSupportImage(input.image) : null

  const weddingLabel = session.wedding
    ? formatCoupleNames(session.wedding.groom_name, session.wedding.bride_name)
    : null

  await sendSupportEmail({
    category: input.category,
    categoryLabel,
    message,
    adminName:
      `${session.profile.first_name ?? ''} ${session.profile.last_name ?? ''}`.trim() ||
      'Admin',
    adminEmail: session.profile.email ?? session.user.email ?? 'unknown',
    adminRole: session.profile.role,
    weddingLabel,
    attachment,
  })

  return { ok: true as const }
}
