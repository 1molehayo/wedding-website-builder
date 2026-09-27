import { describe, expect, it } from 'vitest'
import {
  appliedColorMode,
  parseColorModePreference,
} from '@/lib/color-mode'

describe('color mode preference', () => {
  it('treats a missing or unknown value as system', () => {
    expect(parseColorModePreference(null)).toBe('system')
    expect(parseColorModePreference('')).toBe('system')
    expect(parseColorModePreference('auto')).toBe('system')
  })

  it('keeps an explicit light or dark choice', () => {
    expect(parseColorModePreference('light')).toBe('light')
    expect(parseColorModePreference('dark')).toBe('dark')
    expect(parseColorModePreference('system')).toBe('system')
  })

  it('uses a fixed choice instead of the device', () => {
    expect(appliedColorMode('light')).toBe('light')
    expect(appliedColorMode('dark')).toBe('dark')
  })
})
