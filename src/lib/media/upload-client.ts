/** Default wait for the storage PUT before failing the upload. */
export const MEDIA_UPLOAD_TIMEOUT_MS = 60_000

/**
 * PUT a file to a Supabase signed upload URL with real XHR progress.
 * Mirrors storage-js `uploadToSignedUrl` FormData shape for Blob/File bodies.
 */
export function uploadFileToSignedUrl(
  signedUrl: string,
  file: File,
  options?: {
    onProgress?: (percent: number) => void
    signal?: AbortSignal
    timeoutMs?: number
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const body = new FormData()
    body.append('cacheControl', '3600')
    body.append('', file)
    const timeoutMs = options?.timeoutMs ?? MEDIA_UPLOAD_TIMEOUT_MS

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return
      const percent = Math.min(
        100,
        Math.round((event.loaded / event.total) * 100),
      )
      options?.onProgress?.(percent)
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options?.onProgress?.(100)
        resolve()
        return
      }
      let message = `Upload failed (${xhr.status}).`
      try {
        const parsed = JSON.parse(xhr.responseText) as {
          message?: string
          error?: string
        }
        message = parsed.message || parsed.error || message
      } catch {
        if (xhr.responseText.trim()) message = xhr.responseText.trim()
      }
      reject(new Error(message))
    }

    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.onabort = () => reject(new Error('Upload cancelled.'))
    xhr.ontimeout = () =>
      reject(new Error('Upload timed out. Try again, or use a smaller photo.'))

    if (options?.signal) {
      if (options.signal.aborted) {
        reject(new Error('Upload cancelled.'))
        return
      }
      options.signal.addEventListener(
        'abort',
        () => {
          xhr.abort()
        },
        { once: true },
      )
    }

    xhr.open('PUT', signedUrl)
    xhr.timeout = timeoutMs
    xhr.send(body)
  })
}
