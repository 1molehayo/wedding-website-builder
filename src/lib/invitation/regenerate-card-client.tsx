import { createRoot } from 'react-dom/client'
import { InvitationCard } from '@/components/invitation/invitation-card'
import { captureInvitationCardPng } from '@/lib/invitation/capture-card'
import { isInvitationDesignId } from '@/lib/invitation/designs'
import type { InvitationDesignId } from '@/lib/invitation/designs'
import { uploadFileToSignedUrl } from '@/lib/media/upload-client'
import type { ColorMode, PublicThemeId } from '@/lib/site-settings'
import {
  createInvitationCardUpload,
  setInvitationCardPath,
} from '@/lib/wedding/settings'

export type InvitationCardWeddingSource = {
  groom_name: string
  bride_name: string
  wedding_date: string | null
  venue_name: string | null
  venue_location: string | null
  active_public_theme: PublicThemeId
  invitation_design_id: string
  invitation_design_mode: 'light' | 'dark' | string
}

function resolveDesignId(value: string): InvitationDesignId {
  return isInvitationDesignId(value) ? value : 'wreath'
}

function resolveMode(value: string): ColorMode {
  return value === 'dark' ? 'dark' : 'light'
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/**
 * Renders the wedding invitation card off-screen, captures a PNG, uploads it,
 * and persists `invitation_card_path` for guest invite emails.
 */
export async function regenerateInvitationCardForEmail(
  wedding: InvitationCardWeddingSource,
): Promise<string> {
  const design = resolveDesignId(wedding.invitation_design_id)
  const mode = resolveMode(wedding.invitation_design_mode)
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:24rem;height:40rem;pointer-events:none;opacity:0;'
  document.body.appendChild(host)

  const root = createRoot(host)
  try {
    root.render(
      <div
        data-invitation-card-capture="true"
        data-theme={wedding.active_public_theme}
        data-mode={mode}
        className="bg-background text-foreground h-160 w-96 overflow-hidden"
      >
        <InvitationCard
          design={design}
          content={{
            groomName: wedding.groom_name.trim() || 'Groom',
            brideName: wedding.bride_name.trim() || 'Bride',
            weddingDate: wedding.wedding_date,
            venueName: wedding.venue_name,
            venueLocation: wedding.venue_location,
          }}
        />
      </div>,
    )

    if (typeof document !== 'undefined' && 'fonts' in document) {
      await document.fonts.ready.catch(() => undefined)
    }
    await waitForPaint()

    const captureNode = host.querySelector(
      '[data-invitation-card-capture="true"]',
    )
    if (!(captureNode instanceof HTMLElement)) {
      throw new Error('Invitation card preview did not mount.')
    }

    const file = await captureInvitationCardPng(captureNode)
    const signed = await createInvitationCardUpload({
      data: {
        name: file.name,
        type: file.type,
        byteSize: file.size,
      },
    })
    await uploadFileToSignedUrl(signed.signedUrl, file)
    const saved = await setInvitationCardPath({ data: { path: signed.path } })
    return saved.path
  } finally {
    root.unmount()
    host.remove()
  }
}
