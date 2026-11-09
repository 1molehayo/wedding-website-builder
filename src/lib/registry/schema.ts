import { z } from 'zod'
import { CURATED_CURRENCY_CODES } from '@/lib/currency/currencies'
import { amazonRegistryUrlError } from '@/lib/registry/amazon-url'

const curatedCurrencySchema = z
  .string()
  .trim()
  .min(1, 'Currency is required.')
  .transform((value) => value.toUpperCase())
  .refine(
    (value): value is (typeof CURATED_CURRENCY_CODES)[number] =>
      (CURATED_CURRENCY_CODES as readonly string[]).includes(value),
    {
      message: 'Choose USD, EUR, GBP, or NGN.',
    },
  )

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

const optionalUrl = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null
    const trimmed = value.trim()
    return trimmed.length === 0 ? null : trimmed
  })
  .refine((value) => value === null || value.length <= 2000, {
    message: 'Link must be 2000 characters or fewer.',
  })
  .refine((value) => {
    if (value === null) return true
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }, 'Enter a valid http(s) link, or leave it empty.')

const priceRowSchema = z.object({
  currency: curatedCurrencySchema,
  amount: z.coerce
    .number({ error: 'Enter a price.' })
    .positive('Enter a price greater than zero.')
    .max(999_999_999.99, 'Price is too large.')
    .transform((value) => Math.round(value * 100) / 100),
})

export const registryItemFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(120),
    description: optionalText('Description', 2000),
    store_url: optionalUrl,
    /** Amazon wedding-registry / product URL. Saved as a listing, not store_url. */
    amazon_url: optionalUrl.optional().transform((value) => value ?? null),
    photo_path: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => {
        if (value === null || value === undefined) return null
        const trimmed = value.trim()
        return trimmed.length === 0 ? null : trimmed
      })
      .refine(
        (value) =>
          value === null ||
          (value.startsWith('registry/') && !value.includes('..')),
        { message: 'Gift photo path is invalid.' },
      ),
    prices: z
      .array(priceRowSchema)
      .min(1, 'Add a currency and price.')
      .max(1, 'List one price. Guests convert with live rates when they pay.'),
    desired_qty: z.coerce.number().int().min(1).max(100),
    claimed_qty: z.coerce.number().int().min(0).max(100),
    status: z.enum(['available', 'reserved', 'purchased']),
    is_visible: z.boolean(),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>()
    value.prices.forEach((price, index) => {
      if (seen.has(price.currency)) {
        context.addIssue({
          code: 'custom',
          path: ['prices', index, 'currency'],
          message: 'Each currency can only be listed once.',
        })
      }
      seen.add(price.currency)
    })
    if (value.claimed_qty > value.desired_qty) {
      context.addIssue({
        code: 'custom',
        path: ['claimed_qty'],
        message: 'Claimed quantity cannot exceed desired quantity.',
      })
    }
    const amazonError = amazonRegistryUrlError(value.amazon_url ?? null)
    if (amazonError) {
      context.addIssue({
        code: 'custom',
        path: ['amazon_url'],
        message: amazonError,
      })
    }
  })

export type RegistryItemFormValues = z.infer<typeof registryItemFormSchema>

export const registryAccountFormSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.').max(80),
  bank_name: optionalText('Bank name', 120),
  currency: curatedCurrencySchema,
  account_name: z.string().trim().min(1, 'Account name is required.').max(120),
  account_number: z
    .string()
    .trim()
    .min(1, 'Account number is required.')
    .max(80),
  routing_number: optionalText('Routing / sort code', 80),
  notes: optionalText('Notes', 500),
  is_enabled: z.boolean(),
})

export type RegistryAccountFormValues = z.infer<
  typeof registryAccountFormSchema
>

/** Short line kept on the gift for the current public card until contributions replace it. */
export function formatRegistryPriceLabel(
  prices: Array<{ amount: number; currency: string }>,
): string | null {
  if (prices.length === 0) return null
  return prices.map((price) => `${price.amount} ${price.currency}`).join(' · ')
}

export function registryFormFieldErrors(error: z.ZodError): {
  fields: Record<string, string>
} {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    let key = ''
    for (const part of issue.path) {
      if (typeof part === 'number') {
        key += `[${part}]`
      } else if (typeof part === 'string') {
        key += key ? `.${part}` : part
      }
    }
    if (!key || fields[key]) continue
    fields[key] = issue.message
  }
  return { fields }
}

export function parseRegistryItemInput(data: unknown): RegistryItemFormValues {
  const result = registryItemFormSchema.safeParse(data)
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Invalid gift item.')
  }
  const values = result.data
  if (values.claimed_qty > values.desired_qty) {
    throw new Error('Claimed quantity cannot exceed desired quantity.')
  }
  return values
}

export function parseRegistryAccountInput(
  data: unknown,
): RegistryAccountFormValues {
  const result = registryAccountFormSchema.safeParse(data)
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Invalid bank account.')
  }
  return result.data
}

export const REGISTRY_ITEM_STATUS_LABELS = {
  available: 'Available',
  reserved: 'Reserved',
  purchased: 'Purchased',
} as const
