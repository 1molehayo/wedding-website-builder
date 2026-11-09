import { recordActivity } from '@/lib/activity/activity.server'
import { requireWeddingSession } from '@/lib/auth/session.server'
import type { AdminSessionWithWedding } from '@/lib/auth/session.server'
import {
  createPhotoSignedUrl,
  createRegistrySignedUpload,
} from '@/lib/page-blocks/storage.server'
import type {
  RegistryAccountFormValues,
  RegistryItemFormValues,
} from '@/lib/registry/schema'
import {
  listAdminContributionsHandler,
  remainingForGift,
} from '@/lib/registry/contribution.server'
import type { AdminContribution } from '@/lib/registry/contribution.server'
import { giftStillOpen } from '@/lib/registry/remaining'
import { formatRegistryPriceLabel } from '@/lib/registry/schema'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import { REGISTRY_PROVIDER_LABELS } from '@/lib/registry/providers'
import type {
  RegistryAccount,
  RegistryItem,
  RegistryItemListing,
  RegistryItemPrice,
  RegistryReservation,
} from '@/lib/supabase/types'

const ITEM_SELECT =
  'id, wedding_id, title, description, store_url, photo_path, price_label, desired_qty, claimed_qty, status, sort_order, is_visible, created_at, updated_at'

const ACCOUNT_SELECT =
  'id, wedding_id, label, bank_name, currency, account_name, account_number, routing_number, notes, sort_order, is_enabled, created_at, updated_at'

export type PublicRegistryListing = {
  provider: string
  label: string
  url: string
}

export type PublicRegistryItem = {
  id: string
  title: string
  description: string | null
  store_url: string | null
  photo_path: string | null
  price_label: string | null
  prices: Array<{
    currency: string
    original: number
    remaining: number
  }>
  listings: PublicRegistryListing[]
  /** True while the base-currency remaining is above zero. */
  is_open: boolean
  desired_qty: number
  claimed_qty: number
  remaining_qty: number
  status: RegistryItem['status']
}

export type PublicRegistryAccount = {
  id: string
  label: string
  bank_name: string | null
  currency: string
  account_name: string
  account_number: string
  routing_number: string | null
  notes: string | null
}

export type PublicRegistryData = {
  items: PublicRegistryItem[]
  accounts: PublicRegistryAccount[]
  hasContent: boolean
}

export type RegistryAdminItem = RegistryItem & {
  prices: RegistryItemPrice[]
  listings: RegistryItemListing[]
}

export type RegistryAdminData = {
  items: RegistryAdminItem[]
  accounts: RegistryAccount[]
  reservations: RegistryReservation[]
  contributions: AdminContribution[]
}

function deriveItemStatus(
  desired: number,
  claimed: number,
  preferred: RegistryItem['status'],
): RegistryItem['status'] {
  if (preferred === 'purchased') return 'purchased'
  if (claimed >= desired) return 'reserved'
  if (preferred === 'reserved' && claimed > 0) return 'reserved'
  return 'available'
}

const PRICE_SELECT =
  'id, item_id, wedding_id, currency, amount, created_at, updated_at'

function mapPriceRow(row: {
  id: string
  item_id: string
  wedding_id: string
  currency: string
  amount: number | string
  created_at: string
  updated_at: string
}): RegistryItemPrice {
  return {
    ...row,
    amount: Number(row.amount),
  }
}

const LISTING_SELECT =
  'id, item_id, wedding_id, provider, url, label, sort_order, created_at, updated_at'

async function loadPricesForWedding(
  weddingId: string,
): Promise<RegistryItemPrice[]> {
  const admin = createAdminSupabaseClient()
  const result = await admin
    .from('registry_item_prices')
    .select(PRICE_SELECT)
    .eq('wedding_id', weddingId)
    .order('currency', { ascending: true })

  if (result.error) throw new Error(result.error.message)
  return result.data.map((row) => mapPriceRow(row))
}

async function loadListingsForWedding(
  weddingId: string,
): Promise<RegistryItemListing[]> {
  const admin = createAdminSupabaseClient()
  const result = await admin
    .from('registry_item_listings')
    .select(LISTING_SELECT)
    .eq('wedding_id', weddingId)
    .order('sort_order', { ascending: true })
    .order('provider', { ascending: true })

  if (result.error) throw new Error(result.error.message)
  return result.data
}

function pricesByItem(
  prices: RegistryItemPrice[],
): Map<string, RegistryItemPrice[]> {
  const grouped = new Map<string, RegistryItemPrice[]>()
  for (const price of prices) {
    const list = grouped.get(price.item_id) ?? []
    list.push(price)
    grouped.set(price.item_id, list)
  }
  return grouped
}

function listingsByItem(
  listings: RegistryItemListing[],
): Map<string, RegistryItemListing[]> {
  const grouped = new Map<string, RegistryItemListing[]>()
  for (const listing of listings) {
    const list = grouped.get(listing.item_id) ?? []
    list.push(listing)
    grouped.set(listing.item_id, list)
  }
  return grouped
}

async function replaceAmazonListing(
  weddingId: string,
  itemId: string,
  amazonUrl: string | null,
): Promise<void> {
  const admin = createAdminSupabaseClient()
  const removed = await admin
    .from('registry_item_listings')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('item_id', itemId)
    .eq('provider', 'amazon')

  if (removed.error) throw new Error(removed.error.message)
  if (!amazonUrl) return

  const inserted = await admin.from('registry_item_listings').insert({
    wedding_id: weddingId,
    item_id: itemId,
    provider: 'amazon',
    url: amazonUrl,
    label: REGISTRY_PROVIDER_LABELS.amazon,
    sort_order: 0,
  })

  if (inserted.error) throw new Error(inserted.error.message)
}

async function replaceItemPrices(
  weddingId: string,
  itemId: string,
  prices: RegistryItemFormValues['prices'],
): Promise<void> {
  const admin = createAdminSupabaseClient()
  const removed = await admin
    .from('registry_item_prices')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('item_id', itemId)

  if (removed.error) throw new Error(removed.error.message)

  const inserted = await admin.from('registry_item_prices').insert(
    prices.map((price) => ({
      wedding_id: weddingId,
      item_id: itemId,
      currency: price.currency,
      amount: price.amount,
    })),
  )

  if (inserted.error) throw new Error(inserted.error.message)
}

async function removeGiftPhoto(path: string | null): Promise<void> {
  if (!path?.startsWith('registry/') || path.includes('..')) return
  const admin = createAdminSupabaseClient()
  await admin.storage.from('photos').remove([path])
}

async function logRegistryChange(
  session: AdminSessionWithWedding,
  action: string,
  entityId: string | null,
  summary: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordActivity({
    weddingId: session.wedding.id,
    actorId: session.user.id,
    actorEmail: session.profile.email ?? session.user.email ?? null,
    actorRole: session.profile.role,
    action,
    entityType: 'registry',
    entityId,
    summary,
    metadata,
  })
}

export async function listRegistryAdminHandler(): Promise<RegistryAdminData> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const weddingId = session.wedding.id

  const [
    itemsResult,
    accountsResult,
    reservationsResult,
    prices,
    listings,
    contributions,
  ] = await Promise.all([
    admin
      .from('registry_items')
      .select(ITEM_SELECT)
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('registry_accounts')
      .select(ACCOUNT_SELECT)
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('registry_reservations')
      .select('id, wedding_id, item_id, guest_name, quantity, created_at')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false }),
    loadPricesForWedding(weddingId),
    loadListingsForWedding(weddingId),
    listAdminContributionsHandler(weddingId),
  ])

  if (itemsResult.error) throw new Error(itemsResult.error.message)
  if (accountsResult.error) throw new Error(accountsResult.error.message)
  if (reservationsResult.error)
    throw new Error(reservationsResult.error.message)

  const grouped = pricesByItem(prices)
  const listingsGrouped = listingsByItem(listings)

  return {
    items: itemsResult.data.map((item) => ({
      ...item,
      prices: grouped.get(item.id) ?? [],
      listings: listingsGrouped.get(item.id) ?? [],
    })),
    accounts: accountsResult.data,
    reservations: reservationsResult.data,
    contributions,
  }
}

export async function createRegistryItemHandler(
  input: RegistryItemFormValues,
): Promise<RegistryItem> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const maxOrder = await admin
    .from('registry_items')
    .select('sort_order')
    .eq('wedding_id', session.wedding.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sort_order = (maxOrder.data?.sort_order ?? -1) + 1
  const status = deriveItemStatus(
    input.desired_qty,
    input.claimed_qty,
    input.status,
  )

  const inserted = await admin
    .from('registry_items')
    .insert({
      wedding_id: session.wedding.id,
      title: input.title,
      description: input.description,
      store_url: input.store_url,
      photo_path: input.photo_path,
      price_label: formatRegistryPriceLabel(input.prices),
      desired_qty: input.desired_qty,
      claimed_qty: input.claimed_qty,
      status,
      is_visible: input.is_visible,
      sort_order,
    })
    .select(ITEM_SELECT)
    .single()

  if (inserted.error) throw new Error(inserted.error.message)

  try {
    await replaceItemPrices(session.wedding.id, inserted.data.id, input.prices)
    await replaceAmazonListing(
      session.wedding.id,
      inserted.data.id,
      input.amazon_url,
    )
  } catch (error) {
    await admin.from('registry_items').delete().eq('id', inserted.data.id)
    throw error
  }

  await logRegistryChange(
    session,
    'registry.gift_created',
    inserted.data.id,
    `Added gift “${input.title}”.`,
    {
      title: input.title,
      prices: input.prices,
      hasAmazon: Boolean(input.amazon_url),
    },
  )

  return inserted.data
}

export async function updateRegistryItemHandler(
  itemId: string,
  input: RegistryItemFormValues,
): Promise<RegistryItem> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const existing = await admin
    .from('registry_items')
    .select('photo_path')
    .eq('id', itemId)
    .eq('wedding_id', session.wedding.id)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Gift not found.')

  const status = deriveItemStatus(
    input.desired_qty,
    input.claimed_qty,
    input.status,
  )

  const updated = await admin
    .from('registry_items')
    .update({
      title: input.title,
      description: input.description,
      store_url: input.store_url,
      photo_path: input.photo_path,
      price_label: formatRegistryPriceLabel(input.prices),
      desired_qty: input.desired_qty,
      claimed_qty: input.claimed_qty,
      status,
      is_visible: input.is_visible,
    })
    .eq('id', itemId)
    .eq('wedding_id', session.wedding.id)
    .select(ITEM_SELECT)
    .single()

  if (updated.error) throw new Error(updated.error.message)

  await replaceItemPrices(session.wedding.id, itemId, input.prices)
  await replaceAmazonListing(session.wedding.id, itemId, input.amazon_url)
  if (existing.data.photo_path !== input.photo_path) {
    await removeGiftPhoto(existing.data.photo_path)
  }

  await logRegistryChange(
    session,
    'registry.gift_updated',
    itemId,
    `Updated gift “${input.title}”.`,
    { title: input.title, prices: input.prices },
  )

  return updated.data
}

export async function deleteRegistryItemHandler(
  itemId: string,
): Promise<{ ok: true }> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const existing = await admin
    .from('registry_items')
    .select('title, photo_path')
    .eq('id', itemId)
    .eq('wedding_id', session.wedding.id)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Gift not found.')

  const deleted = await admin
    .from('registry_items')
    .delete()
    .eq('id', itemId)
    .eq('wedding_id', session.wedding.id)

  if (deleted.error) {
    if (deleted.error.code === '23503') {
      throw new Error('This gift has contributions, so it cannot be deleted.')
    }
    throw new Error(deleted.error.message)
  }

  await removeGiftPhoto(existing.data.photo_path)
  await logRegistryChange(
    session,
    'registry.gift_deleted',
    itemId,
    `Removed gift “${existing.data.title}”.`,
    { title: existing.data.title },
  )

  return { ok: true }
}

export async function createRegistryAccountHandler(
  input: RegistryAccountFormValues,
): Promise<RegistryAccount> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const maxOrder = await admin
    .from('registry_accounts')
    .select('sort_order')
    .eq('wedding_id', session.wedding.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sort_order = (maxOrder.data?.sort_order ?? -1) + 1

  const inserted = await admin
    .from('registry_accounts')
    .insert({
      wedding_id: session.wedding.id,
      label: input.label,
      bank_name: input.bank_name,
      currency: input.currency,
      account_name: input.account_name,
      account_number: input.account_number,
      routing_number: input.routing_number,
      notes: input.notes,
      is_enabled: input.is_enabled,
      sort_order,
    })
    .select(ACCOUNT_SELECT)
    .single()

  if (inserted.error) throw new Error(inserted.error.message)
  await logRegistryChange(
    session,
    'registry.account_created',
    inserted.data.id,
    `Added bank account “${input.label}”.`,
    {
      label: input.label,
      currency: input.currency,
      account_number: input.account_number,
    },
  )
  return inserted.data
}

export async function updateRegistryAccountHandler(
  accountId: string,
  input: RegistryAccountFormValues,
): Promise<RegistryAccount> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const updated = await admin
    .from('registry_accounts')
    .update({
      label: input.label,
      bank_name: input.bank_name,
      currency: input.currency,
      account_name: input.account_name,
      account_number: input.account_number,
      routing_number: input.routing_number,
      notes: input.notes,
      is_enabled: input.is_enabled,
    })
    .eq('id', accountId)
    .eq('wedding_id', session.wedding.id)
    .select(ACCOUNT_SELECT)
    .single()

  if (updated.error) throw new Error(updated.error.message)
  await logRegistryChange(
    session,
    'registry.account_updated',
    accountId,
    `Updated bank account “${input.label}”.`,
    {
      label: input.label,
      currency: input.currency,
      account_number: input.account_number,
    },
  )
  return updated.data
}

export async function deleteRegistryAccountHandler(
  accountId: string,
): Promise<{ ok: true }> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const existing = await admin
    .from('registry_accounts')
    .select('label')
    .eq('id', accountId)
    .eq('wedding_id', session.wedding.id)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Bank account not found.')

  const deleted = await admin
    .from('registry_accounts')
    .delete()
    .eq('id', accountId)
    .eq('wedding_id', session.wedding.id)

  if (deleted.error) {
    if (deleted.error.code === '23503') {
      throw new Error(
        'This account is used by a contribution, so it cannot be deleted.',
      )
    }
    throw new Error(deleted.error.message)
  }

  await logRegistryChange(
    session,
    'registry.account_deleted',
    accountId,
    `Removed bank account “${existing.data.label}”.`,
    { label: existing.data.label },
  )
  return { ok: true }
}

export async function getPublicRegistryBySlugHandler(
  weddingSlug: string,
): Promise<PublicRegistryData> {
  const admin = createAdminSupabaseClient()
  const wedding = await admin
    .from('weddings')
    .select('id')
    .eq('public_slug', weddingSlug)
    .maybeSingle()

  if (wedding.error) throw new Error(wedding.error.message)
  if (!wedding.data) throw new Error('Wedding not found.')

  return getPublicRegistryForWeddingId(wedding.data.id as string)
}

export async function getPublicRegistryForWeddingId(
  weddingId: string,
): Promise<PublicRegistryData> {
  const admin = createAdminSupabaseClient()

  const [itemsResult, accountsResult, prices, listings] = await Promise.all([
    admin
      .from('registry_items')
      .select(
        'id, title, description, store_url, photo_path, price_label, desired_qty, claimed_qty, status',
      )
      .eq('wedding_id', weddingId)
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('registry_accounts')
      .select(
        'id, label, bank_name, currency, account_name, account_number, routing_number, notes',
      )
      .eq('wedding_id', weddingId)
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    loadPricesForWedding(weddingId),
    loadListingsForWedding(weddingId),
  ])

  if (itemsResult.error) throw new Error(itemsResult.error.message)
  if (accountsResult.error) throw new Error(accountsResult.error.message)

  const grouped = pricesByItem(prices)
  const listingsGrouped = listingsByItem(listings)

  const items: PublicRegistryItem[] = await Promise.all(
    itemsResult.data.map(async (row) => {
      const desired = Number(row.desired_qty)
      const claimed = Number(row.claimed_qty)
      const listed = (grouped.get(row.id) ?? []).map((price) => ({
        currency: price.currency,
        amount: price.amount,
      }))
      const remaining =
        listed.length > 0
          ? await remainingForGift(weddingId, row.id, listed)
          : []
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        store_url: row.store_url,
        photo_path: row.photo_path,
        price_label: row.price_label,
        prices: remaining,
        listings: (listingsGrouped.get(row.id) ?? []).map((listing) => ({
          provider: listing.provider,
          label: listing.label,
          url: listing.url,
        })),
        is_open: giftStillOpen(remaining),
        desired_qty: desired,
        claimed_qty: claimed,
        remaining_qty: Math.max(0, desired - claimed),
        status: row.status,
      }
    }),
  )

  const accounts: PublicRegistryAccount[] = accountsResult.data

  return {
    items,
    accounts,
    hasContent: items.length > 0 || accounts.length > 0,
  }
}

export async function reserveRegistryItemHandler(input: {
  itemId: string
  guestName: string | null
  quantity: number
}): Promise<PublicRegistryItem> {
  const quantity = Math.max(1, Math.min(20, Math.floor(input.quantity)))
  const guestName = input.guestName?.trim() || null
  if (guestName && guestName.length > 80) {
    throw new Error('Name must be 80 characters or fewer.')
  }

  const admin = createAdminSupabaseClient()
  const itemResult = await admin
    .from('registry_items')
    .select(ITEM_SELECT)
    .eq('id', input.itemId)
    .eq('is_visible', true)
    .maybeSingle()

  if (itemResult.error) throw new Error(itemResult.error.message)
  if (!itemResult.data) throw new Error('Gift item not found.')

  const item = itemResult.data
  if (item.status === 'purchased') {
    throw new Error('This gift is already marked purchased.')
  }

  const remainingQty = item.desired_qty - item.claimed_qty
  if (remainingQty <= 0) {
    throw new Error('This gift is fully reserved.')
  }
  if (quantity > remainingQty) {
    throw new Error(
      remainingQty === 1
        ? 'Only 1 left to reserve.'
        : `Only ${remainingQty} left to reserve.`,
    )
  }

  const nextClaimed = item.claimed_qty + quantity
  const nextStatus = deriveItemStatus(
    item.desired_qty,
    nextClaimed,
    item.status,
  )

  const updated = await admin
    .from('registry_items')
    .update({
      claimed_qty: nextClaimed,
      status: nextStatus,
    })
    .eq('id', item.id)
    .eq('wedding_id', item.wedding_id)
    .eq('claimed_qty', item.claimed_qty)
    .select(ITEM_SELECT)
    .maybeSingle()

  if (updated.error) throw new Error(updated.error.message)
  if (!updated.data) {
    throw new Error('Someone else just reserved this. Refresh and try again.')
  }

  const reservation = await admin.from('registry_reservations').insert({
    wedding_id: item.wedding_id,
    item_id: item.id,
    guest_name: guestName,
    quantity,
  })

  if (reservation.error) {
    console.error('[registry] reservation row failed', reservation.error)
  }

  const row = updated.data
  const listed = (await loadPricesForWedding(row.wedding_id))
    .filter((price) => price.item_id === row.id)
    .map((price) => ({
      currency: price.currency,
      amount: price.amount,
    }))
  const remainingPriceRows =
    listed.length > 0
      ? await remainingForGift(row.wedding_id, row.id, listed)
      : []
  const listings = (await loadListingsForWedding(row.wedding_id))
    .filter((listing) => listing.item_id === row.id)
    .map((listing) => ({
      provider: listing.provider,
      label: listing.label,
      url: listing.url,
    }))
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    store_url: row.store_url,
    photo_path: row.photo_path,
    price_label: row.price_label,
    prices: remainingPriceRows,
    listings,
    is_open: giftStillOpen(remainingPriceRows),
    desired_qty: row.desired_qty,
    claimed_qty: row.claimed_qty,
    remaining_qty: Math.max(0, row.desired_qty - row.claimed_qty),
    status: row.status,
  }
}

export async function createRegistryPhotoUploadHandler(input: {
  name: string
  type: string
  byteSize: number
}) {
  await requireWeddingSession()
  return createRegistrySignedUpload(input)
}

export async function confirmRegistryPhotoUploadHandler(input: {
  path: string
}): Promise<{ path: string; signedUrl: string }> {
  await requireWeddingSession()
  const path = input.path.trim()
  if (!path.startsWith('registry/') || path.includes('..')) {
    throw new Error('Invalid image path.')
  }
  const signedUrl = await createPhotoSignedUrl(path)
  if (!signedUrl) {
    throw new Error('Upload did not complete. Please try again.')
  }
  return { path, signedUrl }
}
