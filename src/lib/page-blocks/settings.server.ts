import { requireWeddingSession } from '@/lib/auth/session.server'
import { createDefaultPageBlocks } from '@/lib/page-blocks/types'
import type { PageBlock } from '@/lib/page-blocks/types'
import { parsePageBlocks } from '@/lib/page-blocks/validation'
import type { PublicRegistryData } from '@/lib/registry/registry.server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import type { Wedding } from '@/lib/supabase/types'
import { toPublicSettings } from '@/lib/wedding/public-settings'
import type { PublicWeddingSettings } from '@/lib/wedding/public-settings'
import { createPhotoSignedUrl, uploadPageBlockImage } from './storage.server'

export type PublicHomeData = PublicWeddingSettings & {
  page_blocks: PageBlock[]
  imageUrls: Record<string, string>
  /** Storage path for OG/social image (use /api/photo?path=… for durable URL). */
  ogImagePath: string | null
  registry: PublicRegistryData
}

function coercePageBlocks(value: unknown): PageBlock[] {
  try {
    const blocks = parsePageBlocks(value ?? [])
    return blocks.length > 0 ? blocks : createDefaultPageBlocks()
  } catch {
    return createDefaultPageBlocks()
  }
}

export async function getPageBlocksHandler(): Promise<PageBlock[]> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const weddingResult = await admin
    .from('weddings')
    .select('page_blocks')
    .eq('id', session.wedding.id)
    .single()

  if (weddingResult.error) {
    throw new Error(weddingResult.error.message)
  }

  return coercePageBlocks(weddingResult.data.page_blocks)
}

export async function updatePageBlocksHandler(
  pageBlocks: PageBlock[],
): Promise<Wedding> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const updated = await admin
    .from('weddings')
    .update({ page_blocks: pageBlocks })
    .eq('id', session.wedding.id)
    .select('*')
    .single()

  if (updated.error) {
    throw new Error(updated.error.message)
  }

  if (!updated.data) {
    throw new Error('Page content could not be updated.')
  }

  return {
    ...updated.data,
    page_blocks: coercePageBlocks(updated.data.page_blocks),
  }
}

export async function getPublicHomeDataHandler(
  weddingSlug: string,
): Promise<PublicHomeData> {
  const admin = createAdminSupabaseClient()
  const result = await admin
    .from('weddings')
    .select(
      'id, groom_name, bride_name, wedding_date, date_published_at, venue_name, venue_location, dress_code, active_public_theme, status, public_slug, page_blocks',
    )
    .eq('public_slug', weddingSlug)
    .maybeSingle()

  if (result.error) {
    throw new Error(result.error.message)
  }

  if (!result.data) {
    throw new Error('Wedding not found.')
  }

  const page_blocks = coercePageBlocks(result.data.page_blocks)
  const imageUrls: Record<string, string> = {}
  let ogImagePath: string | null = null

  await Promise.all(
    page_blocks.map(async (block) => {
      const imagePath =
        block.type === 'image'
          ? block.fields.imagePath
          : block.type === 'hero'
            ? block.fields.imagePath
            : null
      if (!imagePath?.trim()) return
      if (!ogImagePath) {
        ogImagePath = imagePath.trim()
      }
      const url = await createPhotoSignedUrl(imagePath)
      if (url) {
        imageUrls[block.id] = url
      }
    }),
  )

  const { getPublicRegistryForWeddingId } = await import(
    '#/lib/registry/registry.server'
  )
  const registry = await getPublicRegistryForWeddingId(result.data.id as string)

  return {
    ...toPublicSettings(result.data),
    page_blocks,
    imageUrls,
    ogImagePath,
    registry,
  }
}

export async function getSignedPhotoUrlHandler(
  imagePath: string,
): Promise<string | null> {
  await requireWeddingSession()
  return createPhotoSignedUrl(imagePath)
}

export async function uploadPageBlockImageHandler(file: {
  name: string
  type: string
  dataBase64: string
}): Promise<{ path: string; signedUrl: string | null }> {
  await requireWeddingSession()

  const binary = Uint8Array.from(atob(file.dataBase64), (c) => c.charCodeAt(0))
  const path = await uploadPageBlockImage({
    name: file.name,
    type: file.type,
    data: binary.buffer,
  })
  const signedUrl = await createPhotoSignedUrl(path)
  return { path, signedUrl }
}
