import { Resend } from 'resend'
import { getSuperAdminEmail } from '@/lib/auth/roles'
import { getLocalMailpitUrl, isLocalSupabase } from '@/lib/supabase/env'
import { PRODUCT_NAME, PRODUCT_NAME_ASCII } from '@/lib/constants'
import {
  adminOtpEmailHtml,
  adminOtpEmailText,
  guestDateAnnouncedEmailHtml,
  guestDateAnnouncedEmailText,
  guestPhotoShareEmailHtml,
  guestPhotoShareEmailText,
  guestRsvpInviteEmailHtml,
  guestRsvpInviteEmailText,
  inviteEmailHtml,
  inviteEmailText,
} from '@/lib/email/templates'
import type {
  GuestDateAnnouncedEmailInput,
  GuestPhotoShareEmailInput,
  GuestRsvpInviteEmailInput,
} from '@/lib/email/templates'

function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null
}

function emailDeliveryEnabled(): boolean {
  return process.env.EMAIL_DELIVERY_ENABLED?.trim() !== 'false'
}

function getResendClient() {
  const apiKey = getResendApiKey()
  if (!apiKey) {
    throw new Error(
      'Email is not configured (missing RESEND_API_KEY). Add it to send guest invites and other app email.',
    )
  }
  return new Resend(apiKey)
}

function supportFromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Wedding Website Builder <onboarding@resend.dev>'
  )
}

function superAdminInbox() {
  return getSuperAdminEmail(isLocalSupabase())
}

async function sendResendEmail(input: {
  to: string | string[]
  subject: string
  text: string
  html?: string
  replyTo?: string
}) {
  if (!emailDeliveryEnabled()) {
    console.info('[email skipped]', {
      to: input.to,
      subject: input.subject,
    })
    return { ok: true as const, id: 'skipped' }
  }

  const apiKey = getResendApiKey()
  if (!apiKey && isLocalSupabase()) {
    console.info('[email local fallback]', {
      to: input.to,
      subject: input.subject,
      text: input.text,
    })
    return { ok: true as const, id: 'local-log' }
  }

  const resend = getResendClient()
  const result = await resend.emails.send({
    from: supportFromAddress(),
    to: Array.isArray(input.to) ? input.to : [input.to],
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
    html: input.html,
  })

  if (result.error) {
    throw new Error(result.error.message)
  }

  return { ok: true as const, id: result.data.id }
}

export type SupportEmailInput = {
  category: string
  categoryLabel: string
  message: string
  adminName: string
  adminEmail: string
  adminRole: string
  weddingLabel: string | null
  attachment?: {
    filename: string
    contentBase64: string
    contentType: string
  } | null
}

export async function sendSupportEmail(input: SupportEmailInput) {
  const subject = `[${PRODUCT_NAME}] Support: ${input.categoryLabel} · ${input.adminName}`

  const text = [
    `Category: ${input.categoryLabel} (${input.category})`,
    `From: ${input.adminName} <${input.adminEmail}>`,
    `Role: ${input.adminRole}`,
    `Wedding: ${input.weddingLabel ?? 'None'}`,
    '',
    input.message,
  ].join('\n')

  const attachments = input.attachment
    ? [
        {
          filename: input.attachment.filename,
          content: Buffer.from(input.attachment.contentBase64, 'base64'),
          contentType: input.attachment.contentType,
        },
      ]
    : undefined

  if (!emailDeliveryEnabled()) {
    console.info('[email skipped]', { to: superAdminInbox(), subject })
    return { ok: true as const, id: 'skipped' }
  }

  const apiKey = getResendApiKey()
  if (!apiKey && isLocalSupabase()) {
    console.info('[email local fallback]', { subject, text })
    return { ok: true as const, id: 'local-log' }
  }

  const resend = getResendClient()
  const result = await resend.emails.send({
    from: supportFromAddress(),
    to: [superAdminInbox()],
    replyTo: input.adminEmail,
    subject,
    text,
    attachments,
  })

  if (result.error) {
    throw new Error(result.error.message)
  }

  return { ok: true as const, id: result.data.id }
}

export type DeletionRequestEmailInput = {
  adminName: string
  adminEmail: string
  reason: string
  weddingLabel: string | null
}

export async function sendDeletionRequestEmail(
  input: DeletionRequestEmailInput,
) {
  const subject = `[${PRODUCT_NAME}] Account deletion request · ${input.adminName}`

  const text = [
    'An admin requested deletion of their account.',
    '',
    `Name: ${input.adminName}`,
    `Email: ${input.adminEmail}`,
    `Wedding: ${input.weddingLabel ?? 'None'}`,
    '',
    'Reason:',
    input.reason,
    '',
    `Review and remove them from Admins if appropriate.`,
    `Super admin inbox: ${superAdminInbox()}`,
  ].join('\n')

  return sendResendEmail({
    to: superAdminInbox(),
    replyTo: input.adminEmail,
    subject,
    text,
  })
}

export async function sendAdminInviteEmail(input: {
  to: string
  adminName: string
  acceptUrl: string
  coupleLabel: string | null
}) {
  const subject = `[${PRODUCT_NAME}] You’re invited as an admin`
  return sendResendEmail({
    to: input.to,
    subject,
    text: inviteEmailText(input),
    html: inviteEmailHtml(input),
  })
}

/**
 * Admin sign-in OTP. Always delivered (unlike guest mail which can be skipped).
 * Prefer Resend when configured; otherwise local Mailpit; never invent couple names.
 */
export async function sendAdminOtpEmail(input: {
  to: string
  subject: string
  token: string
}) {
  const text = adminOtpEmailText({ token: input.token })
  const html = adminOtpEmailHtml({ token: input.token })

  const apiKey = getResendApiKey()
  if (apiKey) {
    const resend = getResendClient()
    const result = await resend.emails.send({
      from: supportFromAddress(),
      to: [input.to],
      subject: input.subject,
      text,
      html,
    })
    if (result.error) {
      throw new Error(result.error.message)
    }
    return { ok: true as const, id: result.data.id, channel: 'resend' as const }
  }

  if (isLocalSupabase()) {
    const mailpit = getLocalMailpitUrl()
    if (mailpit) {
      const response = await fetch(`${mailpit}/api/v1/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          From: {
            Email: `${PRODUCT_NAME_ASCII.toLowerCase()}@localhost`,
            Name: PRODUCT_NAME,
          },
          To: [{ Email: input.to }],
          Subject: input.subject,
          Text: text,
          HTML: html,
        }),
      })
      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(
          `Failed to deliver OTP to local Mailpit (${response.status})${detail ? `: ${detail}` : ''}`,
        )
      }
    }
    console.info('[admin otp local]', {
      to: input.to,
      subject: input.subject,
      mailpit: mailpit ?? 'unavailable — code logged below',
      text,
    })
    return { ok: true as const, id: 'local-mailpit', channel: 'local' as const }
  }

  throw new Error(
    'Email is not configured (missing RESEND_API_KEY). Add it to send admin sign-in codes.',
  )
}

export async function sendGuestRsvpInviteEmail(
  input: GuestRsvpInviteEmailInput & { to: string; replyTo?: string },
) {
  const subject = `You’re invited: ${input.coupleLabel}`
  return sendResendEmail({
    to: input.to,
    replyTo: input.replyTo,
    subject,
    text: guestRsvpInviteEmailText(input),
    html: guestRsvpInviteEmailHtml(input),
  })
}

export async function sendGuestPhotoShareEmail(
  input: GuestPhotoShareEmailInput & { to: string; replyTo?: string },
) {
  const subject = `Private photos from ${input.coupleLabel}`
  return sendResendEmail({
    to: input.to,
    replyTo: input.replyTo,
    subject,
    text: guestPhotoShareEmailText(input),
    html: guestPhotoShareEmailHtml(input),
  })
}

export async function sendGuestDateAnnouncedEmail(
  input: GuestDateAnnouncedEmailInput & { to: string; replyTo?: string },
) {
  const subject = `Wedding date announced: ${input.coupleLabel}`
  return sendResendEmail({
    to: input.to,
    replyTo: input.replyTo,
    subject,
    text: guestDateAnnouncedEmailText(input),
    html: guestDateAnnouncedEmailHtml(input),
  })
}

export async function sendInviteAcceptedEmail(input: {
  adminName: string
  adminEmail: string
  coupleLabel: string | null
}) {
  const subject = `[${PRODUCT_NAME}] Admin accepted invite · ${input.adminName}`
  const text = [
    'An invited admin accepted their invitation.',
    '',
    `Name: ${input.adminName}`,
    `Email: ${input.adminEmail}`,
    `Wedding: ${input.coupleLabel ?? 'None'}`,
  ].join('\n')

  return sendResendEmail({
    to: superAdminInbox(),
    replyTo: input.adminEmail,
    subject,
    text,
  })
}

export async function sendAdminRemovedEmail(input: {
  to: string
  adminName: string
  coupleLabel: string | null
}) {
  const subject = `[${PRODUCT_NAME}] Your admin access was removed`
  const text = [
    `Hi ${input.adminName},`,
    '',
    input.coupleLabel
      ? `Your admin access for ${input.coupleLabel} has been removed.`
      : `Your admin access on ${PRODUCT_NAME} has been removed.`,
    '',
    'If you believe this was a mistake, contact the couple’s super admin.',
  ].join('\n')

  return sendResendEmail({
    to: input.to,
    subject,
    text,
  })
}

export async function sendAdminRemovedConfirmationEmail(input: {
  to: string
  removedAdminName: string
  removedAdminEmail: string
  coupleLabel: string | null
}) {
  const subject = `[${PRODUCT_NAME}] Admin removed · ${input.removedAdminName}`
  const text = [
    'You successfully removed an admin.',
    '',
    `Name: ${input.removedAdminName}`,
    `Email: ${input.removedAdminEmail}`,
    `Wedding: ${input.coupleLabel ?? 'None'}`,
    '',
    'Their profile was archived. The email can be invited again if needed.',
  ].join('\n')

  return sendResendEmail({
    to: input.to,
    subject,
    text,
  })
}
