export const RESERVED_PUBLIC_SLUGS = new Set([
  'admin',
  'design',
  'rsvp',
  'api',
  'assets',
  'login',
  'invite',
  'www',
  'static',
  'health',
  'photos',
  'share',
  'media',
  'privacy',
  'cookies',
  'registry',
])

export function slugifySegment(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return slug || 'guest'
}

/** Wedding date year when set; otherwise year the wedding was set up (`created_at`). */
export function yearForPublicSlug(input: {
  weddingDate: string | null
  /** ISO timestamp from `weddings.created_at`. Omit on first create → uses now. */
  createdAt?: string | Date | null
}): string {
  if (input.weddingDate && /^\d{4}/.test(input.weddingDate)) {
    return input.weddingDate.slice(0, 4)
  }

  if (input.createdAt) {
    const created =
      typeof input.createdAt === 'string'
        ? new Date(input.createdAt)
        : input.createdAt
    if (!Number.isNaN(created.getTime())) {
      return String(created.getUTCFullYear())
    }
  }

  return String(new Date().getUTCFullYear())
}

/** bride-groom-year — create-time base format. */
export function buildWeddingPublicSlug(input: {
  brideName: string
  groomName: string
  weddingDate: string | null
  createdAt?: string | Date | null
}): string {
  return [
    slugifySegment(input.brideName),
    slugifySegment(input.groomName),
    yearForPublicSlug({
      weddingDate: input.weddingDate,
      createdAt: input.createdAt,
    }),
  ].join('-')
}

/** When bride-groom-year is taken: `{base}-{randomUUID}`. */
export function withPublicSlugUuid(
  baseSlug: string,
  uuid: string = crypto.randomUUID(),
): string {
  return `${baseSlug}-${uuid}`
}

export function parsePublicSlug(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Public URL slug is required.')
  }
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) {
    throw new Error('Public URL slug is required.')
  }
  // Room for bride-groom-year plus a full randomUUID suffix when needed.
  if (slug.length > 160) {
    throw new Error('Public URL slug must be 160 characters or fewer.')
  }
  if (RESERVED_PUBLIC_SLUGS.has(slug)) {
    throw new Error(`“${slug}” is reserved. Choose a different public URL.`)
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Use lowercase letters, numbers, and hyphens only.')
  }
  return slug
}

export function weddingPublicPath(slug: string): string {
  return `/${slug}`
}

export function isReservedPublicSlug(slug: string): boolean {
  return RESERVED_PUBLIC_SLUGS.has(slug.trim().toLowerCase())
}
