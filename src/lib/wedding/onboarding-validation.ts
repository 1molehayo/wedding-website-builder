import { PUBLIC_THEMES } from '@/lib/site-settings'
import type { PublicThemeId } from '@/lib/site-settings'

export type OnboardingInput = {
  groom_name: string
  bride_name: string
  wedding_date?: string | null
  venue_name?: string | null
  venue_location?: string | null
  dress_code?: string | null
  active_public_theme?: PublicThemeId | null
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

function optionalTheme(value: unknown): PublicThemeId | null {
  if (value == null || value === '') return null
  if (
    typeof value === 'string' &&
    (PUBLIC_THEMES as readonly string[]).includes(value)
  ) {
    return value as PublicThemeId
  }
  throw new Error('Public theme is invalid.')
}

export function parseOnboardingInput(data: unknown): {
  groom_name: string
  bride_name: string
  wedding_date: string | null
  venue_name: string | null
  venue_location: string | null
  dress_code: string | null
  active_public_theme: PublicThemeId | null
} {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid onboarding payload.')
  }

  const input = data as Record<string, unknown>

  return {
    groom_name: requiredName(input.groom_name, 'Groom name'),
    bride_name: requiredName(input.bride_name, 'Bride name'),
    wedding_date: optionalDate(input.wedding_date),
    venue_name: optionalText(input.venue_name, 'Venue name'),
    venue_location: optionalText(input.venue_location, 'Venue location'),
    dress_code: optionalText(input.dress_code, 'Dress code'),
    active_public_theme: optionalTheme(input.active_public_theme),
  }
}
