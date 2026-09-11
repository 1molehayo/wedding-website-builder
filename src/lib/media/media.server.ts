import { requireWeddingSession } from '@/lib/auth/session.server'
import {
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_MEDIA_UPLOAD_BYTES,
} from '@/lib/media/constants'
import {
  createPhotoSignedUrl,
  isAllowedPhotoStoragePath,
} from '@/lib/page-blocks/storage.server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import type { MediaAsset } from '@/lib/supabase/types'

export type MediaAssetListItem = MediaAsset & {
  signedUrl: string | null
}

export { ALLOWED_MEDIA_MIME_TYPES, MAX_MEDIA_UPLOAD_BYTES }

const ALLOWED_MIME = new Set<string>(ALLOWED_MEDIA_MIME_TYPES)

const PHOTOS_BUCKET = 'photos'

function assertAllowedContentType(contentType: string) {
  if (!ALLOWED_MIME.has(contentType)) {
    throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed.')
  }
}

function mediaPathForWedding(weddingId: string, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'photo'
  return `media/${weddingId}/${crypto.randomUUID()}-${safeName}`
}

function assertWeddingMediaPath(weddingId: string, path: string) {
  const prefix = `media/${weddingId}/`
  if (
    !isAllowedPhotoStoragePath(path) ||
    !path.startsWith(prefix) ||
    path.includes('..')
  ) {
    throw new Error('Invalid media path.')
  }
}

export async function listMediaAssetsHandler(): Promise<MediaAssetListItem[]> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const result = await admin
    .from('media_assets')
    .select('*')
    .eq('wedding_id', session.wedding.id)
    .order('created_at', { ascending: false })

  if (result.error) throw new Error(result.error.message)

  return Promise.all(
    result.data.map(async (row) => ({
      ...row,
      signedUrl: await createPhotoSignedUrl(row.storage_path),
    })),
  )
}

export type CreateMediaUploadResult = {
  path: string
  token: string
  signedUrl: string
  filename: string
  contentType: string
  byteSize: number
}

export async function createMediaUploadHandler(input: {
  name: string
  type: string
  byteSize: number
}): Promise<CreateMediaUploadResult> {
  const session = await requireWeddingSession()
  const contentType = input.type || 'application/octet-stream'
  assertAllowedContentType(contentType)

  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    throw new Error('Image data is empty.')
  }
  if (input.byteSize > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error('Image must be 12MB or smaller.')
  }

  const filename = input.name.trim() || 'photo'
  const path = mediaPathForWedding(session.wedding.id, filename)
  const admin = createAdminSupabaseClient()

  const signed = await admin.storage
    .from(PHOTOS_BUCKET)
    .createSignedUploadUrl(path)

  if (signed.error) {
    throw new Error(signed.error.message)
  }

  return {
    path: signed.data.path,
    token: signed.data.token,
    signedUrl: signed.data.signedUrl,
    filename,
    contentType,
    byteSize: input.byteSize,
  }
}

export async function finalizeMediaUploadHandler(input: {
  path: string
  filename: string
  contentType: string
  byteSize: number
}): Promise<MediaAssetListItem> {
  const session = await requireWeddingSession()
  const contentType = input.contentType || 'application/octet-stream'
  assertAllowedContentType(contentType)
  assertWeddingMediaPath(session.wedding.id, input.path)

  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    throw new Error('Image data is empty.')
  }
  if (input.byteSize > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error('Image must be 12MB or smaller.')
  }

  const admin = createAdminSupabaseClient()

  // Confirm the object landed in storage before we insert the DB row.
  const exists = await admin.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(input.path, 60)
  if (exists.error) {
    throw new Error('Upload did not complete. Please try again.')
  }
  if (!exists.data.signedUrl) {
    throw new Error('Upload did not complete. Please try again.')
  }

  const created = await admin
    .from('media_assets')
    .insert({
      wedding_id: session.wedding.id,
      storage_path: input.path,
      filename: input.filename.trim() || 'photo',
      content_type: contentType,
      byte_size: input.byteSize,
      created_by: session.user.id,
    })
    .select('*')
    .single()

  if (created.error) {
    await admin.storage.from(PHOTOS_BUCKET).remove([input.path])
    throw new Error(created.error.message)
  }

  return {
    ...created.data,
    signedUrl: await createPhotoSignedUrl(input.path),
  }
}

/** @deprecated Prefer createMediaUpload + finalizeMediaUpload for progress UX. */
export async function uploadMediaAssetHandler(input: {
  name: string
  type: string
  dataBase64: string
}): Promise<MediaAssetListItem> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const binary = Buffer.from(input.dataBase64, 'base64')
  if (binary.byteLength === 0) throw new Error('Image data is empty.')
  if (binary.byteLength > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error('Image must be 12MB or smaller.')
  }

  const contentType = input.type || 'application/octet-stream'
  assertAllowedContentType(contentType)

  const path = mediaPathForWedding(session.wedding.id, input.name)

  const uploaded = await admin.storage.from(PHOTOS_BUCKET).upload(path, binary, {
    contentType,
    upsert: false,
  })
  if (uploaded.error) throw new Error(uploaded.error.message)

  const created = await admin
    .from('media_assets')
    .insert({
      wedding_id: session.wedding.id,
      storage_path: path,
      filename: input.name.trim() || 'photo',
      content_type: contentType,
      byte_size: binary.byteLength,
      created_by: session.user.id,
    })
    .select('*')
    .single()

  if (created.error) {
    await admin.storage.from(PHOTOS_BUCKET).remove([path])
    throw new Error(created.error.message)
  }

  return {
    ...created.data,
    signedUrl: await createPhotoSignedUrl(path),
  }
}

export async function deleteMediaAssetHandler(
  assetId: string,
): Promise<{ ok: true }> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()

  const existing = await admin
    .from('media_assets')
    .select('*')
    .eq('id', assetId)
    .eq('wedding_id', session.wedding.id)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Media asset not found.')

  const removed = await admin
    .from('media_assets')
    .delete()
    .eq('id', assetId)
    .eq('wedding_id', session.wedding.id)

  if (removed.error) throw new Error(removed.error.message)

  if (isAllowedPhotoStoragePath(existing.data.storage_path)) {
    await admin.storage.from(PHOTOS_BUCKET).remove([existing.data.storage_path])
  }

  return { ok: true }
}
