import { requireWeddingSession } from '@/lib/auth/session.server'
import { getAppUrl } from '@/lib/app-url'
import { formatCoupleNames } from '@/lib/constants'
import {
  sendGuestDateAnnouncedEmail,
} from '@/lib/email/resend.server'
import { resolveEmailThemeId } from '@/lib/email/theme'
import type { Wedding } from '@/lib/supabase/types'
import {
  FALLBACK_PUBLIC_WEDDING,
  formatWeddingDate,
  toPublicSettings,
} from '@/lib/wedding/public-settings'
import type { PublicWeddingSettings } from '@/lib/wedding/public-settings'
import { isPublicSlugAvailable } from '@/lib/wedding/slug.server'
import type { UpdateWeddingInput } from '@/lib/wedding/validation'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'

export async function getPublicWeddingSettingsHandler(
  weddingSlug?: string,
): Promise<PublicWeddingSettings> {
  try {
    const admin = createAdminSupabaseClient()
    let query = admin
      .from('weddings')
      .select(
        'groom_name, bride_name, wedding_date, date_published_at, venue_name, venue_location, dress_code, active_public_theme, status, public_slug',
      )

    if (weddingSlug) {
      query = query.eq('public_slug', weddingSlug)
    } else {
      query = query.order('created_at', { ascending: true }).limit(1)
    }

    const result = await query.maybeSingle()

    if (result.error) {
      throw new Error(result.error.message)
    }

    if (!result.data) {
      return FALLBACK_PUBLIC_WEDDING
    }

    return toPublicSettings(result.data)
  } catch {
    return FALLBACK_PUBLIC_WEDDING
  }
}

export async function checkPublicSlugAvailableHandler(slug: string): Promise<{
  available: boolean
  slug: string
}> {
  const session = await requireWeddingSession()
  const available = await isPublicSlugAvailable({
    slug,
    excludeWeddingId: session.wedding.id,
  })
  return { available, slug }
}

export async function updateWeddingHandler(
  data: UpdateWeddingInput,
): Promise<Wedding> {
  const session = await requireWeddingSession()

  const admin = createAdminSupabaseClient()

  // Cleared slug → keep the one created at onboarding (never invent a new one here).
  const publicSlug =
    data.public_slug.trim() || session.wedding.public_slug.trim()
  if (!publicSlug) {
    throw new Error('Public URL slug is required.')
  }

  const available = await isPublicSlugAvailable({
    slug: publicSlug,
    excludeWeddingId: session.wedding.id,
  })
  if (!available) {
    throw new Error('That public URL is already in use.')
  }

  const nextDate = data.wedding_date
  let date_published_at = session.wedding.date_published_at ?? null

  if (!nextDate) {
    date_published_at = null
  } else if (
    session.wedding.wedding_date !== nextDate &&
    !session.wedding.date_published_at
  ) {
    // New draft date stays unpublished until deliberate publish.
    date_published_at = null
  }

  const updated = await admin
    .from('weddings')
    .update({
      groom_name: data.groom_name,
      bride_name: data.bride_name,
      wedding_date: nextDate,
      date_published_at,
      status: data.status,
      venue_name: data.venue_name,
      venue_location: data.venue_location,
      dress_code: data.dress_code,
      active_public_theme: data.active_public_theme,
      public_slug: publicSlug,
    })
    .eq('id', session.wedding.id)
    .select('*')
    .single()

  if (updated.error) {
    throw new Error(updated.error.message)
  }

  if (!updated.data) {
    throw new Error('Wedding settings could not be updated.')
  }

  return updated.data
}

export type PublishWeddingDateResult = {
  wedding: Wedding
  notified: number
  skipped: number
  failed: Array<{ guestId: string; email: string; error: string }>
}

export async function publishWeddingDateHandler(input: {
  notifyGuests: boolean
}): Promise<PublishWeddingDateResult> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  if (!session.wedding.wedding_date) {
    throw new Error('Save a wedding date before publishing it.')
  }

  const now = new Date().toISOString()
  const nextStatus =
    session.wedding.status === 'planning'
      ? 'date_confirmed'
      : session.wedding.status

  const updated = await admin
    .from('weddings')
    .update({
      date_published_at: now,
      status: nextStatus,
    })
    .eq('id', session.wedding.id)
    .select('*')
    .single()

  if (updated.error) throw new Error(updated.error.message)
  if (!updated.data) throw new Error('Unable to publish wedding date.')

  const wedding = updated.data as Wedding
  const result: PublishWeddingDateResult = {
    wedding,
    notified: 0,
    skipped: 0,
    failed: [],
  }

  if (!input.notifyGuests) {
    return result
  }

  const guests = await admin
    .from('guests')
    .select('id, first_name, email, invite_emailed_at, rsvp_token')
    .eq('wedding_id', wedding.id)
    .not('invite_emailed_at', 'is', null)
    .order('last_name', { ascending: true })

  if (guests.error) throw new Error(guests.error.message)

  const coupleLabel = formatCoupleNames(wedding.groom_name, wedding.bride_name)
  const weddingDateLabel = formatWeddingDate(wedding.wedding_date)
  const websiteUrl = wedding.public_slug
    ? `${getAppUrl()}/${wedding.public_slug}`
    : null
  const theme = resolveEmailThemeId(wedding.active_public_theme)
  const replyTo = session.user.email ?? undefined

  for (const guest of guests.data) {
    const email = guest.email?.trim().toLowerCase()
    if (!email) {
      result.skipped += 1
      continue
    }
    try {
      await sendGuestDateAnnouncedEmail({
        to: email,
        guestName: guest.first_name,
        coupleLabel,
        weddingDateLabel,
        websiteUrl,
        rsvpUrl: `${getAppUrl()}/rsvp/${encodeURIComponent(guest.rsvp_token)}`,
        theme,
        replyTo,
      })
      result.notified += 1
    } catch (err) {
      result.failed.push({
        guestId: guest.id,
        email,
        error: err instanceof Error ? err.message : 'Unable to send email.',
      })
    }
  }

  return result
}

export async function unpublishWeddingDateHandler(): Promise<Wedding> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const updated = await admin
    .from('weddings')
    .update({ date_published_at: null })
    .eq('id', session.wedding.id)
    .select('*')
    .single()

  if (updated.error) throw new Error(updated.error.message)
  if (!updated.data) throw new Error('Unable to unpublish wedding date.')

  return updated.data as Wedding
}
