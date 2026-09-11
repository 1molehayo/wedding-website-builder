import { createServerFn } from '@tanstack/react-start'
import type { PageBlock } from '@/lib/page-blocks/types'
import { parseUpdatePageBlocksInput } from '@/lib/page-blocks/validation'
import type { Wedding } from '@/lib/supabase/types'

export const getPageBlocks = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PageBlock[]> => {
    const { getPageBlocksHandler } = await import('./settings.server')
    return getPageBlocksHandler()
  },
)

export const updatePageBlocks = createServerFn({ method: 'POST' })
  .validator((data: { page_blocks: PageBlock[] }) =>
    parseUpdatePageBlocksInput(data),
  )
  .handler(async ({ data }): Promise<Wedding> => {
    const { updatePageBlocksHandler } = await import('./settings.server')
    return updatePageBlocksHandler(data.page_blocks)
  })

export const getPublicHomeData = createServerFn({ method: 'GET' })
  .validator((data: { slug: string }) => {
    const slug = String(data.slug).trim().toLowerCase()
    if (!slug) throw new Error('Wedding slug is required.')
    return { slug }
  })
  .handler(async ({ data }) => {
    const { getPublicHomeDataHandler } = await import('./settings.server')
    return getPublicHomeDataHandler(data.slug)
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
