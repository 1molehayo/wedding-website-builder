import { z } from 'zod'
import type {
  PublicThemeId,
  RsvpStatus,
  WeddingStatus,
} from '@/lib/supabase/types'

export type PublicRsvpPageData = {
  token: string
  guestFirstName: string
  guestLastName: string
  partyName: string | null
  plusOnes: number
  maxAttending: number
  rsvpStatus: RsvpStatus
  attendingCount: number | null
  dietaryNotes: string | null
  message: string | null
  respondedAt: string | null
  /** Guest may edit when pending, or after admin unlock. */
  canEdit: boolean
  isOpen: boolean
  closedReason: string | null
  coupleLabel: string
  weddingDate: string | null
  weddingDateLabel: string
  venueName: string | null
  venueLocation: string | null
  theme: PublicThemeId
  weddingStatus: WeddingStatus
}

export const RSVP_STATUSES = [
  'pending',
  'attending',
  'declined',
] as const satisfies readonly RsvpStatus[]

export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
  pending: 'Pending',
  attending: 'Attending',
  declined: 'Declined',
}

const optionalText = (label: string, max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) return null
      const trimmed = value.trim()
      return trimmed.length === 0 ? null : trimmed
    })
    .refine((value) => value === null || value.length <= max, {
      message: `${label} must be ${max} characters or fewer.`,
    })

/** Public submit: guest chooses attending or declined (not pending). */
export const publicRsvpFormSchema = z
  .object({
    status: z.enum(['attending', 'declined']),
    attendingCount: z.coerce.number().int().min(0).max(21),
    dietaryNotes: optionalText('Dietary notes', 500),
    message: optionalText('Message', 1000),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'attending' && value.attendingCount < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['attendingCount'],
        message: 'Include at least yourself when attending.',
      })
    }
    if (value.status === 'declined' && value.attendingCount !== 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['attendingCount'],
        message: 'Attending count must be 0 when declining.',
      })
    }
  })

export type PublicRsvpFormValues = z.infer<typeof publicRsvpFormSchema>

export type PublicRsvpInput = {
  status: 'attending' | 'declined'
  attending_count: number
  dietary_notes: string | null
  rsvp_message: string | null
}

export function parsePublicRsvpInput(
  data: unknown,
  maxAttending: number,
): PublicRsvpInput {
  const record =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : {}

  const parsed = publicRsvpFormSchema.safeParse({
    status: record.status,
    attendingCount: record.attending_count ?? record.attendingCount ?? 0,
    dietaryNotes: record.dietary_notes ?? record.dietaryNotes,
    message: record.rsvp_message ?? record.message,
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid RSVP.')
  }

  if (
    parsed.data.status === 'attending' &&
    parsed.data.attendingCount > maxAttending
  ) {
    throw new Error(
      `Attending count cannot exceed ${maxAttending} for this invitation.`,
    )
  }

  return {
    status: parsed.data.status,
    attending_count:
      parsed.data.status === 'declined' ? 0 : parsed.data.attendingCount,
    dietary_notes: parsed.data.dietaryNotes,
    rsvp_message: parsed.data.message,
  }
}

/** Admin can set pending again or override a response. */
export const adminRsvpFormSchema = z
  .object({
    status: z.enum(RSVP_STATUSES),
    attendingCount: z.coerce.number().int().min(0).max(21),
    dietaryNotes: optionalText('Dietary notes', 500),
    message: optionalText('Message', 1000),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'attending' && value.attendingCount < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['attendingCount'],
        message: 'Include at least one person when attending.',
      })
    }
    if (value.status !== 'attending' && value.attendingCount !== 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['attendingCount'],
        message: 'Attending count must be 0 unless status is attending.',
      })
    }
  })

export type AdminRsvpFormValues = z.infer<typeof adminRsvpFormSchema>

export type AdminRsvpInput = {
  rsvp_status: RsvpStatus
  attending_count: number | null
  dietary_notes: string | null
  rsvp_message: string | null
}

export function parseAdminRsvpInput(
  data: unknown,
  maxAttending: number,
): AdminRsvpInput {
  const record =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : {}

  const parsed = adminRsvpFormSchema.safeParse({
    status: record.rsvp_status ?? record.status ?? 'pending',
    attendingCount: record.attending_count ?? record.attendingCount ?? 0,
    dietaryNotes: record.dietary_notes ?? record.dietaryNotes,
    message: record.rsvp_message ?? record.message,
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid RSVP.')
  }

  if (
    parsed.data.status === 'attending' &&
    parsed.data.attendingCount > maxAttending
  ) {
    throw new Error(
      `Attending count cannot exceed ${maxAttending} for this guest.`,
    )
  }

  return {
    rsvp_status: parsed.data.status,
    attending_count:
      parsed.data.status === 'attending' ? parsed.data.attendingCount : null,
    dietary_notes: parsed.data.dietaryNotes,
    rsvp_message: parsed.data.message,
  }
}

export function toAdminRsvpFormValues(guest: {
  rsvp_status: RsvpStatus
  attending_count: number | null
  dietary_notes: string | null
  rsvp_message: string | null
}): AdminRsvpFormValues {
  return {
    status: guest.rsvp_status,
    attendingCount:
      guest.rsvp_status === 'attending' ? (guest.attending_count ?? 1) : 0,
    dietaryNotes: guest.dietary_notes ?? '',
    message: guest.rsvp_message ?? '',
  }
}

export function toPublicRsvpFormValues(guest: {
  rsvp_status: RsvpStatus
  attending_count: number | null
  dietary_notes: string | null
  rsvp_message: string | null
  plus_ones: number
}): PublicRsvpFormValues {
  const status =
    guest.rsvp_status === 'pending' ? 'attending' : guest.rsvp_status
  return {
    status,
    attendingCount:
      status === 'attending'
        ? (guest.attending_count ?? 1)
        : 0,
    dietaryNotes: guest.dietary_notes ?? '',
    message: guest.rsvp_message ?? '',
  }
}

export function rsvpStatusBadgeVariant(
  status: RsvpStatus,
): 'neutral' | 'success' | 'error' | 'warning' {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'attending':
      return 'success'
    case 'declined':
      return 'error'
  }
}

export function maxAttendingForPlusOnes(plusOnes: number): number {
  return 1 + Math.max(0, Math.min(20, plusOnes))
}
