import { toPng } from 'html-to-image'

/** Render the on-screen invitation card preview to a PNG File for upload. */
export async function captureInvitationCardPng(
  element: HTMLElement,
): Promise<File> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: undefined,
  })
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  if (!blob.size) {
    throw new Error('Could not render the invitation card image.')
  }
  return new File([blob], 'invitation-card.png', {
    type: 'image/png',
    lastModified: Date.now(),
  })
}
