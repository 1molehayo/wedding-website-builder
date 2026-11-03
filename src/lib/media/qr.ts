import QRCode from 'qrcode'

const DEFAULT_SIZE = 512

export async function qrDataUrl(
  value: string,
  size = DEFAULT_SIZE,
): Promise<string> {
  return QRCode.toDataURL(value, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111111',
      light: '#ffffff',
    },
  })
}

export async function qrPngFile(
  value: string,
  filename = 'photo-share-qr.png',
  size = DEFAULT_SIZE,
): Promise<File> {
  const dataUrl = await qrDataUrl(value, size)
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], filename, { type: 'image/png' })
}

export function canShareQrFile(file: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }
  if (typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export async function shareQrImage(
  value: string,
  filename = 'photo-share-qr.png',
): Promise<'shared' | 'downloaded'> {
  const file = await qrPngFile(value, filename)
  if (canShareQrFile(file)) {
    await navigator.share({
      files: [file],
      title: 'Photo share QR',
      text: value,
    })
    return 'shared'
  }
  downloadBlob(file, filename)
  return 'downloaded'
}
