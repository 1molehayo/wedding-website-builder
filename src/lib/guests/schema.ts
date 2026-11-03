import { z } from 'zod'
import {
  defaultPhoneCountry,
  isValidOptionalPhone,
  parseStoredPhone,
  toE164Phone,
  toStoredPhone,
} from '@/lib/auth/phone'
import type { CountryCode } from '@/lib/auth/phone'
import type { Guest } from '@/lib/supabase/types'

const requiredName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(80, `${label} must be 80 characters or fewer.`)

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .transform((value) => (value.length === 0 ? null : value))

export const INVITE_CHANNELS = ['email', 'whatsapp', 'both', 'none'] as const
export type InviteChannel = (typeof INVITE_CHANNELS)[number]

const emailField = z
  .string()
  .trim()
  .max(200, 'Email must be 200 characters or fewer.')
  .refine(
    (value) => value.length === 0 || z.email().safeParse(value).success,
    'Enter a valid email.',
  )

function phoneError(country: string, nationalNumber: string): string | null {
  if (!nationalNumber.trim()) return null
  try {
    toE164Phone(country as CountryCode, nationalNumber)
    return null
  } catch (error) {
    return error instanceof Error
      ? error.message
      : 'Enter a valid phone number for the selected country.'
  }
}

const guestFormFields = {
  firstName: requiredName('First name'),
  lastName: requiredName('Last name'),
  email: emailField,
  phoneCountry: z.string().min(1),
  phoneNational: z.string(),
  inviteChannel: z.enum(INVITE_CHANNELS),
  partyName: z
    .string()
    .trim()
    .max(120, 'Party name must be 120 characters or fewer.'),
  plusOnes: z.coerce
    .number()
    .int('Plus-ones must be a whole number.')
    .min(0, 'Plus-ones cannot be negative.')
    .max(20, 'Plus-ones must be 20 or fewer.'),
  notes: z.string().trim().max(2000, 'Notes must be 2000 characters or fewer.'),
}

function addContactIssues(
  value: {
    email: string
    phoneCountry: string
    phoneNational: string
    inviteChannel: InviteChannel
  },
  ctx: z.RefinementCtx,
  mode: 'create' | 'edit',
) {
  const channel = mode === 'create' ? value.inviteChannel : 'none'
  const wantsEmail = channel === 'email' || channel === 'both'
  const wantsPhone = channel === 'whatsapp' || channel === 'both'
  const email = value.email.trim()
  const national = value.phoneNational.trim()

  if (wantsEmail && !email) {
    ctx.addIssue({
      code: 'custom',
      path: ['email'],
      message: 'Email is required for an email invite.',
    })
  }

  const invalidPhone = phoneError(value.phoneCountry, value.phoneNational)
  if (wantsPhone && !national) {
    ctx.addIssue({
      code: 'custom',
      path: ['phoneNational'],
      message: 'Phone is required for a WhatsApp invite.',
    })
  } else if (invalidPhone) {
    ctx.addIssue({
      code: 'custom',
      path: ['phoneNational'],
      message: invalidPhone,
    })
  }
}

/** Create requires contact details that match the invite preference. Edit checks format only. */
export function guestFormSchemaFor(mode: 'create' | 'edit') {
  return z
    .object(guestFormFields)
    .superRefine((value, ctx) => {
      addContactIssues(value, ctx, mode)
    })
    .transform((value) => ({
      firstName: value.firstName,
      lastName: value.lastName,
      email: value.email.trim().toLowerCase(),
      phone: value.phoneNational.trim()
        ? toE164Phone(value.phoneCountry as CountryCode, value.phoneNational)
        : null,
      inviteChannel: value.inviteChannel,
      partyName: value.partyName.trim() ? value.partyName.trim() : null,
      plusOnes: value.plusOnes,
      notes: value.notes.trim() ? value.notes.trim() : null,
    }))
}

export const guestFormSchema = guestFormSchemaFor('create')

/** Form draft values (before Zod transforms). */
export type GuestFormValues = {
  firstName: string
  lastName: string
  email: string
  phoneCountry: CountryCode
  phoneNational: string
  inviteChannel: InviteChannel
  partyName: string
  plusOnes: number
  notes: string
}

export type GuestInput = {
  first_name: string
  last_name: string
  email: string
  phone: string | null
  party_name: string | null
  plus_ones: number
  notes: string | null
}

const storedGuestSchema = z.object({
  firstName: requiredName('First name'),
  lastName: requiredName('Last name'),
  email: emailField.transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .refine(isValidOptionalPhone, {
      message: 'Enter a valid phone number.',
    })
    .transform((value) => toStoredPhone(value)),
  partyName: optionalText('Party name', 120),
  plusOnes: guestFormFields.plusOnes,
  notes: optionalText('Notes', 2000),
})

export function parseGuestInput(data: unknown): GuestInput {
  const record =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : {}

  const parsed = storedGuestSchema.safeParse({
    firstName: record.first_name ?? record.firstName ?? '',
    lastName: record.last_name ?? record.lastName ?? '',
    email: record.email ?? '',
    phone: record.phone ?? '',
    partyName: record.party_name ?? record.partyName ?? '',
    plusOnes: record.plus_ones ?? record.plusOnes ?? 0,
    notes: record.notes ?? '',
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid guest.')
  }

  return {
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    party_name: parsed.data.partyName,
    plus_ones: parsed.data.plusOnes,
    notes: parsed.data.notes,
  }
}

export function guestFullName(
  guest: Pick<Guest, 'first_name' | 'last_name'>,
): string {
  return `${guest.first_name} ${guest.last_name}`.trim()
}

export function toGuestFormValues(guest: Guest): GuestFormValues {
  const phone = parseStoredPhone(guest.phone)
  return {
    firstName: guest.first_name,
    lastName: guest.last_name,
    email: guest.email ?? '',
    phoneCountry: phone.country,
    phoneNational: phone.nationalNumber,
    inviteChannel: 'none',
    partyName: guest.party_name ?? '',
    plusOnes: guest.plus_ones,
    notes: guest.notes ?? '',
  }
}

export function emptyGuestFormValues(): GuestFormValues {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phoneCountry: defaultPhoneCountry(),
    phoneNational: '',
    inviteChannel: 'email',
    partyName: '',
    plusOnes: 0,
    notes: '',
  }
}
