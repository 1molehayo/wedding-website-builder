import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import {
  buildWeddingPublicSlug,
  withPublicSlugUuid,
} from '@/lib/wedding/slug'

type AllocateSlugInput = {
  brideName: string
  groomName: string
  weddingDate: string | null
  createdAt?: string | Date | null
}

/**
 * Create-time only.
 * 1) Try `bride-groom-year`
 * 2) If taken, use `bride-groom-year-{randomUUID}` until unique
 */
export async function allocateUniquePublicSlug(
  input: AllocateSlugInput,
): Promise<string> {
  const admin = createAdminSupabaseClient()
  const base = buildWeddingPublicSlug({
    brideName: input.brideName,
    groomName: input.groomName,
    weddingDate: input.weddingDate,
    createdAt: input.createdAt,
  })

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate =
      attempt === 0 ? base : withPublicSlugUuid(base, crypto.randomUUID())

    const clash = await admin
      .from('weddings')
      .select('id')
      .eq('public_slug', candidate)
      .maybeSingle()

    if (clash.error) throw new Error(clash.error.message)
    if (!clash.data) return candidate
  }

  throw new Error('Unable to allocate a unique public URL slug.')
}

export async function isPublicSlugAvailable(input: {
  slug: string
  excludeWeddingId?: string
}): Promise<boolean> {
  const admin = createAdminSupabaseClient()
  let query = admin
    .from('weddings')
    .select('id')
    .eq('public_slug', input.slug)

  if (input.excludeWeddingId) {
    query = query.neq('id', input.excludeWeddingId)
  }

  const result = await query.maybeSingle()
  if (result.error) throw new Error(result.error.message)
  return !result.data
}
