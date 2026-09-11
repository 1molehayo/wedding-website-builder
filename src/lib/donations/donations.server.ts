import { requireAdminSession } from '@/lib/auth/session.server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'

function parseEmail(value: unknown): string {
  const email = String(value ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.')
  }
  if (email.length > 254) {
    throw new Error('Email must be 254 characters or fewer.')
  }
  return email
}

export async function submitDonationThanksHandler(input: {
  donorName: unknown
  donorEmail: unknown
  message?: unknown
}): Promise<{ ok: true }> {
  const session = await requireAdminSession()
  const donorName = String(input.donorName ?? '').trim()
  if (!donorName) {
    throw new Error('Enter your name.')
  }
  if (donorName.length > 120) {
    throw new Error('Name must be 120 characters or fewer.')
  }

  const donorEmail = parseEmail(input.donorEmail)
  const messageRaw = String(input.message ?? '').trim()
  if (messageRaw.length > 1000) {
    throw new Error('Message must be 1000 characters or fewer.')
  }

  const admin = createAdminSupabaseClient()
  const result = await admin.from('donation_thanks').insert({
    admin_profile_id: session.profile.id,
    wedding_id: session.wedding?.id ?? null,
    donor_name: donorName,
    donor_email: donorEmail,
    message: messageRaw || null,
  })

  if (result.error) {
    throw new Error(result.error.message)
  }

  return { ok: true as const }
}
