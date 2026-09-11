import { z } from 'zod'
import {
  isValidOptionalPhone,
  toStoredPhone,
} from '@/lib/auth/phone'
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

export const guestFormSchema = z.object({
  firstName: requiredName('First name'),
  lastName: requiredName('Last name'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .max(200, 'Email must be 200 characters or fewer.')
    .email('Enter a valid email.')
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .refine(isValidOptionalPhone, {
      message: 'Enter a valid phone number.',
    })
    .transform((value) => toStoredPhone(value)),
  partyName: optionalText('Party name', 120),
  plusOnes: z.coerce
    .number()
    .int('Plus-ones must be a whole number.')
    .min(0, 'Plus-ones cannot be negative.')
    .max(20, 'Plus-ones must be 20 or fewer.'),
  notes: optionalText('Notes', 2000),
})

/** Form draft values (before Zod transforms). */
export type GuestFormValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
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

export function parseGuestInput(data: unknown): GuestInput {
  const record =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : {}

  const parsed = guestFormSchema.safeParse({
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
  return {
    firstName: guest.first_name,
    lastName: guest.last_name,
    email: guest.email ?? '',
    phone: guest.phone ?? '',
    partyName: guest.party_name ?? '',
    plusOnes: guest.plus_ones,
    notes: guest.notes ?? '',
  }
}
