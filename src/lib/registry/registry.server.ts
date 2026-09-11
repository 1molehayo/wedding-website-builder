import { requireWeddingSession } from '@/lib/auth/session.server'
import type {
  RegistryAccountFormValues,
  RegistryItemFormValues,
} from '@/lib/registry/schema'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import type {
  RegistryAccount,
  RegistryItem,
  RegistryReservation,
} from '@/lib/supabase/types'

const ITEM_SELECT =
  'id, wedding_id, title, description, store_url, price_label, desired_qty, claimed_qty, status, sort_order, is_visible, created_at, updated_at'

const ACCOUNT_SELECT =
  'id, wedding_id, label, bank_name, currency, account_name, account_number, routing_number, notes, sort_order, is_enabled, created_at, updated_at'

export type PublicRegistryItem = {
  id: string
  title: string
  description: string | null
  store_url: string
  price_label: string | null
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

export type RegistryAdminData = {
  items: RegistryItem[]
  accounts: RegistryAccount[]
  reservations: RegistryReservation[]
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

export async function listRegistryAdminHandler(): Promise<RegistryAdminData> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const weddingId = session.wedding.id

  const [itemsResult, accountsResult, reservationsResult] = await Promise.all([
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
  ])

  if (itemsResult.error) throw new Error(itemsResult.error.message)
  if (accountsResult.error) throw new Error(accountsResult.error.message)
  if (reservationsResult.error) throw new Error(reservationsResult.error.message)

  return {
    items: itemsResult.data,
    accounts: accountsResult.data,
    reservations: reservationsResult.data,
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
      price_label: input.price_label,
      desired_qty: input.desired_qty,
      claimed_qty: input.claimed_qty,
      status,
      is_visible: input.is_visible,
      sort_order,
    })
    .select(ITEM_SELECT)
    .single()

  if (inserted.error) throw new Error(inserted.error.message)
  return inserted.data
}

export async function updateRegistryItemHandler(
  itemId: string,
  input: RegistryItemFormValues,
): Promise<RegistryItem> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
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
      price_label: input.price_label,
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
  return updated.data
}

export async function deleteRegistryItemHandler(
  itemId: string,
): Promise<{ ok: true }> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const deleted = await admin
    .from('registry_items')
    .delete()
    .eq('id', itemId)
    .eq('wedding_id', session.wedding.id)

  if (deleted.error) throw new Error(deleted.error.message)
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
  return updated.data
}

export async function deleteRegistryAccountHandler(
  accountId: string,
): Promise<{ ok: true }> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const deleted = await admin
    .from('registry_accounts')
    .delete()
    .eq('id', accountId)
    .eq('wedding_id', session.wedding.id)

  if (deleted.error) throw new Error(deleted.error.message)
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

  const [itemsResult, accountsResult] = await Promise.all([
    admin
      .from('registry_items')
      .select(
        'id, title, description, store_url, price_label, desired_qty, claimed_qty, status',
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
  ])

  if (itemsResult.error) throw new Error(itemsResult.error.message)
  if (accountsResult.error) throw new Error(accountsResult.error.message)

  const items: PublicRegistryItem[] = itemsResult.data.map((row) => {
    const desired = Number(row.desired_qty)
    const claimed = Number(row.claimed_qty)
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      store_url: row.store_url,
      price_label: row.price_label,
      desired_qty: desired,
      claimed_qty: claimed,
      remaining_qty: Math.max(0, desired - claimed),
      status: row.status,
    }
  })

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

  const remaining = item.desired_qty - item.claimed_qty
  if (remaining <= 0) {
    throw new Error('This gift is fully reserved.')
  }
  if (quantity > remaining) {
    throw new Error(
      remaining === 1
        ? 'Only 1 left to reserve.'
        : `Only ${remaining} left to reserve.`,
    )
  }

  const nextClaimed = item.claimed_qty + quantity
  const nextStatus = deriveItemStatus(item.desired_qty, nextClaimed, item.status)

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
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    store_url: row.store_url,
    price_label: row.price_label,
    desired_qty: row.desired_qty,
    claimed_qty: row.claimed_qty,
    remaining_qty: Math.max(0, row.desired_qty - row.claimed_qty),
    status: row.status,
  }
}
