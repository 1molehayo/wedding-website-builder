import { createServerFn } from '@tanstack/react-start'
import type { Wedding } from '@/lib/supabase/types'
import { FALLBACK_PUBLIC_WEDDING } from '@/lib/wedding/public-settings'
import type { PublicWeddingSettings } from '@/lib/wedding/public-settings'
import { parsePublicSlug } from '@/lib/wedding/slug'
import { parseUpdateWeddingInput } from '@/lib/wedding/validation'
import type { UpdateWeddingInput } from '@/lib/wedding/validation'

export type { PublicWeddingSettings }
export { FALLBACK_PUBLIC_WEDDING }

export type PublicSlugAvailability =
  | { status: 'available'; slug: string }
  | { status: 'taken'; slug: string }
  | { status: 'invalid'; message: string }
  | { status: 'current'; slug: string }

export const getPublicWeddingSettings = createServerFn({
  method: 'GET',
})
  .validator((data?: { slug?: string }) => {
    const slug = data?.slug?.trim().toLowerCase()
    return { slug: slug || undefined }
  })
  .handler(async ({ data }): Promise<PublicWeddingSettings> => {
    const { getPublicWeddingSettingsHandler } = await import('./settings.server')
    return getPublicWeddingSettingsHandler(data.slug)
  })

export const checkPublicSlugAvailable = createServerFn({ method: 'GET' })
  .validator((data: { slug: string; currentSlug?: string }) => ({
    slug: String(data.slug),
    currentSlug:
      data.currentSlug === undefined ? '' : String(data.currentSlug),
  }))
  .handler(async ({ data }): Promise<PublicSlugAvailability> => {
    try {
      const slug = parsePublicSlug(data.slug)
      const current = data.currentSlug.trim().toLowerCase()
      if (current && slug === current) {
        return { status: 'current', slug }
      }
      const { checkPublicSlugAvailableHandler } = await import(
        './settings.server'
      )
      const result = await checkPublicSlugAvailableHandler(slug)
      return result.available
        ? { status: 'available', slug }
        : { status: 'taken', slug }
    } catch (err) {
      return {
        status: 'invalid',
        message:
          err instanceof Error ? err.message : 'Invalid public URL slug.',
      }
    }
  })

export const updateWedding = createServerFn({ method: 'POST' })
  .validator((data: UpdateWeddingInput) => parseUpdateWeddingInput(data))
  .handler(async ({ data }): Promise<Wedding> => {
    const { updateWeddingHandler } = await import('./settings.server')
    return updateWeddingHandler(data)
  })

export type { PublishWeddingDateResult } from './settings.server'

export const publishWeddingDate = createServerFn({ method: 'POST' })
  .validator((data: { notifyGuests?: boolean }) => ({
    notifyGuests: Boolean(data.notifyGuests),
  }))
  .handler(async ({ data }) => {
    const { publishWeddingDateHandler } = await import('./settings.server')
    return publishWeddingDateHandler(data)
  })

export const unpublishWeddingDate = createServerFn({
  method: 'POST',
}).handler(async (): Promise<Wedding> => {
  const { unpublishWeddingDateHandler } = await import('./settings.server')
  return unpublishWeddingDateHandler()
})
