/** Build a WhatsApp share URL with a prefilled RSVP invite message. */
export function whatsappRsvpShareUrl(input: {
  phone: string
  guestFirstName: string
  coupleLabel: string
  /** Public wedding date label; omit or use TBA-style text when unpublished. */
  weddingDateLabel?: string | null
  websiteUrl?: string | null
  rsvpUrl: string
  /** Durable app URL that serves the invitation card image. */
  invitationImageUrl?: string | null
  photosUrl?: string | null
  partyName?: string | null
  plusOnes?: number
  inviteMessage?: string | null
}): string | null {
  const digits = input.phone.replace(/\D/g, '')
  if (digits.length < 8) return null

  const dateLabel = input.weddingDateLabel?.trim() || null
  const inviteLine = dateLabel
    ? `You’re invited to celebrate with ${input.coupleLabel} on ${dateLabel}.`
    : `You’re invited to celebrate with ${input.coupleLabel}.`
  const plusOnes = input.plusOnes ?? 0
  const attendanceLine =
    plusOnes > 0
      ? `This invitation includes you and up to ${plusOnes} ${plusOnes === 1 ? 'guest' : 'guests'}.`
      : 'This invitation is for you.'

  const message = [
    `Hi ${input.guestFirstName},`,
    '',
    inviteLine,
    '',
    ...(input.partyName
      ? [`Party / household: ${input.partyName}`, '']
      : []),
    attendanceLine,
    '',
    ...(input.inviteMessage?.trim()
      ? ['A message from the couple:', input.inviteMessage.trim(), '']
      : []),
    ...(input.websiteUrl
      ? [`Wedding website:`, input.websiteUrl, '']
      : []),
    ...(input.invitationImageUrl
      ? [`View the invitation:`, input.invitationImageUrl, '']
      : []),
    `Please RSVP with your personal link:`,
    input.rsvpUrl,
    '',
    ...(input.photosUrl
      ? [
          `We’ve also shared a private photo album with you:`,
          input.photosUrl,
          '',
        ]
      : []),
    `This link is just for you. Please don’t share it widely.`,
  ].join('\n')

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** Public proxy URL for a stored invitation card PNG. */
export function invitationCardShareUrl(origin: string, storagePath: string) {
  const path = storagePath.trim()
  if (!path) return null
  return `${origin.replace(/\/$/, '')}/api/photo?path=${encodeURIComponent(path)}`
}
