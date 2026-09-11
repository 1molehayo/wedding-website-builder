import { requireWeddingSession } from '@/lib/auth/session.server'
import { getAppUrl } from '@/lib/app-url'
import { formatCoupleNames } from '@/lib/constants'
import { sendGuestRsvpInviteEmail } from '@/lib/email/resend.server'
import { resolveEmailThemeId } from '@/lib/email/theme'
import { guestNameKey } from '@/lib/guests/name-key'
import type { GuestInput } from '@/lib/guests/schema'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import type { Guest } from '@/lib/supabase/types'
import type { PublicThemeId } from '@/lib/site-settings'
import {
  formatWeddingDate,
  resolvePublicWeddingDate,
} from '@/lib/wedding/public-settings'

const GUEST_SELECT =
  'id, wedding_id, first_name, last_name, email, phone, party_name, plus_ones, notes, admin_label, rsvp_token, rsvp_status, rsvp_responded_at, attending_count, dietary_notes, rsvp_message, allow_rsvp_update, invite_emailed_at, created_at, updated_at'

export type GuestConflictMatch = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  admin_label: string | null
  reasons: Array<'name' | 'email' | 'phone'>
}

export type CreateGuestResult =
  | { status: 'created'; guest: Guest }
  | { status: 'conflict'; matches: GuestConflictMatch[] }

export type UpdateGuestResult =
  | { status: 'updated'; guest: Guest }
  | { status: 'conflict'; matches: GuestConflictMatch[] }

export type GuestConflictResolution = {
  newAdminLabel: string
  existingLabels: Array<{ guestId: string; adminLabel: string }>
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  return digits.length > 0 ? digits : null
}

function findConflicts(
  guests: Guest[],
  input: GuestInput,
  excludeGuestId?: string,
): GuestConflictMatch[] {
  const nameKey = guestNameKey(input.first_name, input.last_name)
  const email = input.email.trim().toLowerCase() || null
  const phone = normalizePhone(input.phone)
  const matches: GuestConflictMatch[] = []

  for (const guest of guests) {
    if (excludeGuestId && guest.id === excludeGuestId) continue
    const reasons: GuestConflictMatch['reasons'] = []
    if (guestNameKey(guest.first_name, guest.last_name) === nameKey) {
      reasons.push('name')
    }
    if (email && guest.email?.trim().toLowerCase() === email) {
      reasons.push('email')
    }
    if (phone && normalizePhone(guest.phone) === phone) {
      reasons.push('phone')
    }
    if (reasons.length === 0) continue
    matches.push({
      id: guest.id,
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email,
      phone: guest.phone,
      admin_label: guest.admin_label,
      reasons,
    })
  }

  return matches
}

async function listWeddingGuests(weddingId: string): Promise<Guest[]> {
  const admin = createAdminSupabaseClient()
  const result = await admin
    .from('guests')
    .select(GUEST_SELECT)
    .eq('wedding_id', weddingId)
  if (result.error) throw new Error(result.error.message)
  return result.data
}

async function applyExistingLabels(
  weddingId: string,
  updates: Array<{ guestId: string; adminLabel: string }>,
) {
  const admin = createAdminSupabaseClient()
  for (const update of updates) {
    const label = update.adminLabel.trim()
    if (!label) throw new Error('Admin labels are required for both guests.')
    const result = await admin
      .from('guests')
      .update({ admin_label: label })
      .eq('id', update.guestId)
      .eq('wedding_id', weddingId)
    if (result.error) throw new Error(result.error.message)
  }
}

export async function listGuestsHandler(): Promise<Guest[]> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const result = await admin
    .from('guests')
    .select(GUEST_SELECT)
    .eq('wedding_id', session.wedding.id)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })

  if (result.error) {
    throw new Error(result.error.message)
  }

  return result.data
}

export async function createGuestHandler(
  input: GuestInput & { admin_label?: string | null },
  resolution?: GuestConflictResolution,
): Promise<CreateGuestResult> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const existing = await listWeddingGuests(session.wedding.id)
  const matches = findConflicts(existing, input)
  const {
    admin_label: inputAdminLabel,
    ...guestFields
  } = input

  if (matches.length > 0 && !resolution) {
    return { status: 'conflict', matches }
  }

  if (matches.length > 0 && resolution) {
    const newLabel = resolution.newAdminLabel.trim()
    if (!newLabel) throw new Error('Add a label for the new guest.')
    if (resolution.existingLabels.length !== matches.length) {
      throw new Error('Add a label for each existing matching guest.')
    }
    for (const match of matches) {
      const label = resolution.existingLabels.find((item) => item.guestId === match.id)
      if (!label?.adminLabel.trim()) {
        throw new Error('Add a label for each existing matching guest.')
      }
    }
    await applyExistingLabels(session.wedding.id, resolution.existingLabels)
    const result = await admin
      .from('guests')
      .insert({
        wedding_id: session.wedding.id,
        ...guestFields,
        admin_label: newLabel,
      })
      .select(GUEST_SELECT)
      .single()
    if (result.error) throw new Error(result.error.message)
    return { status: 'created', guest: result.data }
  }

  const result = await admin
    .from('guests')
    .insert({
      wedding_id: session.wedding.id,
      ...guestFields,
      admin_label: inputAdminLabel?.trim() || null,
    })
    .select(GUEST_SELECT)
    .single()

  if (result.error) {
    throw new Error(result.error.message)
  }

  return { status: 'created', guest: result.data }
}

export async function updateGuestHandler(
  guestId: string,
  input: GuestInput & { admin_label?: string | null },
  resolution?: GuestConflictResolution,
): Promise<UpdateGuestResult> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const existing = await listWeddingGuests(session.wedding.id)
  const matches = findConflicts(existing, input, guestId)

  if (matches.length > 0 && !resolution) {
    return { status: 'conflict', matches }
  }

  const adminLabel =
    resolution?.newAdminLabel.trim() ||
    input.admin_label?.trim() ||
    null

  if (matches.length > 0 && resolution) {
    if (!resolution.newAdminLabel.trim()) {
      throw new Error('Add a label for this guest.')
    }
    await applyExistingLabels(session.wedding.id, resolution.existingLabels)
  }

  const result = await admin
    .from('guests')
    .update({
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone,
      party_name: input.party_name,
      plus_ones: input.plus_ones,
      notes: input.notes,
      admin_label: adminLabel,
    })
    .eq('id', guestId)
    .eq('wedding_id', session.wedding.id)
    .select(GUEST_SELECT)
    .single()

  if (result.error) {
    throw new Error(result.error.message)
  }

  return { status: 'updated', guest: result.data }
}

export async function deleteGuestHandler(guestId: string): Promise<{ ok: true }> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const result = await admin
    .from('guests')
    .delete()
    .eq('id', guestId)
    .eq('wedding_id', session.wedding.id)

  if (result.error) {
    throw new Error(result.error.message)
  }

  return { ok: true as const }
}

export async function unlockGuestRsvpHandler(
  guestId: string,
): Promise<Guest> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const result = await admin
    .from('guests')
    .update({ allow_rsvp_update: true })
    .eq('id', guestId)
    .eq('wedding_id', session.wedding.id)
    .select(GUEST_SELECT)
    .single()

  if (result.error) throw new Error(result.error.message)
  return result.data
}

export type SendGuestInviteResult = {
  ok: true
  guestId: string
  email: string
  includedPhotos: boolean
}

export type SendGuestInvitesBulkResult = {
  sent: number
  skipped: number
  failed: Array<{ guestId: string; email: string; error: string }>
}

async function loadGuestPhotoShareUrl(
  weddingId: string,
  guestId: string,
  rsvpToken: string,
): Promise<string | null> {
  const admin = createAdminSupabaseClient()
  const membership = await admin
    .from('photo_share_group_guests')
    .select('group_id')
    .eq('guest_id', guestId)
    .maybeSingle()

  if (membership.error) throw new Error(membership.error.message)
  if (!membership.data) return null

  const group = await admin
    .from('photo_share_groups')
    .select('share_token')
    .eq('id', membership.data.group_id)
    .eq('wedding_id', weddingId)
    .maybeSingle()

  if (group.error) throw new Error(group.error.message)
  if (!group.data?.share_token) return null

  return `${getAppUrl()}/photos/${group.data.share_token}?g=${encodeURIComponent(rsvpToken)}`
}

async function sendInviteForGuest(
  wedding: {
    id: string
    groom_name: string
    bride_name: string
    wedding_date: string | null
    date_published_at?: string | null
    public_slug: string
    active_public_theme: PublicThemeId
  },
  guest: Guest,
  options?: { replyTo?: string | null },
): Promise<SendGuestInviteResult> {
  const email = guest.email?.trim().toLowerCase()
  if (!email) {
    throw new Error('Add an email address before sending an invite.')
  }

  const coupleLabel = formatCoupleNames(wedding.groom_name, wedding.bride_name)
  const origin = getAppUrl()
  const photosUrl = await loadGuestPhotoShareUrl(
    wedding.id,
    guest.id,
    guest.rsvp_token,
  )
  const replyTo = options?.replyTo?.trim() || undefined
  const publicDate = resolvePublicWeddingDate(wedding)

  await sendGuestRsvpInviteEmail({
    to: email,
    guestName: guest.first_name,
    coupleLabel,
    weddingDateLabel: formatWeddingDate(publicDate),
    websiteUrl: wedding.public_slug
      ? `${origin}/${wedding.public_slug}`
      : null,
    rsvpUrl: `${origin}/rsvp/${encodeURIComponent(guest.rsvp_token)}`,
    photosUrl,
    theme: resolveEmailThemeId(wedding.active_public_theme),
    replyTo,
  })

  const admin = createAdminSupabaseClient()
  const stamped = await admin
    .from('guests')
    .update({ invite_emailed_at: new Date().toISOString() })
    .eq('id', guest.id)
    .eq('wedding_id', wedding.id)

  if (stamped.error) {
    console.error('[guests] failed to stamp invite_emailed_at', stamped.error)
  }

  return {
    ok: true as const,
    guestId: guest.id,
    email,
    includedPhotos: Boolean(photosUrl),
  }
}

export async function sendGuestInviteHandler(
  guestId: string,
): Promise<SendGuestInviteResult> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const result = await admin
    .from('guests')
    .select(GUEST_SELECT)
    .eq('id', guestId)
    .eq('wedding_id', session.wedding.id)
    .maybeSingle()

  if (result.error) throw new Error(result.error.message)
  if (!result.data) throw new Error('Guest not found.')

  return sendInviteForGuest(session.wedding, result.data, {
    replyTo: session.user.email,
  })
}

export async function sendGuestInvitesBulkHandler(input: {
  onlyPending: boolean
}): Promise<SendGuestInvitesBulkResult> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  let query = admin
    .from('guests')
    .select(GUEST_SELECT)
    .eq('wedding_id', session.wedding.id)

  if (input.onlyPending) {
    query = query.eq('rsvp_status', 'pending')
  }

  const result = await query
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })

  if (result.error) throw new Error(result.error.message)

  const guests = result.data
  let sent = 0
  let skipped = 0
  const failed: SendGuestInvitesBulkResult['failed'] = []
  const replyTo = session.user.email

  for (const guest of guests) {
    if (!guest.email?.trim()) {
      skipped += 1
      continue
    }
    try {
      await sendInviteForGuest(session.wedding, guest, { replyTo })
      sent += 1
    } catch (err) {
      failed.push({
        guestId: guest.id,
        email: guest.email ?? '',
        error: err instanceof Error ? err.message : 'Unable to send invite.',
      })
    }
  }

  return { sent, skipped, failed }
}

export function guestRsvpUrl(rsvpToken: string): string {
  return `${getAppUrl()}/rsvp/${encodeURIComponent(rsvpToken)}`
}
