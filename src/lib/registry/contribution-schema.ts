import { z } from 'zod'
import { defaultPhoneCountry, toE164Phone } from '@/lib/auth/phone'
import type { CountryCode } from '@/lib/auth/phone'
import type { RegistryContributionStatus } from '@/lib/supabase/types'

export const CONTRIBUTION_STATUS_LABELS: Record<
  RegistryContributionStatus,
  string
> = {
  pending: 'Pending',
  received: 'Received',
  not_received: 'Not received',
}

export const updateContributionAmountSchema = z.object({
  contributionId: z.string().trim().min(1, 'Contribution is required.'),
  amount: z.coerce
    .number({ error: 'Enter an amount.' })
    .positive('Enter an amount greater than zero.')
    .max(999_999_999.99, 'Amount is too large.')
    .transform((value) => Math.round(value * 100) / 100),
})

export const setContributionStatusSchema = z.object({
  contributionId: z.string().trim().min(1, 'Contribution is required.'),
  status: z.enum(['pending', 'received', 'not_received']),
})

export function parseUpdateContributionAmount(data: unknown) {
  const result = updateContributionAmountSchema.safeParse(data)
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Invalid amount.')
  }
  return result.data
}

export function parseSetContributionStatus(data: unknown) {
  const result = setContributionStatusSchema.safeParse(data)
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Invalid status.')
  }
  return result.data
}

const emailField = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(200, 'Email must be 200 characters or fewer.')
  .refine((value) => z.email().safeParse(value).success, 'Enter a valid email.')

export const recordExternalContributionSchema = z.object({
  giftId: z.string().trim().min(1, 'Gift is required.'),
  provider: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === 'amazon', {
      message: 'Only Amazon purchases can be recorded for now.',
    }),
  amount: z.coerce
    .number({ error: 'Enter an amount.' })
    .positive('Enter an amount greater than zero.')
    .max(999_999_999.99, 'Amount is too large.')
    .transform((value) => Math.round(value * 100) / 100),
  currency: z
    .string()
    .trim()
    .min(1, 'Currency is required.')
    .max(12)
    .transform((value) => value.toUpperCase()),
  payerName: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(120, 'Name must be 120 characters or fewer.'),
  payerEmail: emailField,
  payerPhone: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) return null
      const trimmed = value.trim()
      return trimmed.length === 0 ? null : trimmed.slice(0, 40)
    }),
  externalRef: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) return null
      const trimmed = value.trim()
      return trimmed.length === 0 ? null : trimmed.slice(0, 120)
    }),
})

export function parseRecordExternalContribution(data: unknown) {
  const result = recordExternalContributionSchema.safeParse(data)
  if (!result.success) {
    throw new Error(
      result.error.issues[0]?.message ?? 'Invalid Amazon purchase.',
    )
  }
  return {
    ...result.data,
    payerEmail: result.data.payerEmail.toLowerCase(),
  }
}

export const startContributionFormSchema = z
  .object({
    weddingSlug: z.string().trim().min(1, 'Wedding is required.'),
    giftId: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => {
        if (value === null || value === undefined) return null
        const trimmed = value.trim()
        return trimmed.length === 0 ? null : trimmed
      }),
    amount: z.coerce
      .number({ error: 'Enter an amount.' })
      .positive('Enter an amount greater than zero.')
      .max(999_999_999.99, 'Amount is too large.')
      .transform((value) => Math.round(value * 100) / 100),
    currency: z
      .string()
      .trim()
      .min(1, 'Currency is required.')
      .max(12)
      .transform((value) => value.toUpperCase()),
    payerName: z
      .string()
      .trim()
      .min(1, 'Name is required.')
      .max(120, 'Name must be 120 characters or fewer.'),
    payerEmail: emailField,
    phoneCountry: z.string().min(1),
    phoneNational: z.string(),
    accountId: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => {
        if (value === null || value === undefined) return null
        const trimmed = value.trim()
        return trimmed.length === 0 ? null : trimmed
      }),
  })
  .superRefine((value, context) => {
    if (!value.phoneNational.trim()) return
    try {
      toE164Phone(value.phoneCountry as CountryCode, value.phoneNational)
    } catch (error) {
      context.addIssue({
        code: 'custom',
        path: ['phoneNational'],
        message:
          error instanceof Error
            ? error.message
            : 'Enter a valid phone number for the selected country.',
      })
    }
  })

export type StartContributionFormValues = z.infer<
  typeof startContributionFormSchema
>

export type StartContributionInput = {
  weddingSlug: string
  giftId: string | null
  amount: number
  currency: string
  payerName: string
  payerEmail: string
  payerPhone: string | null
  accountId: string | null
}

export function parseStartContributionInput(
  data: unknown,
): StartContributionInput {
  const result = startContributionFormSchema.safeParse(data)
  if (!result.success) {
    throw new Error(
      result.error.issues[0]?.message ?? 'Invalid contribution details.',
    )
  }
  const value = result.data
  const payerPhone = value.phoneNational.trim()
    ? toE164Phone(value.phoneCountry as CountryCode, value.phoneNational)
    : null

  return {
    weddingSlug: value.weddingSlug,
    giftId: value.giftId,
    amount: value.amount,
    currency: value.currency,
    payerName: value.payerName,
    payerEmail: value.payerEmail.toLowerCase(),
    payerPhone,
    accountId: value.accountId,
  }
}

export function emptyStartContributionForm(currency = 'USD'): {
  amount: string
  currency: string
  payerName: string
  payerEmail: string
  phoneCountry: CountryCode
  phoneNational: string
  accountId: string
} {
  return {
    amount: '',
    currency,
    payerName: '',
    payerEmail: '',
    phoneCountry: defaultPhoneCountry(),
    phoneNational: '',
    accountId: '',
  }
}
