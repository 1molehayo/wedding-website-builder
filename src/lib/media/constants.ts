export const MAX_MEDIA_UPLOAD_BYTES = 12 * 1024 * 1024

export const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

const MIME_LABELS: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
}

export function mediaTypeListLabel(
  types: readonly string[] = ALLOWED_MEDIA_MIME_TYPES,
): string {
  return types.map((type) => MIME_LABELS[type] ?? type).join(', ')
}

export function mediaMaxSizeLabel(bytes = MAX_MEDIA_UPLOAD_BYTES): string {
  const mb = bytes / (1024 * 1024)
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`
}
