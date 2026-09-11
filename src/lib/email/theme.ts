import type { ColorMode, PublicThemeId } from '@/lib/site-settings'
import { FALLBACK_PUBLIC_THEME } from '@/lib/site-settings'

/** Inline hex palettes for email clients (no CSS variables). */
export type EmailThemePalette = {
  background: string
  backgroundSecondary: string
  surface: string
  foreground: string
  foregroundSecondary: string
  accent: string
  accentForeground: string
  highlight: string
  border: string
}

/** Live sends use light — more readable across inbox clients. */
export const EMAIL_SEND_MODE: ColorMode = 'light'

const EMAIL_THEME_PALETTES: Record<
  PublicThemeId,
  Record<ColorMode, EmailThemePalette>
> = {
  celeste: {
    light: {
      background: '#faf8f4',
      backgroundSecondary: '#f5f0e5',
      surface: '#ffffff',
      foreground: '#1a2744',
      foregroundSecondary: '#5a6578',
      accent: '#6f93b8',
      accentForeground: '#ffffff',
      highlight: '#c4a574',
      border: '#e5d7c2',
    },
    dark: {
      background: '#0f1729',
      backgroundSecondary: '#1a2744',
      surface: '#151f33',
      foreground: '#faf8f4',
      foregroundSecondary: '#c5c0b6',
      accent: '#9bb8d4',
      accentForeground: '#0f1729',
      highlight: '#e8c97a',
      border: '#3a4a62',
    },
  },
  botanica: {
    light: {
      background: '#f7f5ef',
      backgroundSecondary: '#efe8d8',
      surface: '#ffffff',
      foreground: '#1a2744',
      foregroundSecondary: '#5a6578',
      accent: '#6f8b6a',
      accentForeground: '#ffffff',
      highlight: '#c4a574',
      border: '#d7e0d4',
    },
    dark: {
      background: '#141c16',
      backgroundSecondary: '#1d2820',
      surface: '#1a231c',
      foreground: '#f2efe6',
      foregroundSecondary: '#c4c0b6',
      accent: '#8fa88a',
      accentForeground: '#142018',
      highlight: '#e8c97a',
      border: '#354438',
    },
  },
  rosewater: {
    light: {
      background: '#fbf7f4',
      backgroundSecondary: '#f3e8e3',
      surface: '#ffffff',
      foreground: '#1a2744',
      foregroundSecondary: '#5a6578',
      accent: '#c99393',
      accentForeground: '#ffffff',
      highlight: '#c4a574',
      border: '#edd8d8',
    },
    dark: {
      background: '#1a1214',
      backgroundSecondary: '#2a1c20',
      surface: '#24181b',
      foreground: '#faf2ef',
      foregroundSecondary: '#c9c0bc',
      accent: '#e8c4c4',
      accentForeground: '#2a1618',
      highlight: '#e8c97a',
      border: '#4a3538',
    },
  },
  nocturne: {
    light: {
      background: '#f4f6fa',
      backgroundSecondary: '#e7ecf4',
      surface: '#ffffff',
      foreground: '#0f1729',
      foregroundSecondary: '#5a6578',
      accent: '#1a2744',
      accentForeground: '#ffffff',
      highlight: '#c4a574',
      border: '#d5dbe6',
    },
    dark: {
      background: '#0a0e16',
      backgroundSecondary: '#141b2a',
      surface: '#121826',
      foreground: '#f3efe6',
      foregroundSecondary: '#c4c0b6',
      accent: '#9bb8d4',
      accentForeground: '#0f1729',
      highlight: '#e8c97a',
      border: '#2a3548',
    },
  },
}

export function resolveEmailThemeId(
  theme: PublicThemeId | string | null | undefined,
): PublicThemeId {
  if (
    theme === 'celeste' ||
    theme === 'botanica' ||
    theme === 'rosewater' ||
    theme === 'nocturne'
  ) {
    return theme
  }
  return FALLBACK_PUBLIC_THEME
}

export function getEmailThemePalette(
  theme: PublicThemeId | string | null | undefined,
  mode: ColorMode = EMAIL_SEND_MODE,
): EmailThemePalette {
  return EMAIL_THEME_PALETTES[resolveEmailThemeId(theme)][mode]
}
