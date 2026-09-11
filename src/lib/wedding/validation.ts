import { PUBLIC_THEMES } from '@/lib/site-settings'
import type { PublicThemeId } from '@/lib/site-settings'
import type { WeddingStatus } from '@/lib/supabase/types'
import { parsePublicSlug } from '@/lib/wedding/slug'

export const WEDDING_STATUSES = [
  'planning',
  'date_confirmed',
  'invitations_sent',
  'completed',
] as const satisfies readonly WeddingStatus[]

export const WEDDING_STATUS_LABELS: Record<WeddingStatus, string> = {
  planning: 'Planning',
  date_confirmed: 'Date confirmed',
  invitations_sent: 'Invitations sent',
  completed: 'Completed',
}

export type UpdateWeddingInput = {
  groom_name: string
  bride_name: string
  wedding_date: string | null
  status: WeddingStatus
  venue_name: string | null
  venue_location: string | null
  dress_code: string | null
  active_public_theme: PublicThemeId
  public_slug: string
}

function requiredName(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} is required.`)
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${label} is required.`)
  }
  if (trimmed.length > 80) {
    throw new Error(`${label} must be 80 characters or fewer.`)
  }
  return trimmed
}

function optionalText(value: unknown, label: string): string | null {
  if (value == null) return null
  if (typeof value !== 'string') {
    throw new Error(`${label} must be text.`)
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > 200) {
    throw new Error(`${label} must be 200 characters or fewer.`)
  }
  return trimmed
}

function optionalDate(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string') {
    throw new Error('Wedding date must be a date string.')
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('Wedding date must use YYYY-MM-DD format.')
  }
  const parsed = new Date(`${trimmed}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Wedding date is invalid.')
  }
  if (parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new Error('Wedding date is invalid.')
  }
  return trimmed
}

function parseStatus(value: unknown): WeddingStatus {
  if (
    typeof value === 'string' &&
    (WEDDING_STATUSES as readonly string[]).includes(value)
  ) {
    return value as WeddingStatus
  }
  throw new Error('Wedding status is invalid.')
}

function parseTheme(value: unknown): PublicThemeId {
  if (
    typeof value === 'string' &&
    (PUBLIC_THEMES as readonly string[]).includes(value)
  ) {
    return value as PublicThemeId
  }
  throw new Error('Public theme is invalid.')
}

export function parseUpdateWeddingInput(data: unknown): UpdateWeddingInput {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid wedding settings payload.')
  }

  const input = data as Record<string, unknown>

  return {
    groom_name: requiredName(input.groom_name, 'Groom name'),
    bride_name: requiredName(input.bride_name, 'Bride name'),
    wedding_date: optionalDate(input.wedding_date),
    status: parseStatus(input.status),
    venue_name: optionalText(input.venue_name, 'Venue name'),
    venue_location: optionalText(input.venue_location, 'Venue location'),
    dress_code: optionalText(input.dress_code, 'Dress code'),
    active_public_theme: parseTheme(input.active_public_theme),
    // Empty is allowed here; update handler restores the saved create-time slug.
    public_slug:
      typeof input.public_slug === 'string' && !input.public_slug.trim()
        ? ''
        : parsePublicSlug(input.public_slug),
  }
}
