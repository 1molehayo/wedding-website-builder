import { describe, expect, it } from 'vitest'
import { qrDataUrl, qrPngFile } from '@/lib/media/qr'

describe('photo share QR helpers', () => {
  it('builds a PNG data URL for a share link', async () => {
    const dataUrl = await qrDataUrl('https://example.com/photos/token')
    expect(dataUrl.startsWith('data:image/png')).toBe(true)
  })

  it('builds a PNG File suitable for Web Share', async () => {
    const file = await qrPngFile(
      'https://example.com/photos/token',
      'photo-share-qr.png',
    )
    expect(file.type).toBe('image/png')
    expect(file.name).toBe('photo-share-qr.png')
    expect(file.size).toBeGreaterThan(100)
  })
})
