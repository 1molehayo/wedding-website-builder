import {
  getLocalBootstrapRole,
  isLocalAllowedEmail,
  isSuperAdminEmail,
  isSuperAdminProfile,
  normalizeAdminEmail,
} from '@/lib/auth/roles'
import type { AdminSession } from '@/lib/auth/types'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import { isLocalSupabase } from '@/lib/supabase/env'
import { createServerSupabaseClient } from '@/lib/supabase/server.server'
import type { AdminProfile, AdminRole, Wedding } from '@/lib/supabase/types'

export type { AdminSession }

export type AdminSessionWithWedding = AdminSession & { wedding: Wedding }

async function promoteSuperAdminIfNeeded(
  profile: AdminProfile,
  email: string | undefined,
): Promise<AdminProfile> {
  const local = isLocalSupabase()
  if (!isSuperAdminEmail(email, local) || isSuperAdminProfile(profile)) {
    if (email && !profile.email) {
      const admin = createAdminSupabaseClient()
      const updated = await admin
        .from('admin_profiles')
        .update({ email: normalizeAdminEmail(email) })
        .eq('id', profile.id)
        .select('*')
        .single()
      if (!updated.error && updated.data) {
        return updated.data
      }
    }
    return profile
  }

  const admin = createAdminSupabaseClient()
  const updated = await admin
    .from('admin_profiles')
    .update({
      role: 'super_admin',
      email: normalizeAdminEmail(email!),
    })
    .eq('id', profile.id)
    .select('*')
    .single()

  if (updated.error) {
    throw new Error(updated.error.message)
  }

  return updated.data
}

async function createBootstrapProfile(
  userId: string,
  email: string,
  role: AdminRole,
): Promise<AdminProfile> {
  const admin = createAdminSupabaseClient()
  const normalizedEmail = normalizeAdminEmail(email)

  // Names are required in-app; bootstrap leaves them null so the profile gate runs.
  const inserted = await admin
    .from('admin_profiles')
    .insert({
      id: userId,
      wedding_id: null,
      display_name: null,
      first_name: null,
      last_name: null,
      phone: null,
      email: normalizedEmail,
      role,
      invite_accepted_at: new Date().toISOString(),
      invited_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (inserted.error) {
    throw new Error(inserted.error.message)
  }

  return inserted.data
}

async function ensureAdminProfile(
  userId: string,
  email?: string,
): Promise<AdminProfile | null> {
  const admin = createAdminSupabaseClient()

  const existing = await admin
    .from('admin_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (existing.error) {
    throw new Error(existing.error.message)
  }

  if (existing.data) {
    return promoteSuperAdminIfNeeded(existing.data, email)
  }

  if (!email) {
    return null
  }

  const local = isLocalSupabase()
  if (local) {
    const role = getLocalBootstrapRole(email)
    if (!role) {
      return null
    }
    return createBootstrapProfile(userId, email, role)
  }

  if (!isSuperAdminEmail(email, false)) {
    return null
  }

  return createBootstrapProfile(userId, email, 'super_admin')
}

async function loadWeddingForProfile(
  profile: AdminProfile,
): Promise<Wedding | null> {
  if (!profile.wedding_id) {
    // v1: prefer any existing wedding and attach this profile if still null
    const admin = createAdminSupabaseClient()
    const existingWedding = await admin
      .from('weddings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (existingWedding.error) {
      throw new Error(existingWedding.error.message)
    }

    if (existingWedding.data) {
      const linked = await admin
        .from('admin_profiles')
        .update({ wedding_id: existingWedding.data.id })
        .eq('id', profile.id)
        .is('wedding_id', null)
        .select('*')
        .maybeSingle()

      if (linked.error) {
        throw new Error(linked.error.message)
      }

      return existingWedding.data
    }

    return null
  }

  const admin = createAdminSupabaseClient()
  const weddingResult = await admin
    .from('weddings')
    .select('*')
    .eq('id', profile.wedding_id)
    .maybeSingle()

  if (weddingResult.error) {
    throw new Error(weddingResult.error.message)
  }

  return weddingResult.data
}

async function loadAdminSession(
  userId: string,
  email: string | undefined,
): Promise<AdminSession | null> {
  const profile = await ensureAdminProfile(userId, email)
  if (!profile) {
    return null
  }

  const wedding = await loadWeddingForProfile(profile)

  return {
    user: { id: userId, email },
    profile: wedding ? { ...profile, wedding_id: wedding.id } : profile,
    wedding,
  }
}

async function isAuthorizedAdminEmail(email: string): Promise<boolean> {
  if (isLocalSupabase()) {
    return isLocalAllowedEmail(email)
  }

  if (isSuperAdminEmail(email, false)) {
    return true
  }

  const admin = createAdminSupabaseClient()
  const result = await admin
    .from('admin_profiles')
    .select('id, cancelled_at')
    .eq('email', email)
    .maybeSingle()

  if (result.error) {
    throw new Error(result.error.message)
  }

  if (!result.data || result.data.cancelled_at) {
    return false
  }

  return true
}

async function ensureAuthUserExists(email: string) {
  const admin = createAdminSupabaseClient()
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `${crypto.randomUUID()}A1!`,
  })

  if (created.error) {
    const message = created.error.message.toLowerCase()
    const alreadyExists =
      message.includes('already') ||
      message.includes('registered') ||
      message.includes('exists')
    if (!alreadyExists) {
      throw new Error(created.error.message)
    }
  }
}

export async function getAdminSessionHandler(): Promise<AdminSession | null> {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user

  if (!user) {
    return null
  }

  const session = await loadAdminSession(user.id, user.email)
  if (!session) {
    return null
  }

  if (session.profile.cancelled_at) {
    await supabase.auth.signOut({ scope: 'local' })
    return null
  }

  return session
}

export async function requestAdminOtpHandler(email: string) {
  const allowed = await isAuthorizedAdminEmail(email)
  if (!allowed) {
    throw new Error(
      isLocalSupabase()
        ? 'Local auth only allows superadmin@supabase.com or admin@supabase.com.'
        : 'This email is not authorized for admin access. Ask the super admin to invite you.',
    )
  }

  await ensureAuthUserExists(email)

  const supabase = createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return { ok: true as const, email }
}

export async function verifyAdminOtpHandler(input: {
  email: string
  token: string
}): Promise<AdminSession> {
  const supabase = createServerSupabaseClient()
  const { data: authData, error } = await supabase.auth.verifyOtp({
    email: input.email,
    token: input.token,
    type: 'email',
  })

  if (error) {
    throw new Error(error.message)
  }

  const user = authData.user
  if (!user) {
    throw new Error('Unable to verify code.')
  }

  const session = await loadAdminSession(user.id, user.email)

  if (!session) {
    await supabase.auth.signOut()
    throw new Error(
      'This account is not an admin. Ask the super admin to invite you.',
    )
  }

  return session
}

export async function logoutAdminHandler() {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
  return { ok: true as const }
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSessionHandler()
  if (!session) {
    throw new Error('You must be signed in.')
  }
  return session
}

function hasWedding(wedding: Wedding | null): wedding is Wedding {
  return wedding !== null
}

/** Server-side gate: wedding-scoped ops cannot be bypassed from the client. */
export async function requireWeddingSession(): Promise<AdminSessionWithWedding> {
  const session = await requireAdminSession()

  if (!hasWedding(session.wedding)) {
    throw new Error(
      isSuperAdminProfile(session.profile)
        ? 'Set up the wedding first (Onboarding), or invite an admin to complete it.'
        : 'Complete wedding onboarding before continuing.',
    )
  }

  return {
    user: session.user,
    profile: session.profile,
    wedding: session.wedding,
  }
}

export async function requireSuperAdminSession(): Promise<AdminSession> {
  const session = await requireAdminSession()
  if (!isSuperAdminProfile(session.profile)) {
    throw new Error('Only the super admin can manage admins.')
  }
  return session
}
