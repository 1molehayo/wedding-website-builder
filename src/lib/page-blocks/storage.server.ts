import {
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_MEDIA_UPLOAD_BYTES,
} from '@/lib/media/constants'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'

const PHOTOS_BUCKET = 'photos'
/** In-page render TTL — pages re-sign on each load. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6
/** Proxy redirects use a short fresh signature per request. */
const PROXY_SIGNED_URL_TTL_SECONDS = 60 * 10

const ALLOWED_MIME = new Set<string>(ALLOWED_MEDIA_MIME_TYPES)

export function isAllowedPhotoStoragePath(imagePath: string): boolean {
  const path = imagePath.trim()
  if (!path || path.includes('..') || path.startsWith('/')) return false
  return path.startsWith('page-blocks/') || path.startsWith('media/')
}

export type PageBlockSignedUpload = {
  path: string
  token: string
  signedUrl: string
  filename: string
  contentType: string
  byteSize: number
}

export async function createPageBlockSignedUpload(input: {
  name: string
  type: string
  byteSize: number
}): Promise<PageBlockSignedUpload> {
  const contentType = input.type || 'application/octet-stream'
  if (!ALLOWED_MIME.has(contentType)) {
    throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed.')
  }
  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    throw new Error('Image data is empty.')
  }
  if (input.byteSize > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error('Image must be 12MB or smaller.')
  }

  const filename = input.name.trim() || 'photo'
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'photo'
  const path = `page-blocks/${crypto.randomUUID()}-${safeName}`
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

export async function createPhotoSignedUrl(
  imagePath: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const path = imagePath.trim()
  if (!path) return null

  const admin = createAdminSupabaseClient()
  const result = await admin.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, ttlSeconds)

  if (result.error) {
    return null
  }

  return result.data.signedUrl
}

/** Fresh short-lived signed URL for the public photo proxy. */
export async function createProxiedPhotoSignedUrl(
  imagePath: string,
): Promise<string | null> {
  if (!isAllowedPhotoStoragePath(imagePath)) return null
  return createPhotoSignedUrl(imagePath, PROXY_SIGNED_URL_TTL_SECONDS)
}

export async function uploadPageBlockImage(file: {
  name: string
  type: string
  data: ArrayBuffer
}): Promise<string> {
  const admin = createAdminSupabaseClient()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `page-blocks/${crypto.randomUUID()}-${safeName}`

  const result = await admin.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file.data, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (result.error) {
    throw new Error(result.error.message)
  }

  return path
}
