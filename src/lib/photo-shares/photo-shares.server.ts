import { requireWeddingSession } from '@/lib/auth/session.server'
import { getAppUrl } from '@/lib/app-url'
import { formatCoupleNames } from '@/lib/constants'
import { sendGuestPhotoShareEmail } from '@/lib/email/resend.server'
import { resolveEmailThemeId } from '@/lib/email/theme'
import { createPhotoSignedUrl } from '@/lib/page-blocks/storage.server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import {
  formatWeddingDate,
  resolvePublicWeddingDate,
} from '@/lib/wedding/public-settings'
import type { PublicThemeId } from '@/lib/site-settings'

function newShareToken() {
  return (
    crypto.randomUUID().replaceAll('-', '') +
    crypto.randomUUID().replaceAll('-', '')
  )
}

export type PhotoShareGuestOption = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  rsvp_token: string
  assignedGroupId: string | null
}

export type PhotoShareGroupListItem = {
  id: string
  name: string
  share_token: string
  created_at: string
  assetIds: string[]
  guestIds: string[]
  openCount: number
  groupUrl: string
}

export type PhotoShareViewerData = {
  coupleLabel: string
  weddingDate: string | null
  weddingDateLabel: string
  theme: PublicThemeId
  groupName: string
  photos: Array<{ id: string; url: string; filename: string }>
  guestFirstName: string | null
}

export async function listPhotoShareGroupsHandler(): Promise<{
  groups: PhotoShareGroupListItem[]
  guests: PhotoShareGuestOption[]
}> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const weddingId = session.wedding.id

  const [groupsResult, guestsResult, membershipsResult, assetsResult, opensResult] =
    await Promise.all([
      admin
        .from('photo_share_groups')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false }),
      admin
        .from('guests')
        .select('id, first_name, last_name, email, rsvp_token')
        .eq('wedding_id', weddingId)
        .order('last_name', { ascending: true }),
      admin.from('photo_share_group_guests').select('group_id, guest_id'),
      admin
        .from('photo_share_group_assets')
        .select('group_id, media_asset_id, sort_order'),
      admin.from('photo_share_opens').select('group_id'),
    ])

  if (groupsResult.error) throw new Error(groupsResult.error.message)
  if (guestsResult.error) throw new Error(guestsResult.error.message)
  if (membershipsResult.error) throw new Error(membershipsResult.error.message)
  if (assetsResult.error) throw new Error(assetsResult.error.message)
  if (opensResult.error) throw new Error(opensResult.error.message)

  const groupRows = groupsResult.data
  const membershipRows = membershipsResult.data
  const assetLinkRows = assetsResult.data
  const openRows = opensResult.data
  const guestRows = guestsResult.data

  const groupIds = new Set(groupRows.map((g) => g.id))
  const guestGroupById = new Map<string, string>()
  for (const row of membershipRows) {
    if (!groupIds.has(row.group_id)) continue
    guestGroupById.set(row.guest_id, row.group_id)
  }

  const assetsByGroup = new Map<string, Array<{ id: string; order: number }>>()
  for (const row of assetLinkRows) {
    if (!groupIds.has(row.group_id)) continue
    const list = assetsByGroup.get(row.group_id)
    if (list) {
      list.push({ id: row.media_asset_id, order: row.sort_order })
    } else {
      assetsByGroup.set(row.group_id, [
        { id: row.media_asset_id, order: row.sort_order },
      ])
    }
  }

  const guestsByGroup = new Map<string, string[]>()
  for (const row of membershipRows) {
    if (!groupIds.has(row.group_id)) continue
    const list = guestsByGroup.get(row.group_id)
    if (list) {
      list.push(row.guest_id)
    } else {
      guestsByGroup.set(row.group_id, [row.guest_id])
    }
  }

  const openCountByGroup = new Map<string, number>()
  for (const row of openRows) {
    if (!groupIds.has(row.group_id)) continue
    openCountByGroup.set(
      row.group_id,
      (openCountByGroup.get(row.group_id) ?? 0) + 1,
    )
  }

  const origin = getAppUrl()
  const groups: PhotoShareGroupListItem[] = groupRows.map((group) => {
    const assets = (assetsByGroup.get(group.id) ?? [])
      .sort((a, b) => a.order - b.order)
      .map((a) => a.id)
    return {
      id: group.id,
      name: group.name,
      share_token: group.share_token,
      created_at: group.created_at,
      assetIds: assets,
      guestIds: guestsByGroup.get(group.id) ?? [],
      openCount: openCountByGroup.get(group.id) ?? 0,
      groupUrl: `${origin}/photos/${group.share_token}`,
    }
  })

  const guests: PhotoShareGuestOption[] = guestRows.map((guest) => ({
    id: guest.id,
    first_name: guest.first_name,
    last_name: guest.last_name,
    email: guest.email,
    rsvp_token: guest.rsvp_token,
    assignedGroupId: guestGroupById.get(guest.id) ?? null,
  }))

  return { groups, guests }
}

export async function createPhotoShareGroupHandler(input: {
  name: string
  assetIds: string[]
  guestIds: string[]
}): Promise<PhotoShareGroupListItem> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const name = input.name.trim()
  if (!name) throw new Error('Share name is required.')

  await assertAssetsBelongToWedding(session.wedding.id, input.assetIds)
  await assertGuestsAvailable(session.wedding.id, input.guestIds, null)

  const shareToken = newShareToken()
  const created = await admin
    .from('photo_share_groups')
    .insert({
      wedding_id: session.wedding.id,
      name,
      share_token: shareToken,
    })
    .select('*')
    .single()

  if (created.error) throw new Error(created.error.message)

  await replaceGroupMemberships(created.data.id, input.assetIds, input.guestIds)

  const listed = await listPhotoShareGroupsHandler()
  const group = listed.groups.find((g) => g.id === created.data.id)
  if (!group) throw new Error('Share group could not be loaded.')
  return group
}

export async function updatePhotoShareGroupHandler(input: {
  groupId: string
  name: string
  assetIds: string[]
  guestIds: string[]
}): Promise<PhotoShareGroupListItem> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const name = input.name.trim()
  if (!name) throw new Error('Share name is required.')

  const existing = await admin
    .from('photo_share_groups')
    .select('*')
    .eq('id', input.groupId)
    .eq('wedding_id', session.wedding.id)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Share group not found.')

  await assertAssetsBelongToWedding(session.wedding.id, input.assetIds)
  await assertGuestsAvailable(session.wedding.id, input.guestIds, input.groupId)

  const updated = await admin
    .from('photo_share_groups')
    .update({ name })
    .eq('id', input.groupId)
    .eq('wedding_id', session.wedding.id)

  if (updated.error) throw new Error(updated.error.message)

  await replaceGroupMemberships(input.groupId, input.assetIds, input.guestIds)

  const listed = await listPhotoShareGroupsHandler()
  const group = listed.groups.find((g) => g.id === input.groupId)
  if (!group) throw new Error('Share group could not be loaded.')
  return group
}

export async function deletePhotoShareGroupHandler(
  groupId: string,
): Promise<{ ok: true }> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const removed = await admin
    .from('photo_share_groups')
    .delete()
    .eq('id', groupId)
    .eq('wedding_id', session.wedding.id)

  if (removed.error) throw new Error(removed.error.message)
  return { ok: true }
}

export type SendPhotoShareEmailsResult = {
  sent: number
  skipped: number
  failed: Array<{ guestId: string; email: string; error: string }>
}

export async function sendPhotoShareEmailsHandler(
  groupId: string,
): Promise<SendPhotoShareEmailsResult> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const groupResult = await admin
    .from('photo_share_groups')
    .select('id, name, share_token')
    .eq('id', groupId)
    .eq('wedding_id', session.wedding.id)
    .maybeSingle()

  if (groupResult.error) throw new Error(groupResult.error.message)
  if (!groupResult.data) throw new Error('Share group not found.')

  const members = await admin
    .from('photo_share_group_guests')
    .select('guest_id')
    .eq('group_id', groupId)

  if (members.error) throw new Error(members.error.message)

  const guestIds = members.data.map((row) => row.guest_id)
  if (guestIds.length === 0) {
    return { sent: 0, skipped: 0, failed: [] }
  }

  const guestsResult = await admin
    .from('guests')
    .select('id, first_name, email, rsvp_token')
    .eq('wedding_id', session.wedding.id)
    .in('id', guestIds)

  if (guestsResult.error) throw new Error(guestsResult.error.message)

  const coupleLabel = formatCoupleNames(
    session.wedding.groom_name,
    session.wedding.bride_name,
  )
  const origin = getAppUrl()
  const group = groupResult.data

  let sent = 0
  let skipped = 0
  const failed: SendPhotoShareEmailsResult['failed'] = []

  for (const guest of guestsResult.data) {
    const email = guest.email?.trim().toLowerCase()
    if (!email) {
      skipped += 1
      continue
    }
    try {
      await sendGuestPhotoShareEmail({
        to: email,
        guestName: guest.first_name,
        coupleLabel,
        shareName: group.name,
        photosUrl: `${origin}/photos/${group.share_token}?g=${encodeURIComponent(guest.rsvp_token)}`,
        theme: resolveEmailThemeId(session.wedding.active_public_theme),
        replyTo: session.user.email,
      })
      sent += 1
    } catch (err) {
      failed.push({
        guestId: guest.id,
        email,
        error: err instanceof Error ? err.message : 'Unable to send email.',
      })
    }
  }

  return { sent, skipped, failed }
}

export async function getPhotoShareViewerHandler(input: {
  token: string
  guestRsvpToken?: string
}): Promise<PhotoShareViewerData> {
  const admin = createAdminSupabaseClient()
  const token = input.token.trim()
  if (!token) throw new Error('Share link is invalid.')

  const groupResult = await admin
    .from('photo_share_groups')
    .select('*')
    .eq('share_token', token)
    .maybeSingle()

  if (groupResult.error) throw new Error(groupResult.error.message)
  if (!groupResult.data) throw new Error('This photo share link is invalid.')

  const group = groupResult.data

  const weddingResult = await admin
    .from('weddings')
    .select(
      'groom_name, bride_name, wedding_date, date_published_at, active_public_theme',
    )
    .eq('id', group.wedding_id)
    .single()

  if (weddingResult.error) throw new Error(weddingResult.error.message)

  let guestId: string | null = null
  let guestFirstName: string | null = null
  const guestToken = input.guestRsvpToken?.trim()
  if (guestToken) {
    const guestResult = await admin
      .from('guests')
      .select('id, first_name, wedding_id')
      .eq('rsvp_token', guestToken)
      .eq('wedding_id', group.wedding_id)
      .maybeSingle()

    if (guestResult.data) {
      const membership = await admin
        .from('photo_share_group_guests')
        .select('guest_id')
        .eq('group_id', group.id)
        .eq('guest_id', guestResult.data.id)
        .maybeSingle()

      if (membership.data) {
        guestId = guestResult.data.id
        guestFirstName = guestResult.data.first_name
      }
    }
  }

  const linksResult = await admin
    .from('photo_share_group_assets')
    .select('media_asset_id, sort_order')
    .eq('group_id', group.id)
    .order('sort_order', { ascending: true })

  if (linksResult.error) throw new Error(linksResult.error.message)

  const assetIds = linksResult.data.map((row) => row.media_asset_id)
  const assetsById = new Map<
    string,
    { id: string; storage_path: string; filename: string }
  >()

  if (assetIds.length > 0) {
    const assetsResult = await admin
      .from('media_assets')
      .select('id, storage_path, filename')
      .in('id', assetIds)
    if (assetsResult.error) throw new Error(assetsResult.error.message)
    for (const asset of assetsResult.data) {
      assetsById.set(asset.id, asset)
    }
  }

  const photos: PhotoShareViewerData['photos'] = []
  for (const row of linksResult.data) {
    const asset = assetsById.get(row.media_asset_id)
    if (!asset) continue
    const url = await createPhotoSignedUrl(asset.storage_path)
    if (!url) continue
    photos.push({
      id: asset.id,
      url,
      filename: asset.filename,
    })
  }

  await admin.from('photo_share_opens').insert({
    group_id: group.id,
    guest_id: guestId,
    user_agent: null,
  })

  const coupleLabel = formatCoupleNames(
    weddingResult.data.groom_name,
    weddingResult.data.bride_name,
  )

  const publicDate = resolvePublicWeddingDate(weddingResult.data)

  return {
    coupleLabel,
    weddingDate: publicDate,
    weddingDateLabel: formatWeddingDate(publicDate),
    theme: weddingResult.data.active_public_theme,
    groupName: group.name,
    photos,
    guestFirstName,
  }
}

async function assertAssetsBelongToWedding(
  weddingId: string,
  assetIds: string[],
) {
  if (assetIds.length === 0) return
  const admin = createAdminSupabaseClient()
  const result = await admin
    .from('media_assets')
    .select('id')
    .eq('wedding_id', weddingId)
    .in('id', assetIds)

  if (result.error) throw new Error(result.error.message)
  if (result.data.length !== assetIds.length) {
    throw new Error('One or more selected photos are invalid.')
  }
}

async function assertGuestsAvailable(
  weddingId: string,
  guestIds: string[],
  currentGroupId: string | null,
) {
  if (guestIds.length === 0) return
  const admin = createAdminSupabaseClient()

  const guests = await admin
    .from('guests')
    .select('id')
    .eq('wedding_id', weddingId)
    .in('id', guestIds)

  if (guests.error) throw new Error(guests.error.message)
  if (guests.data.length !== guestIds.length) {
    throw new Error('One or more selected guests are invalid.')
  }

  const memberships = await admin
    .from('photo_share_group_guests')
    .select('guest_id, group_id')
    .in('guest_id', guestIds)

  if (memberships.error) throw new Error(memberships.error.message)

  for (const row of memberships.data) {
    if (currentGroupId && row.group_id === currentGroupId) continue
    throw new Error(
      'A selected guest is already in another photo share group.',
    )
  }
}

async function replaceGroupMemberships(
  groupId: string,
  assetIds: string[],
  guestIds: string[],
) {
  const admin = createAdminSupabaseClient()

  const clearAssets = await admin
    .from('photo_share_group_assets')
    .delete()
    .eq('group_id', groupId)
  if (clearAssets.error) throw new Error(clearAssets.error.message)

  const clearGuests = await admin
    .from('photo_share_group_guests')
    .delete()
    .eq('group_id', groupId)
  if (clearGuests.error) throw new Error(clearGuests.error.message)

  if (assetIds.length > 0) {
    const inserted = await admin.from('photo_share_group_assets').insert(
      assetIds.map((media_asset_id, index) => ({
        group_id: groupId,
        media_asset_id,
        sort_order: index,
      })),
    )
    if (inserted.error) throw new Error(inserted.error.message)
  }

  if (guestIds.length > 0) {
    const inserted = await admin.from('photo_share_group_guests').insert(
      guestIds.map((guest_id) => ({
        group_id: groupId,
        guest_id,
      })),
    )
    if (inserted.error) throw new Error(inserted.error.message)
  }
}
