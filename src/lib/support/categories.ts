export const SUPPORT_CATEGORIES = [
  {
    id: 'account_email',
    label: 'Account / email change',
  },
  {
    id: 'wedding_setup',
    label: 'Wedding setup help',
  },
  {
    id: 'permissions',
    label: 'Permissions / access',
  },
  {
    id: 'bug',
    label: 'Bug / something broken',
  },
  {
    id: 'other',
    label: 'Other',
  },
] as const

export type SupportCategoryId = (typeof SUPPORT_CATEGORIES)[number]['id']

export function supportCategoryLabel(id: string): string {
  return SUPPORT_CATEGORIES.find((item) => item.id === id)?.label ?? id
}

const MAX_SUPPORT_IMAGE_BYTES = 4.5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function assertSupportImage(input: {
  name: string
  type: string
  dataBase64: string
}) {
  if (!ALLOWED_IMAGE_TYPES.has(input.type)) {
    throw new Error('Image must be JPEG, PNG, or WebP.')
  }
  const size = Math.ceil((input.dataBase64.length * 3) / 4)
  if (size > MAX_SUPPORT_IMAGE_BYTES) {
    throw new Error('Image must be 4.5MB or smaller.')
  }
  const safeName = input.name.replace(/[^\w.-]+/g, '_').slice(0, 80)
  return {
    filename: safeName || 'attachment.jpg',
    contentBase64: input.dataBase64,
    contentType: input.type,
  }
}
