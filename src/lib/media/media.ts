import { createServerFn } from '@tanstack/react-start'
import type {
  CreateMediaUploadResult,
  MediaAssetListItem,
} from '@/lib/media/media.server'

export type { CreateMediaUploadResult, MediaAssetListItem }

export const listMediaAssets = createServerFn({ method: 'GET' }).handler(
  async (): Promise<MediaAssetListItem[]> => {
    const { listMediaAssetsHandler } = await import('./media.server')
    return listMediaAssetsHandler()
  },
)

export const createMediaUpload = createServerFn({ method: 'POST' })
  .validator((data: { name: string; type: string; byteSize: number }) => {
    const name = String(data.name).trim()
    const type = String(data.type).trim()
    const byteSize = Number(data.byteSize)
    if (!name) throw new Error('Image name is required.')
    if (!Number.isFinite(byteSize) || byteSize <= 0) {
      throw new Error('Image data is empty.')
    }
    return {
      name,
      type: type || 'application/octet-stream',
      byteSize,
    }
  })
  .handler(async ({ data }): Promise<CreateMediaUploadResult> => {
    const { createMediaUploadHandler } = await import('./media.server')
    return createMediaUploadHandler(data)
  })

export const finalizeMediaUpload = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      path: string
      filename: string
      contentType: string
      byteSize: number
    }) => {
      const path = String(data.path).trim()
      const filename = String(data.filename).trim()
      const contentType = String(data.contentType).trim()
      const byteSize = Number(data.byteSize)
      if (!path) throw new Error('Upload path is required.')
      if (!filename) throw new Error('Image name is required.')
      if (!Number.isFinite(byteSize) || byteSize <= 0) {
        throw new Error('Image data is empty.')
      }
      return {
        path,
        filename,
        contentType: contentType || 'application/octet-stream',
        byteSize,
      }
    },
  )
  .handler(async ({ data }): Promise<MediaAssetListItem> => {
    const { finalizeMediaUploadHandler } = await import('./media.server')
    return finalizeMediaUploadHandler(data)
  })

export const deleteMediaAsset = createServerFn({ method: 'POST' })
  .validator((data: { assetId: string }) => {
    const assetId = data.assetId.trim()
    if (!assetId) throw new Error('Asset id is required.')
    return { assetId }
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { deleteMediaAssetHandler } = await import('./media.server')
    return deleteMediaAssetHandler(data.assetId)
  })
