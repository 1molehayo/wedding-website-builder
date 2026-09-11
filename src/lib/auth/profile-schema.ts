import { z } from 'zod'
import { toE164Phone } from '@/lib/auth/phone'
import type { CountryCode } from '@/lib/auth/phone'
import { normalizeAdminEmail } from '@/lib/auth/roles'

const requiredName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(80, `${label} must be 80 characters or fewer.`)

function addPhoneIssue(
  ctx: z.RefinementCtx,
  path: PropertyKey[],
  phoneCountry: string,
  phoneNational: string,
) {
  if (!phoneNational.trim()) return
  try {
    toE164Phone(phoneCountry as CountryCode, phoneNational)
  } catch (error) {
    ctx.addIssue({
      code: 'custom',
      path,
      message:
        error instanceof Error
          ? error.message
          : 'Enter a valid phone number for the selected country.',
    })
  }
}

const profileFields = {
  firstName: requiredName('First name'),
  lastName: requiredName('Last name'),
  phoneCountry: z.string().min(1),
  phoneNational: z.string(),
}

/** Super admin can edit email. */
export const profileFormSchema = z
  .object({
    ...profileFields,
    email: z.email('Enter a valid email.'),
  })
  .superRefine((value, ctx) => {
    addPhoneIssue(ctx, ['phoneNational'], value.phoneCountry, value.phoneNational)
  })

/** Regular admin: email is read-only, skip format gate on save. */
export const profileFormSchemaAdmin = z
  .object({
    ...profileFields,
    email: z.string(),
  })
  .superRefine((value, ctx) => {
    addPhoneIssue(ctx, ['phoneNational'], value.phoneCountry, value.phoneNational)
  })

export type ProfileFormValues = z.infer<typeof profileFormSchema>

export const deletionReasonSchema = z
  .string()
  .trim()
  .min(10, 'Please share a bit more detail (at least 10 characters).')
  .max(2000, 'Reason must be 2000 characters or fewer.')

const updateProfileInputSchema = z
  .object({
    first_name: requiredName('First name'),
    last_name: requiredName('Last name'),
    phone_country: z.string().optional(),
    phone_national: z.string().optional(),
    email: z.email('Enter a valid email.').optional(),
  })
  .superRefine((value, ctx) => {
    addPhoneIssue(
      ctx,
      ['phone_national'],
      value.phone_country ?? 'NG',
      value.phone_national ?? '',
    )
  })

/** Server-fn input shape (snake_case) → validated handler payload. */
export function parseUpdateProfileInput(data: unknown): {
  firstName: string
  lastName: string
  phone: string | null
  email?: string
} {
  const parsed = updateProfileInputSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid profile.')
  }

  const phoneNational = parsed.data.phone_national ?? ''
  const phone = phoneNational.trim()
    ? toE164Phone(
        (parsed.data.phone_country || 'NG') as CountryCode,
        phoneNational,
      )
    : null

  return {
    firstName: parsed.data.first_name,
    lastName: parsed.data.last_name,
    phone,
    ...(parsed.data.email !== undefined
      ? { email: normalizeAdminEmail(parsed.data.email) }
      : {}),
  }
}
