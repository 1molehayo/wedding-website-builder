import { createServerFn } from '@tanstack/react-start'
import {
  deletionReasonSchema,
  parseUpdateProfileInput,
} from '@/lib/auth/profile-schema'
import type { AdminProfile } from '@/lib/supabase/types'
import { SUPPORT_CATEGORIES } from '@/lib/support/categories'

export const updateProfile = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseUpdateProfileInput(data))
  .handler(async ({ data }): Promise<AdminProfile> => {
    const { updateProfileHandler } = await import('./profile.server')
    return updateProfileHandler(data)
  })

export const requestAccountDeletion = createServerFn({ method: 'POST' })
  .validator((data: { reason: string }) => {
    const parsed = deletionReasonSchema.safeParse(data.reason)
    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message ?? 'Reason is required.',
      )
    }
    return { reason: parsed.data }
  })
  .handler(async ({ data }): Promise<AdminProfile> => {
    const { requestAccountDeletionHandler } = await import('./profile.server')
    return requestAccountDeletionHandler(data)
  })

export const submitSupport = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      category: string
      message: string
      image?: { name: string; type: string; dataBase64: string } | null
    }) => {
      const category = data.category.trim()
      if (!SUPPORT_CATEGORIES.some((item) => item.id === category)) {
        throw new Error('Choose a valid subject.')
      }
      const message = data.message.trim()
      if (message.length < 10) {
        throw new Error('Please enter a message (at least 10 characters).')
      }
      return {
        category,
        message,
        image: data.image ?? null,
      }
    },
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { submitSupportHandler } = await import('./profile.server')
    return submitSupportHandler(data)
  })
