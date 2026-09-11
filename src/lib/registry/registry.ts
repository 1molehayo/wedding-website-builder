import { createServerFn } from '@tanstack/react-start'
import {
  parseRegistryAccountInput,
  parseRegistryItemInput,
} from '@/lib/registry/schema'
import type {
  PublicRegistryData,
  PublicRegistryItem,
  RegistryAdminData,
} from '@/lib/registry/registry.server'
import type { RegistryAccount, RegistryItem } from '@/lib/supabase/types'

export type {
  PublicRegistryAccount,
  PublicRegistryData,
  PublicRegistryItem,
  RegistryAdminData,
} from '@/lib/registry/registry.server'

export const listRegistryAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<RegistryAdminData> => {
    const { listRegistryAdminHandler } = await import('./registry.server')
    return listRegistryAdminHandler()
  },
)

export const createRegistryItem = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseRegistryItemInput(data))
  .handler(async ({ data }): Promise<RegistryItem> => {
    const { createRegistryItemHandler } = await import('./registry.server')
    return createRegistryItemHandler(data)
  })

export const updateRegistryItem = createServerFn({ method: 'POST' })
  .validator((data: { itemId: string } & Record<string, unknown>) => {
    const itemId = String(data.itemId).trim()
    if (!itemId) throw new Error('Item id is required.')
    return { itemId, input: parseRegistryItemInput(data) }
  })
  .handler(async ({ data }): Promise<RegistryItem> => {
    const { updateRegistryItemHandler } = await import('./registry.server')
    return updateRegistryItemHandler(data.itemId, data.input)
  })

export const deleteRegistryItem = createServerFn({ method: 'POST' })
  .validator((data: { itemId: string }) => {
    const itemId = String(data.itemId).trim()
    if (!itemId) throw new Error('Item id is required.')
    return { itemId }
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { deleteRegistryItemHandler } = await import('./registry.server')
    return deleteRegistryItemHandler(data.itemId)
  })

export const createRegistryAccount = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseRegistryAccountInput(data))
  .handler(async ({ data }): Promise<RegistryAccount> => {
    const { createRegistryAccountHandler } = await import('./registry.server')
    return createRegistryAccountHandler(data)
  })

export const updateRegistryAccount = createServerFn({ method: 'POST' })
  .validator((data: { accountId: string } & Record<string, unknown>) => {
    const accountId = String(data.accountId).trim()
    if (!accountId) throw new Error('Account id is required.')
    return { accountId, input: parseRegistryAccountInput(data) }
  })
  .handler(async ({ data }): Promise<RegistryAccount> => {
    const { updateRegistryAccountHandler } = await import('./registry.server')
    return updateRegistryAccountHandler(data.accountId, data.input)
  })

export const deleteRegistryAccount = createServerFn({ method: 'POST' })
  .validator((data: { accountId: string }) => {
    const accountId = String(data.accountId).trim()
    if (!accountId) throw new Error('Account id is required.')
    return { accountId }
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { deleteRegistryAccountHandler } = await import('./registry.server')
    return deleteRegistryAccountHandler(data.accountId)
  })

export const reserveRegistryItem = createServerFn({ method: 'POST' })
  .validator((data: {
    itemId: string
    guestName?: string | null
    quantity?: number
  }) => {
    const itemId = String(data.itemId).trim()
    if (!itemId) throw new Error('Item id is required.')
    const quantity = Number(data.quantity ?? 1)
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error('Quantity must be at least 1.')
    }
    const guestName =
      data.guestName == null ? null : String(data.guestName).trim() || null
    return { itemId, guestName, quantity }
  })
  .handler(async ({ data }): Promise<PublicRegistryItem> => {
    const { reserveRegistryItemHandler } = await import('./registry.server')
    return reserveRegistryItemHandler(data)
  })

export const getPublicRegistry = createServerFn({ method: 'GET' })
  .validator((data: { slug: string }) => {
    const slug = String(data.slug).trim().toLowerCase()
    if (!slug) throw new Error('Wedding slug is required.')
    return { slug }
  })
  .handler(async ({ data }): Promise<PublicRegistryData> => {
    const { getPublicRegistryBySlugHandler } = await import('./registry.server')
    return getPublicRegistryBySlugHandler(data.slug)
  })
