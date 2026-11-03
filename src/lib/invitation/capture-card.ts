import { toPng } from 'html-to-image'

/** Render the on-screen invitation card preview to a PNG File for upload. */
export async function captureInvitationCardPng(
  element: HTMLElement,
): Promise<File> {
  const width = Math.max(1, Math.round(element.offsetWidth))
  const height = Math.max(1, Math.round(element.offsetHeight))
  if (width < 120 || height < 120) {
    throw new Error(
      'Invitation card preview is too small to capture. Scroll it into view and try again.',
    )
  }

  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    width,
    height,
    canvasWidth: width * 2,
    canvasHeight: height * 2,
    backgroundColor: undefined,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: 'none',
      margin: '0',
    },
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
