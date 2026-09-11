import { getAppUrl } from '@/lib/app-url'
import { PRODUCT_NAME } from '@/lib/constants'
import {
  EMAIL_SEND_MODE,
  getEmailThemePalette,
} from '@/lib/email/theme'
import type { EmailThemePalette } from '@/lib/email/theme'
import type { ColorMode, PublicThemeId } from '@/lib/site-settings'

export { getAppUrl }

export function adminInviteAcceptUrl(token: string): string {
  return `${getAppUrl()}/admin/invite/${encodeURIComponent(token)}`
}

export function newInviteToken(): string {
  return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
}

export function inviteEmailHtml(input: {
  adminName: string
  acceptUrl: string
  coupleLabel: string | null
}): string {
  const weddingLine = input.coupleLabel
    ? `<p>You’ve been invited to help manage the wedding website for <strong>${escapeHtml(input.coupleLabel)}</strong>.</p>`
    : `<p>You’ve been invited to help manage a wedding website on ${escapeHtml(PRODUCT_NAME)}.</p>`

  return `<!doctype html>
<html>
  <body style="font-family: Georgia, serif; color: #1a1a1a; line-height: 1.5;">
    <h2 style="font-weight: 400; font-style: italic;">You’re invited</h2>
    <p>Hi ${escapeHtml(input.adminName)},</p>
    ${weddingLine}
    <p>
      <a href="${escapeAttr(input.acceptUrl)}" style="display:inline-block;padding:12px 20px;background:#2c3e50;color:#fff;text-decoration:none;border-radius:8px;">
        Accept invitation
      </a>
    </p>
    <p style="font-size: 14px; color: #555;">Or open this link:<br/>
      <a href="${escapeAttr(input.acceptUrl)}">${escapeHtml(input.acceptUrl)}</a>
    </p>
    <p style="font-size: 13px; color: #777;">If you weren’t expecting this, you can ignore this email.</p>
  </body>
</html>`
}

export function inviteEmailText(input: {
  adminName: string
  acceptUrl: string
  coupleLabel: string | null
}): string {
  const weddingLine = input.coupleLabel
    ? `You’ve been invited to help manage the wedding website for ${input.coupleLabel}.`
    : `You’ve been invited to help manage a wedding website on ${PRODUCT_NAME}.`

  return [
    `Hi ${input.adminName},`,
    '',
    weddingLine,
    '',
    `Accept your invitation:`,
    input.acceptUrl,
    '',
    `If you weren’t expecting this, you can ignore this email.`,
  ].join('\n')
}

export type GuestRsvpInviteEmailInput = {
  guestName: string
  coupleLabel: string
  weddingDateLabel: string
  websiteUrl: string | null
  rsvpUrl: string
  photosUrl: string | null
  theme: PublicThemeId
  /** Preview can toggle; live sends default to light. */
  mode?: ColorMode
}

export function guestRsvpInviteEmailHtml(
  input: GuestRsvpInviteEmailInput,
): string {
  const palette = getEmailThemePalette(input.theme, input.mode ?? EMAIL_SEND_MODE)
  const websiteBlock = input.websiteUrl
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${palette.foregroundSecondary};">
        Wedding website:<br/>
        <a href="${escapeAttr(input.websiteUrl)}" style="color:${palette.accent};word-break:break-all;">${escapeHtml(input.websiteUrl)}</a>
      </p>`
    : ''

  const photosBlock = input.photosUrl
    ? `<p style="margin:24px 0 12px;font-size:15px;line-height:1.55;color:${palette.foreground};">
        We’ve also shared a private photo album with you.
      </p>
      <p style="margin:0 0 12px;">
        ${ctaButton(input.photosUrl, 'View private photos', palette)}
      </p>
      <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:${palette.foregroundSecondary};">
        Or open:<br/>
        <a href="${escapeAttr(input.photosUrl)}" style="color:${palette.accent};word-break:break-all;">${escapeHtml(input.photosUrl)}</a>
      </p>`
    : ''

  const body = `
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${palette.foregroundSecondary};">
      You’re invited
    </p>
    <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-style:italic;line-height:1.2;color:${palette.foreground};">
      ${escapeHtml(input.coupleLabel)}
    </p>
    <div style="width:48px;height:1px;background:${palette.highlight};margin:0 0 20px;"></div>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${palette.foreground};">
      Hi ${escapeHtml(input.guestName)},
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${palette.foregroundSecondary};">
      You’re warmly invited to celebrate with
      <strong style="color:${palette.foreground};">${escapeHtml(input.coupleLabel)}</strong>
      on ${escapeHtml(input.weddingDateLabel)}.
    </p>
    ${websiteBlock}
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${palette.foreground};">
      Please RSVP with your personal link:
    </p>
    <p style="margin:0 0 12px;">
      ${ctaButton(input.rsvpUrl, 'RSVP now', palette)}
    </p>
    <p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:${palette.foregroundSecondary};">
      Or open this link:<br/>
      <a href="${escapeAttr(input.rsvpUrl)}" style="color:${palette.accent};word-break:break-all;">${escapeHtml(input.rsvpUrl)}</a>
    </p>
    ${photosBlock}
    <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:${palette.foregroundSecondary};">
      This link is just for you. Please don’t share it widely.
    </p>`

  return themedEmailDocument(palette, body)
}

export function guestRsvpInviteEmailText(
  input: GuestRsvpInviteEmailInput,
): string {
  const lines = [
    `Hi ${input.guestName},`,
    '',
    `You’re warmly invited to celebrate with ${input.coupleLabel} on ${input.weddingDateLabel}.`,
    '',
  ]

  if (input.websiteUrl) {
    lines.push(`Wedding website: ${input.websiteUrl}`, '')
  }

  lines.push('Please RSVP with your personal link:', input.rsvpUrl, '')

  if (input.photosUrl) {
    lines.push(
      'We’ve also shared a private photo album with you:',
      input.photosUrl,
      '',
    )
  }

  lines.push('This link is just for you. Please don’t share it widely.')
  return lines.join('\n')
}

export type GuestPhotoShareEmailInput = {
  guestName: string
  coupleLabel: string
  shareName: string
  photosUrl: string
  theme: PublicThemeId
  mode?: ColorMode
}

export function guestPhotoShareEmailHtml(
  input: GuestPhotoShareEmailInput,
): string {
  const palette = getEmailThemePalette(input.theme, input.mode ?? EMAIL_SEND_MODE)
  const body = `
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${palette.foregroundSecondary};">
      Private photos
    </p>
    <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-style:italic;line-height:1.2;color:${palette.foreground};">
      ${escapeHtml(input.coupleLabel)}
    </p>
    <div style="width:48px;height:1px;background:${palette.highlight};margin:0 0 20px;"></div>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${palette.foreground};">
      Hi ${escapeHtml(input.guestName)},
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${palette.foregroundSecondary};">
      <strong style="color:${palette.foreground};">${escapeHtml(input.coupleLabel)}</strong>
      shared a private photo album with you:
      <em style="color:${palette.foreground};">${escapeHtml(input.shareName)}</em>.
    </p>
    <p style="margin:0 0 12px;">
      ${ctaButton(input.photosUrl, 'View photos', palette)}
    </p>
    <p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:${palette.foregroundSecondary};">
      Or open this link:<br/>
      <a href="${escapeAttr(input.photosUrl)}" style="color:${palette.accent};word-break:break-all;">${escapeHtml(input.photosUrl)}</a>
    </p>
    <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:${palette.foregroundSecondary};">
      This album is private. Please don’t share the link widely.
    </p>`

  return themedEmailDocument(palette, body)
}

export function guestPhotoShareEmailText(
  input: GuestPhotoShareEmailInput,
): string {
  return [
    `Hi ${input.guestName},`,
    '',
    `${input.coupleLabel} shared a private photo album with you: ${input.shareName}.`,
    '',
    `View photos:`,
    input.photosUrl,
    '',
    `This album is private. Please don’t share the link widely.`,
  ].join('\n')
}

export type GuestDateAnnouncedEmailInput = {
  guestName: string
  coupleLabel: string
  weddingDateLabel: string
  websiteUrl: string | null
  rsvpUrl: string
  theme: PublicThemeId
  mode?: ColorMode
}

export function guestDateAnnouncedEmailHtml(
  input: GuestDateAnnouncedEmailInput,
): string {
  const palette = getEmailThemePalette(input.theme, input.mode ?? EMAIL_SEND_MODE)
  const websiteBlock = input.websiteUrl
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${palette.foregroundSecondary};">
        Wedding website:<br/>
        <a href="${escapeAttr(input.websiteUrl)}" style="color:${palette.accent};word-break:break-all;">${escapeHtml(input.websiteUrl)}</a>
      </p>`
    : ''

  const body = `
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${palette.foregroundSecondary};">
      Date announced
    </p>
    <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-style:italic;line-height:1.2;color:${palette.foreground};">
      ${escapeHtml(input.coupleLabel)}
    </p>
    <div style="width:48px;height:1px;background:${palette.highlight};margin:0 0 20px;"></div>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${palette.foreground};">
      Hi ${escapeHtml(input.guestName)},
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${palette.foregroundSecondary};">
      We’re excited to share the wedding date for
      <strong style="color:${palette.foreground};">${escapeHtml(input.coupleLabel)}</strong>:
    </p>
    <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-style:italic;line-height:1.3;color:${palette.foreground};">
      ${escapeHtml(input.weddingDateLabel)}
    </p>
    ${websiteBlock}
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${palette.foreground};">
      Please RSVP with your personal link when you can:
    </p>
    <p style="margin:0 0 12px;">
      ${ctaButton(input.rsvpUrl, 'RSVP now', palette)}
    </p>
    <p style="margin:0 0 0;font-size:13px;line-height:1.5;color:${palette.foregroundSecondary};">
      Or open this link:<br/>
      <a href="${escapeAttr(input.rsvpUrl)}" style="color:${palette.accent};word-break:break-all;">${escapeHtml(input.rsvpUrl)}</a>
    </p>`

  return themedEmailDocument(palette, body)
}

export function guestDateAnnouncedEmailText(
  input: GuestDateAnnouncedEmailInput,
): string {
  const lines = [
    `Hi ${input.guestName},`,
    '',
    `We’re excited to share the wedding date for ${input.coupleLabel}:`,
    input.weddingDateLabel,
    '',
  ]

  if (input.websiteUrl) {
    lines.push(`Wedding website: ${input.websiteUrl}`, '')
  }

  lines.push(
    'Please RSVP with your personal link when you can:',
    input.rsvpUrl,
    '',
  )

  return lines.join('\n')
}

function ctaButton(href: string, label: string, palette: EmailThemePalette) {
  return `<a href="${escapeAttr(href)}" style="display:inline-block;padding:12px 20px;background:${palette.accent};color:${palette.accentForeground};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
      ${escapeHtml(label)}
    </a>`
}

function themedEmailDocument(palette: EmailThemePalette, bodyHtml: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${palette.background};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${palette.background};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${palette.surface};border:1px solid ${palette.border};border-radius:12px;">
            <tr>
              <td style="padding:32px 28px;font-family:Georgia,'Times New Roman',serif;color:${palette.foreground};">
                ${bodyHtml}
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:${palette.foregroundSecondary};">
            ${escapeHtml(PRODUCT_NAME)}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", '&#39;')
}
