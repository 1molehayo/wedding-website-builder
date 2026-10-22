import { z } from 'zod'

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

export const registryItemFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(120),
  description: optionalText('Description', 2000),
  store_url: z
    .string()
    .trim()
    .min(1, 'Store / gift link is required.')
    .max(2000)
    .refine((value) => {
      try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    }, 'Enter a valid http(s) gift or store link.'),
  price_label: optionalText('Price label', 40),
  desired_qty: z.coerce.number().int().min(1).max(100),
  claimed_qty: z.coerce.number().int().min(0).max(100),
  status: z.enum(['available', 'reserved', 'purchased']),
  is_visible: z.boolean(),
})

export type RegistryItemFormValues = z.infer<typeof registryItemFormSchema>

export const registryAccountFormSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.').max(80),
  bank_name: optionalText('Bank name', 120),
  currency: z
    .string()
    .trim()
    .min(1, 'Currency is required.')
    .max(12)
    .transform((value) => value.toUpperCase()),
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
