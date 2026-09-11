import { requireWeddingSession } from '@/lib/auth/session.server'
import { formatCoupleNames } from '@/lib/constants'
import type {
  AdminRsvpInput,
  PublicRsvpInput,
  PublicRsvpPageData,
} from '@/lib/rsvp/schema'
import {
  maxAttendingForPlusOnes,
  parseAdminRsvpInput,
  parsePublicRsvpInput,
} from '@/lib/rsvp/schema'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import type { Guest, WeddingStatus } from '@/lib/supabase/types'
import {
  formatWeddingDate,
  resolvePublicWeddingDate,
} from '@/lib/wedding/public-settings'

const GUEST_RSVP_SELECT =
  'id, wedding_id, first_name, last_name, email, phone, party_name, plus_ones, notes, admin_label, rsvp_token, rsvp_status, rsvp_responded_at, attending_count, dietary_notes, rsvp_message, allow_rsvp_update, invite_emailed_at, created_at, updated_at'

function guestCanEditRsvp(guest: {
  rsvp_status: Guest['rsvp_status']
  allow_rsvp_update: boolean
}): boolean {
  return guest.rsvp_status === 'pending' || guest.allow_rsvp_update
}

export type { PublicRsvpPageData }

function isRsvpOpen(status: WeddingStatus): boolean {
  return status !== 'completed'
}

export async function getRsvpByTokenHandler(
  token: string,
): Promise<PublicRsvpPageData> {
  const admin = createAdminSupabaseClient()
  const normalized = token.trim()
  if (!normalized) {
    throw new Error('RSVP link is invalid.')
  }

  const guestResult = await admin
    .from('guests')
    .select(GUEST_RSVP_SELECT)
    .eq('rsvp_token', normalized)
    .maybeSingle()

  if (guestResult.error) {
    throw new Error(guestResult.error.message)
  }
  if (!guestResult.data) {
    throw new Error('This RSVP link is invalid or has expired.')
  }

  const guest = guestResult.data
  const weddingResult = await admin
    .from('weddings')
    .select(
      'groom_name, bride_name, wedding_date, date_published_at, venue_name, venue_location, active_public_theme, status',
    )
    .eq('id', guest.wedding_id)
    .maybeSingle()

  if (weddingResult.error) {
    throw new Error(weddingResult.error.message)
  }
  if (!weddingResult.data) {
    throw new Error('This RSVP link is invalid or has expired.')
  }

  const wedding = weddingResult.data
  const open = isRsvpOpen(wedding.status)

  return {
    token: guest.rsvp_token,
    guestFirstName: guest.first_name,
    guestLastName: guest.last_name,
    partyName: guest.party_name,
    plusOnes: guest.plus_ones,
    maxAttending: maxAttendingForPlusOnes(guest.plus_ones),
    rsvpStatus: guest.rsvp_status,
    attendingCount: guest.attending_count,
    dietaryNotes: guest.dietary_notes,
    message: guest.rsvp_message,
    respondedAt: guest.rsvp_responded_at,
    canEdit: guestCanEditRsvp(guest),
    isOpen: open,
    closedReason: open
      ? null
      : 'RSVP is closed for this wedding. Contact the couple if you need to update your response.',
    coupleLabel: formatCoupleNames(wedding.groom_name, wedding.bride_name),
    weddingDate: resolvePublicWeddingDate(wedding),
    weddingDateLabel: formatWeddingDate(resolvePublicWeddingDate(wedding)),
    venueName: wedding.venue_name,
    venueLocation: wedding.venue_location,
    theme: wedding.active_public_theme,
    weddingStatus: wedding.status,
  }
}

export async function submitRsvpHandler(
  token: string,
  data: unknown,
): Promise<PublicRsvpPageData> {
  const admin = createAdminSupabaseClient()
  const normalized = token.trim()
  if (!normalized) {
    throw new Error('RSVP link is invalid.')
  }

  const guestResult = await admin
    .from('guests')
    .select(GUEST_RSVP_SELECT)
    .eq('rsvp_token', normalized)
    .maybeSingle()

  if (guestResult.error) {
    throw new Error(guestResult.error.message)
  }
  if (!guestResult.data) {
    throw new Error('This RSVP link is invalid or has expired.')
  }

  const guest = guestResult.data

  const weddingResult = await admin
    .from('weddings')
    .select('status')
    .eq('id', guest.wedding_id)
    .maybeSingle()

  if (weddingResult.error) {
    throw new Error(weddingResult.error.message)
  }
  if (!weddingResult.data || !isRsvpOpen(weddingResult.data.status)) {
    throw new Error('RSVP is closed for this wedding.')
  }

  if (!guestCanEditRsvp(guest)) {
    throw new Error(
      'Your RSVP is already submitted. Contact the couple if you need to update it.',
    )
  }

  const maxAttending = maxAttendingForPlusOnes(guest.plus_ones)
  const input: PublicRsvpInput = parsePublicRsvpInput(data, maxAttending)

  const updated = await admin
    .from('guests')
    .update({
      rsvp_status: input.status,
      attending_count:
        input.status === 'attending' ? input.attending_count : null,
      dietary_notes: input.dietary_notes,
      rsvp_message: input.rsvp_message,
      rsvp_responded_at: new Date().toISOString(),
      allow_rsvp_update: false,
    })
    .eq('id', guest.id)
    .eq('rsvp_token', normalized)
    .select(GUEST_RSVP_SELECT)
    .single()

  if (updated.error) {
    throw new Error(updated.error.message)
  }

  return getRsvpByTokenHandler(normalized)
}

export async function updateGuestRsvpHandler(
  guestId: string,
  data: unknown,
): Promise<Guest> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const existing = await admin
    .from('guests')
    .select('id, plus_ones')
    .eq('id', guestId)
    .eq('wedding_id', session.wedding.id)
    .maybeSingle()

  if (existing.error) {
    throw new Error(existing.error.message)
  }
  if (!existing.data) {
    throw new Error('Guest not found.')
  }

  const maxAttending = maxAttendingForPlusOnes(existing.data.plus_ones)
  const input: AdminRsvpInput = parseAdminRsvpInput(data, maxAttending)

  const respondedAt =
    input.rsvp_status === 'pending' ? null : new Date().toISOString()

  const result = await admin
    .from('guests')
    .update({
      rsvp_status: input.rsvp_status,
      attending_count: input.attending_count,
      dietary_notes: input.dietary_notes,
      rsvp_message: input.rsvp_message,
      rsvp_responded_at: respondedAt,
    })
    .eq('id', guestId)
    .eq('wedding_id', session.wedding.id)
    .select(GUEST_RSVP_SELECT)
    .single()

  if (result.error) {
    throw new Error(result.error.message)
  }

  return result.data
}
