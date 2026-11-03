/** Build a WhatsApp share URL with a prefilled RSVP invite message. */
export function whatsappRsvpShareUrl(input: {
  phone: string
  guestFirstName: string
  coupleLabel: string
  rsvpUrl: string
  /** Durable app URL that serves the invitation card image. */
  invitationImageUrl?: string | null
}): string | null {
  const digits = input.phone.replace(/\D/g, '')
  if (digits.length < 8) return null

  const message = [
    `Hi ${input.guestFirstName},`,
    '',
    `You’re invited to celebrate ${input.coupleLabel}.`,
    '',
    ...(input.invitationImageUrl
      ? [`View the invitation:`, input.invitationImageUrl, '']
      : []),
    `Please RSVP here:`,
    input.rsvpUrl,
  ].join('\n')

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** Public proxy URL for a stored invitation card PNG. */
export function invitationCardShareUrl(origin: string, storagePath: string) {
  const path = storagePath.trim()
  if (!path) return null
  return `${origin.replace(/\/$/, '')}/api/photo?path=${encodeURIComponent(path)}`
}
