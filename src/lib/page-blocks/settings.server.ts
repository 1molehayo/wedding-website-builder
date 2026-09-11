import { getAdminSessionHandler, requireWeddingSession } from '@/lib/auth/session.server'
import {
  isMissingPageContentSchema,
  pageContentSchemaUserMessage,
} from '@/lib/page-blocks/schema-error'
import {
  PAGE_CONTENT_VERSION_LIMIT,
} from '@/lib/page-blocks/types'
import type {
  PageBlock,
  PageContentEditorData,
  PageContentVersion,
} from '@/lib/page-blocks/types'
import { parsePageBlocks } from '@/lib/page-blocks/validation'
import type { PublicRegistryData } from '@/lib/registry/registry.server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import { getSupabaseUrl, isLocalSupabase } from '@/lib/supabase/env'
import { toPublicSettings } from '@/lib/wedding/public-settings'
import type { PublicWeddingSettings } from '@/lib/wedding/public-settings'
import { createPhotoSignedUrl, uploadPageBlockImage } from './storage.server'

export type PublicHomeData = PublicWeddingSettings & {
  page_blocks: PageBlock[]
  imageUrls: Record<string, string>
  /** Storage path for OG/social image (use /api/photo?path=… for durable URL). */
  ogImagePath: string | null
  registry: PublicRegistryData
  isPreview: boolean
}

type PageContentRow = {
  page_blocks: unknown
  page_blocks_draft: unknown
  page_draft_updated_at: string | null
  page_published_at: string | null
}

function readStoredPageBlocks(value: unknown): PageBlock[] {
  try {
    return parsePageBlocks(value ?? [])
  } catch {
    return []
  }
}

function readVersionPageBlocks(value: unknown): PageBlock[] {
  try {
    return parsePageBlocks(value ?? [])
  } catch {
    return []
  }
}

function toEditorData(row: PageContentRow): PageContentEditorData {
  return {
    draft: readStoredPageBlocks(row.page_blocks_draft ?? row.page_blocks),
    published: readStoredPageBlocks(row.page_blocks),
    draftUpdatedAt: row.page_draft_updated_at,
    publishedAt: row.page_published_at,
  }
}

function supabaseApiHost(): string {
  try {
    return new URL(getSupabaseUrl()).hostname
  } catch {
    return 'unknown'
  }
}

function throwPageContentSchemaError(original: string): never {
  throw new Error(
    pageContentSchemaUserMessage({
      original,
      isLocal: isLocalSupabase(),
      apiHost: supabaseApiHost(),
    }),
  )
}

const PAGE_CONTENT_SELECT =
  'page_blocks, page_blocks_draft, page_draft_updated_at, page_published_at'

async function loadPageContentRow(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  weddingId: string,
): Promise<PageContentRow> {
  const result = await admin
    .from('weddings')
    .select(PAGE_CONTENT_SELECT)
    .eq('id', weddingId)
    .single()

  if (!result.error) {
    return result.data
  }

  if (!isMissingPageContentSchema(result.error.message)) {
    throw new Error(result.error.message)
  }

  const legacy = await admin
    .from('weddings')
    .select('page_blocks, updated_at')
    .eq('id', weddingId)
    .single()

  if (legacy.error) {
    throw new Error(legacy.error.message)
  }

  return {
    page_blocks: legacy.data.page_blocks,
    page_blocks_draft: legacy.data.page_blocks,
    page_draft_updated_at: legacy.data.updated_at,
    page_published_at: legacy.data.updated_at,
  }
}

async function recordPublishedVersion(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  weddingId: string,
  pageBlocks: PageBlock[],
  publishedAt: string,
) {
  const inserted = await admin.from('page_content_versions').insert({
    wedding_id: weddingId,
    page_blocks: pageBlocks,
    published_at: publishedAt,
  })

  if (inserted.error) {
    if (isMissingPageContentSchema(inserted.error.message)) return
    throw new Error(inserted.error.message)
  }

  const extra = await admin
    .from('page_content_versions')
    .select('id')
    .eq('wedding_id', weddingId)
    .order('published_at', { ascending: false })
    .range(PAGE_CONTENT_VERSION_LIMIT, PAGE_CONTENT_VERSION_LIMIT + 50)

  if (extra.error) {
    if (isMissingPageContentSchema(extra.error.message)) return
    throw new Error(extra.error.message)
  }

  const ids = extra.data.map((row) => row.id)
  if (ids.length === 0) return

  const deleted = await admin
    .from('page_content_versions')
    .delete()
    .in('id', ids)

  if (deleted.error) {
    throw new Error(deleted.error.message)
  }
}

export async function getPageBlocksHandler(): Promise<PageContentEditorData> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  return toEditorData(await loadPageContentRow(admin, session.wedding.id))
}

export async function savePageBlocksDraftHandler(
  pageBlocks: PageBlock[],
): Promise<PageContentEditorData> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const now = new Date().toISOString()

  const updated = await admin
    .from('weddings')
    .update({
      page_blocks_draft: pageBlocks,
      page_draft_updated_at: now,
    })
    .eq('id', session.wedding.id)
    .select(PAGE_CONTENT_SELECT)
    .single()

  if (updated.error) {
    if (isMissingPageContentSchema(updated.error.message)) {
      throwPageContentSchemaError(updated.error.message)
    }
    throw new Error(updated.error.message)
  }

  return toEditorData(updated.data)
}

export async function publishPageBlocksHandler(
  pageBlocks: PageBlock[],
): Promise<PageContentEditorData> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const now = new Date().toISOString()

  const updated = await admin
    .from('weddings')
    .update({
      page_blocks: pageBlocks,
      page_blocks_draft: pageBlocks,
      page_draft_updated_at: now,
      page_published_at: now,
    })
    .eq('id', session.wedding.id)
    .select(PAGE_CONTENT_SELECT)
    .single()

  if (updated.error) {
    if (!isMissingPageContentSchema(updated.error.message)) {
      throw new Error(updated.error.message)
    }

    const live = await admin
      .from('weddings')
      .update({ page_blocks: pageBlocks })
      .eq('id', session.wedding.id)
      .select('page_blocks, updated_at')
      .single()

    if (live.error) {
      throwPageContentSchemaError(updated.error.message)
    }

    return {
      draft: pageBlocks,
      published: readStoredPageBlocks(live.data.page_blocks),
      draftUpdatedAt: live.data.updated_at,
      publishedAt: live.data.updated_at,
    }
  }

  await recordPublishedVersion(
    admin,
    session.wedding.id,
    pageBlocks,
    now,
  )

  return toEditorData(updated.data)
}

export async function listPageContentVersionsHandler(): Promise<
  PageContentVersion[]
> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const result = await admin
    .from('page_content_versions')
    .select('id, published_at, page_blocks')
    .eq('wedding_id', session.wedding.id)
    .order('published_at', { ascending: false })
    .limit(PAGE_CONTENT_VERSION_LIMIT)

  if (result.error) {
    if (isMissingPageContentSchema(result.error.message)) return []
    throw new Error(result.error.message)
  }

  return result.data.map((row) => ({
    id: row.id,
    published_at: row.published_at,
    page_blocks: readVersionPageBlocks(row.page_blocks),
  }))
}

export async function restorePageContentVersionHandler(
  versionId: string,
): Promise<PageContentEditorData> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const version = await admin
    .from('page_content_versions')
    .select('page_blocks')
    .eq('id', versionId)
    .eq('wedding_id', session.wedding.id)
    .maybeSingle()

  if (version.error) {
    throw new Error(version.error.message)
  }

  if (!version.data) {
    throw new Error('That version could not be found.')
  }

  return savePageBlocksDraftHandler(
    readVersionPageBlocks(version.data.page_blocks),
  )
}

async function resolvePublicPageBlocks(input: {
  slug: string
  liveBlocks: unknown
  draftBlocks: unknown
  preview: boolean
}): Promise<{ page_blocks: PageBlock[]; isPreview: boolean }> {
  const published = readStoredPageBlocks(input.liveBlocks)
  if (!input.preview) {
    return {
      page_blocks: published,
      isPreview: false,
    }
  }

  const session = await getAdminSessionHandler()
  const sessionSlug = session?.wedding?.public_slug.trim().toLowerCase()
  if (!sessionSlug || sessionSlug !== input.slug) {
    return {
      page_blocks: published,
      isPreview: false,
    }
  }

  return {
    page_blocks: readStoredPageBlocks(input.draftBlocks ?? input.liveBlocks),
    isPreview: true,
  }
}

export async function getPublicHomeDataHandler(
  weddingSlug: string,
  preview = false,
): Promise<PublicHomeData> {
  const admin = createAdminSupabaseClient()
  const liveSelect =
    'id, groom_name, bride_name, wedding_date, date_published_at, venue_name, venue_location, dress_code, active_public_theme, status, public_slug, page_blocks' as const
  const previewSelect =
    'id, groom_name, bride_name, wedding_date, date_published_at, venue_name, venue_location, dress_code, active_public_theme, status, public_slug, page_blocks, page_blocks_draft' as const
  let servePreview = preview
  let result = servePreview
    ? await admin
        .from('weddings')
        .select(previewSelect)
        .eq('public_slug', weddingSlug)
        .maybeSingle()
    : await admin
        .from('weddings')
        .select(liveSelect)
        .eq('public_slug', weddingSlug)
        .maybeSingle()

  if (
    result.error &&
    servePreview &&
    isMissingPageContentSchema(result.error.message)
  ) {
    servePreview = false
    result = await admin
      .from('weddings')
      .select(liveSelect)
      .eq('public_slug', weddingSlug)
      .maybeSingle()
  }

  if (result.error) {
    throw new Error(result.error.message)
  }

  if (!result.data) {
    throw new Error('Wedding not found.')
  }

  const weddingRow = result.data as {
    id: string
    page_blocks: unknown
    page_blocks_draft?: unknown
    groom_name: string
    bride_name: string
    wedding_date: string | null
    date_published_at: string | null
    venue_name: string | null
    venue_location: string | null
    dress_code: string | null
    active_public_theme: PublicWeddingSettings['active_public_theme']
    status: PublicWeddingSettings['status']
    public_slug: string
  }

  const { page_blocks, isPreview } = await resolvePublicPageBlocks({
    slug: weddingSlug,
    liveBlocks: weddingRow.page_blocks,
    draftBlocks: weddingRow.page_blocks_draft ?? weddingRow.page_blocks,
    preview: servePreview,
  })
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
    '@/lib/registry/registry.server'
  )
  const registry = await getPublicRegistryForWeddingId(weddingRow.id)

  return {
    ...toPublicSettings(weddingRow),
    page_blocks,
    imageUrls,
    ogImagePath,
    registry,
    isPreview,
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
