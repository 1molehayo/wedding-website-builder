import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'

const PHOTOS_BUCKET = 'photos'
/** In-page render TTL — pages re-sign on each load. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6
/** Proxy redirects use a short fresh signature per request. */
const PROXY_SIGNED_URL_TTL_SECONDS = 60 * 10

export function isAllowedPhotoStoragePath(imagePath: string): boolean {
  const path = imagePath.trim()
  if (!path || path.includes('..') || path.startsWith('/')) return false
  return path.startsWith('page-blocks/') || path.startsWith('media/')
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
