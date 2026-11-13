import { createServerFn } from '@tanstack/react-start'
import type {
  PageBlock,
  PageContentEditorData,
  PageContentVersion,
} from '@/lib/page-blocks/types'
import {
  parseSavePageDraftInput,
  parseUpdatePageBlocksInput,
} from '@/lib/page-blocks/validation'

export const getPageBlocks = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PageContentEditorData> => {
    const { getPageBlocksHandler } = await import('./settings.server')
    return getPageBlocksHandler()
  },
)

export const savePageBlocksDraft = createServerFn({ method: 'POST' })
  .validator((data: { page_blocks: PageBlock[] }) =>
    parseSavePageDraftInput(data),
  )
  .handler(async ({ data }): Promise<PageContentEditorData> => {
    const { savePageBlocksDraftHandler } = await import('./settings.server')
    return savePageBlocksDraftHandler(data.page_blocks)
  })

export const publishPageBlocks = createServerFn({ method: 'POST' })
  .validator((data: { page_blocks: PageBlock[] }) =>
    parseUpdatePageBlocksInput(data),
  )
  .handler(async ({ data }): Promise<PageContentEditorData> => {
    const { publishPageBlocksHandler } = await import('./settings.server')
    return publishPageBlocksHandler(data.page_blocks)
  })

export const listPageContentVersions = createServerFn({
  method: 'GET',
}).handler(async (): Promise<PageContentVersion[]> => {
  const { listPageContentVersionsHandler } = await import('./settings.server')
  return listPageContentVersionsHandler()
})

export const restorePageContentVersion = createServerFn({ method: 'POST' })
  .validator((data: { versionId: string }) => {
    const versionId = data.versionId.trim()
    if (!versionId) throw new Error('Version is required.')
    return { versionId }
  })
  .handler(async ({ data }): Promise<PageContentEditorData> => {
    const { restorePageContentVersionHandler } =
      await import('./settings.server')
    return restorePageContentVersionHandler(data.versionId)
  })

export const getPublicHomeData = createServerFn({ method: 'GET' })
  .validator((data: { slug: string; preview?: boolean }) => {
    const slug = String(data.slug).trim().toLowerCase()
    if (!slug) throw new Error('Wedding slug is required.')
    return { slug, preview: Boolean(data.preview) }
  })
  .handler(async ({ data }) => {
    const { getPublicHomeDataHandler } = await import('./settings.server')
    return getPublicHomeDataHandler(data.slug, data.preview)
  })

export const getSignedPhotoUrl = createServerFn({ method: 'POST' })
  .validator((data: { imagePath: string }) => {
    if (typeof data.imagePath !== 'string' || !data.imagePath.trim()) {
      throw new Error('imagePath is required.')
    }
    return { imagePath: data.imagePath.trim() }
  })
  .handler(async ({ data }) => {
    const { getSignedPhotoUrlHandler } = await import('./settings.server')
    return getSignedPhotoUrlHandler(data.imagePath)
  })

export const createPageBlockUpload = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      name: string
      type: string
      byteSize: number
      mediaKind: 'image' | 'video'
    }) => {
    const name = String(data.name).trim()
    const type = String(data.type).trim()
    const byteSize = Number(data.byteSize)
    const mediaKind: 'image' | 'video' =
      data.mediaKind === 'video' ? 'video' : 'image'
    if (!name) throw new Error('File name is required.')
    if (!Number.isFinite(byteSize) || byteSize <= 0) {
      throw new Error('File data is empty.')
    }
    return {
      name,
      type: type || 'application/octet-stream',
      byteSize,
      mediaKind,
    }
    },
  )
  .handler(async ({ data }) => {
    const { createPageBlockUploadHandler } = await import('./settings.server')
    return createPageBlockUploadHandler(data)
  })

export const confirmPageBlockUpload = createServerFn({ method: 'POST' })
  .validator((data: { path: string }) => {
    const path = String(data.path).trim()
    if (!path) throw new Error('Upload path is required.')
    return { path }
  })
  .handler(async ({ data }) => {
    const { confirmPageBlockUploadHandler } = await import('./settings.server')
    return confirmPageBlockUploadHandler(data)
  })
