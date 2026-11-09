const MAX_EDGE_PX = 1920
const JPEG_QUALITY = 0.82
const WEBP_QUALITY = 0.82

function renamed(fileName: string, ext: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim() || 'photo'
  return `${base}.${ext}`
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

/**
 * Downscale and recompress photos before upload.
 * GIFs are left alone so animation is preserved.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (typeof window === 'undefined') return file
  if (file.type === 'image/gif') return file
  if (!file.type.startsWith('image/')) return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  try {
    const scale = Math.min(
      1,
      MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height),
    )
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(bitmap, 0, 0, width, height)

    const webp = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)
    const jpeg = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)

    const candidates = [webp, jpeg].filter((blob): blob is Blob =>
      Boolean(blob && blob.size > 0),
    )
    if (candidates.length === 0) return file

    candidates.sort((a, b) => a.size - b.size)
    const best = candidates[0]
    if (best.size >= file.size && scale === 1) return file

    const type = best.type || 'image/jpeg'
    const ext = type === 'image/webp' ? 'webp' : 'jpg'
    return new File([best], renamed(file.name, ext), {
      type,
      lastModified: file.lastModified,
    })
  } finally {
    bitmap.close()
  }
}
