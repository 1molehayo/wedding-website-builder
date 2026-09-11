import type { PublicThemeId } from '@/lib/site-settings'
import { FALLBACK_PUBLIC_THEME } from '@/lib/site-settings'
import type { Wedding, WeddingStatus } from '@/lib/supabase/types'

export type PublicWeddingSettings = {
  groom_name: string
  bride_name: string
  /** Public date only — null when unpublished or unset (TBA). */
  wedding_date: string | null
  date_published_at: string | null
  venue_name: string | null
  venue_location: string | null
  dress_code: string | null
  active_public_theme: PublicThemeId
  status: WeddingStatus
  public_slug: string | null
}

export const FALLBACK_PUBLIC_WEDDING: PublicWeddingSettings = {
  groom_name: 'Marvelous',
  bride_name: 'Lillian',
  wedding_date: null,
  date_published_at: null,
  venue_name: null,
  venue_location: null,
  dress_code: null,
  active_public_theme: FALLBACK_PUBLIC_THEME,
  status: 'planning',
  public_slug: null,
}

/** Date shown to guests. Draft dates stay private until published. */
export function resolvePublicWeddingDate(
  wedding: Pick<Wedding, 'wedding_date' | 'date_published_at'> | {
    wedding_date: string | null
    date_published_at?: string | null
  } | null,
): string | null {
  if (!wedding?.wedding_date) return null
  if (!wedding.date_published_at) return null
  return wedding.wedding_date
}

export function isWeddingDatePublished(
  wedding: Pick<Wedding, 'wedding_date' | 'date_published_at'> | null,
): boolean {
  return Boolean(wedding?.wedding_date && wedding.date_published_at)
}

export function toPublicSettings(
  wedding: Pick<
    Wedding,
    | 'groom_name'
    | 'bride_name'
    | 'wedding_date'
    | 'date_published_at'
    | 'venue_name'
    | 'venue_location'
    | 'dress_code'
    | 'active_public_theme'
    | 'status'
    | 'public_slug'
  > | null,
): PublicWeddingSettings {
  if (!wedding) {
    return FALLBACK_PUBLIC_WEDDING
  }

  const publicDate = resolvePublicWeddingDate(wedding)

  return {
    groom_name: wedding.groom_name,
    bride_name: wedding.bride_name,
    wedding_date: publicDate,
    date_published_at: publicDate ? wedding.date_published_at : null,
    venue_name: wedding.venue_name,
    venue_location: wedding.venue_location,
    dress_code: wedding.dress_code,
    active_public_theme: wedding.active_public_theme,
    status: wedding.status,
    public_slug: wedding.public_slug,
  }
}

/** Guest-facing date label. Never invents a placeholder date. */
export function formatWeddingDate(date: string | null): string {
  if (!date) return 'Date to be announced'
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    dateStyle: 'long',
  })
}

/** Public site path for a wedding slug, or null when the slug is missing. */
export function publicWeddingPath(
  slug: string | null | undefined,
): string | null {
  const trimmed = typeof slug === 'string' ? slug.trim() : ''
  return trimmed ? `/${trimmed}` : null
}
