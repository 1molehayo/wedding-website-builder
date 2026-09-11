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

export const listPageContentVersions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PageContentVersion[]> => {
    const { listPageContentVersionsHandler } = await import('./settings.server')
    return listPageContentVersionsHandler()
  },
)

export const restorePageContentVersion = createServerFn({ method: 'POST' })
  .validator((data: { versionId: string }) => {
    const versionId = data.versionId.trim()
    if (!versionId) throw new Error('Version is required.')
    return { versionId }
  })
  .handler(async ({ data }): Promise<PageContentEditorData> => {
    const { restorePageContentVersionHandler } = await import(
      './settings.server'
    )
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

export const uploadPageBlockImage = createServerFn({ method: 'POST' })
  .validator((data: { name: string; type: string; dataBase64: string }) => {
    if (!data.name.trim() || !data.dataBase64) {
      throw new Error('Image upload payload is incomplete.')
    }
    return {
      name: data.name,
      type: data.type || 'application/octet-stream',
      dataBase64: data.dataBase64,
    }
  })
  .handler(async ({ data }) => {
    const { uploadPageBlockImageHandler } = await import('./settings.server')
    return uploadPageBlockImageHandler(data)
  })
