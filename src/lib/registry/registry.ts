import { createServerFn } from '@tanstack/react-start'
import {
  parseRecordExternalContribution,
  parseSetContributionStatus,
  parseStartContributionInput,
  parseUpdateContributionAmount,
} from '@/lib/registry/contribution-schema'
import {
  parseRegistryAccountInput,
  parseRegistryItemInput,
} from '@/lib/registry/schema'
import type {
  PublicRegistryData,
  PublicRegistryItem,
  RegistryAdminData,
} from '@/lib/registry/registry.server'
import type {
  AdminContribution,
  ConfirmedContribution,
  ContributionFxQuote,
  StartedContribution,
} from '@/lib/registry/contribution.server'
import type { RegistryAccount, RegistryItem } from '@/lib/supabase/types'

export type {
  PublicRegistryAccount,
  PublicRegistryData,
  PublicRegistryItem,
  RegistryAdminData,
} from '@/lib/registry/registry.server'

export type {
  AdminContribution,
  ConfirmedContribution,
  ContributionFxQuote,
  StartedContribution,
}

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
  .validator(
    (data: {
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
    },
  )
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

export const quoteContributionFx = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const value = data as {
      weddingSlug?: unknown
      giftId?: unknown
      currency?: unknown
    }
    const weddingSlug = String(value.weddingSlug ?? '')
      .trim()
      .toLowerCase()
    if (!weddingSlug) throw new Error('Wedding is required.')
    const giftRaw = value.giftId
    const giftId =
      giftRaw === null || giftRaw === undefined || String(giftRaw).trim() === ''
        ? null
        : String(giftRaw).trim()
    const currency = String(value.currency ?? '')
      .trim()
      .toUpperCase()
    if (!currency) throw new Error('Currency is required.')
    return { weddingSlug, giftId, currency }
  })
  .handler(async ({ data }) => {
    const { quoteContributionFxHandler } = await import('./contribution.server')
    return quoteContributionFxHandler(data)
  })

export const startBankContribution = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseStartContributionInput(data))
  .handler(async ({ data }): Promise<StartedContribution> => {
    const { startBankContributionHandler } =
      await import('./contribution.server')
    return startBankContributionHandler(data)
  })

export const confirmBankContribution = createServerFn({ method: 'POST' })
  .validator((data: { token: string }) => {
    const token = String(data.token).trim()
    if (!token) throw new Error('Confirm link is missing.')
    return { token }
  })
  .handler(async ({ data }): Promise<ConfirmedContribution> => {
    const { confirmBankContributionHandler } =
      await import('./contribution.server')
    return confirmBankContributionHandler(data.token)
  })

export const updateContributionAmount = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseUpdateContributionAmount(data))
  .handler(async ({ data }): Promise<AdminContribution> => {
    const { updateContributionAmountHandler } =
      await import('./contribution.server')
    return updateContributionAmountHandler(data)
  })

export const setContributionStatus = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseSetContributionStatus(data))
  .handler(async ({ data }): Promise<AdminContribution> => {
    const { setContributionStatusHandler } =
      await import('./contribution.server')
    return setContributionStatusHandler(data)
  })

export const recordExternalContribution = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseRecordExternalContribution(data))
  .handler(async ({ data }): Promise<AdminContribution> => {
    const { recordExternalContributionHandler } =
      await import('./contribution.server')
    return recordExternalContributionHandler(data)
  })

export const createRegistryPhotoUpload = createServerFn({ method: 'POST' })
  .validator((data: { name: string; type: string; byteSize: number }) => {
    const name = String(data.name).trim()
    const type = String(data.type)
    const byteSize = Number(data.byteSize)
    if (!name) throw new Error('Image name is required.')
    if (!Number.isFinite(byteSize) || byteSize <= 0) {
      throw new Error('Image data is empty.')
    }
    return { name, type, byteSize }
  })
  .handler(async ({ data }) => {
    const { createRegistryPhotoUploadHandler } =
      await import('./registry.server')
    return createRegistryPhotoUploadHandler(data)
  })

export const confirmRegistryPhotoUpload = createServerFn({ method: 'POST' })
  .validator((data: { path: string }) => {
    const path = String(data.path).trim()
    if (!path) throw new Error('Image path is required.')
    return { path }
  })
  .handler(async ({ data }) => {
    const { confirmRegistryPhotoUploadHandler } =
      await import('./registry.server')
    return confirmRegistryPhotoUploadHandler(data)
  })
