import { createServerFn } from '@tanstack/react-start'
import type {
  PhotoShareGroupListItem,
  PhotoShareGuestOption,
  PhotoShareViewerData,
} from '@/lib/photo-shares/photo-shares.server'

export type {
  PhotoShareGroupListItem,
  PhotoShareGuestOption,
  PhotoShareViewerData,
}

function parseIdList(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list.`)
  const ids = value.map((item) => String(item).trim()).filter(Boolean)
  return [...new Set(ids)]
}

export const listPhotoShareGroups = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{
    groups: PhotoShareGroupListItem[]
    guests: PhotoShareGuestOption[]
  }> => {
    const { listPhotoShareGroupsHandler } = await import(
      './photo-shares.server'
    )
    return listPhotoShareGroupsHandler()
  },
)

export const createPhotoShareGroup = createServerFn({ method: 'POST' })
  .validator((data: { name: string; assetIds: string[]; guestIds: string[] }) => {
    const name = String(data.name).trim()
    if (!name) throw new Error('Share name is required.')
    return {
      name,
      assetIds: parseIdList(data.assetIds, 'Photos'),
      guestIds: parseIdList(data.guestIds, 'Guests'),
    }
  })
  .handler(async ({ data }): Promise<PhotoShareGroupListItem> => {
    const { createPhotoShareGroupHandler } = await import(
      './photo-shares.server'
    )
    return createPhotoShareGroupHandler(data)
  })

export const updatePhotoShareGroup = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      groupId: string
      name: string
      assetIds: string[]
      guestIds: string[]
    }) => {
      const groupId = String(data.groupId).trim()
      const name = String(data.name).trim()
      if (!groupId) throw new Error('Share group id is required.')
      if (!name) throw new Error('Share name is required.')
      return {
        groupId,
        name,
        assetIds: parseIdList(data.assetIds, 'Photos'),
        guestIds: parseIdList(data.guestIds, 'Guests'),
      }
    },
  )
  .handler(async ({ data }): Promise<PhotoShareGroupListItem> => {
    const { updatePhotoShareGroupHandler } = await import(
      './photo-shares.server'
    )
    return updatePhotoShareGroupHandler(data)
  })

export const deletePhotoShareGroup = createServerFn({ method: 'POST' })
  .validator((data: { groupId: string }) => {
    const groupId = String(data.groupId).trim()
    if (!groupId) throw new Error('Share group id is required.')
    return { groupId }
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { deletePhotoShareGroupHandler } = await import(
      './photo-shares.server'
    )
    return deletePhotoShareGroupHandler(data.groupId)
  })

export const sendPhotoShareEmails = createServerFn({ method: 'POST' })
  .validator((data: { groupId: string }) => {
    const groupId = String(data.groupId).trim()
    if (!groupId) throw new Error('Share group id is required.')
    return { groupId }
  })
  .handler(async ({ data }) => {
    const { sendPhotoShareEmailsHandler } = await import(
      './photo-shares.server'
    )
    return sendPhotoShareEmailsHandler(data.groupId)
  })

export const getPhotoShareViewer = createServerFn({ method: 'GET' })
  .validator((data: { token: string; guestRsvpToken?: string }) => {
    const token = String(data.token).trim()
    if (!token) throw new Error('Share link is invalid.')
    const guestRsvpToken = data.guestRsvpToken?.trim() || undefined
    return { token, guestRsvpToken }
  })
  .handler(async ({ data }): Promise<PhotoShareViewerData> => {
    const { getPhotoShareViewerHandler } = await import(
      './photo-shares.server'
    )
    return getPhotoShareViewerHandler(data)
  })
