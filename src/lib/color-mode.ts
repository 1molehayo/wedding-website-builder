import { COLOR_MODE_STORAGE_KEY } from '@/lib/site-settings'
import type { ColorMode } from '@/lib/site-settings'

/** Light and dark are fixed. System follows the device appearance. */
export type ColorModePreference = ColorMode | 'system'

export function parseColorModePreference(
  value: string | null,
): ColorModePreference {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

export function getStoredColorModePreference(): ColorModePreference {
  if (typeof window === 'undefined') return 'system'
  return parseColorModePreference(
    window.localStorage.getItem(COLOR_MODE_STORAGE_KEY),
  )
}

export function systemColorMode(): ColorMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function appliedColorMode(preference: ColorModePreference): ColorMode {
  if (preference === 'system') return systemColorMode()
  return preference
}

export function resolveInitialColorMode(): ColorMode {
  return appliedColorMode(getStoredColorModePreference())
}

export function syncThemeColorMeta() {
  if (typeof document === 'undefined') return
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  const background = getComputedStyle(document.body).backgroundColor
  if (background) meta.setAttribute('content', background)
}

export function applyColorMode(mode: ColorMode) {
  document.documentElement.dataset.mode = mode
  document.documentElement.style.colorScheme = mode
  // Wait a frame so theme CSS variables resolve for the new mode.
  requestAnimationFrame(() => syncThemeColorMeta())
}

export function persistColorMode(mode: ColorMode) {
  persistColorModePreference(mode)
}

export function persistColorModePreference(preference: ColorModePreference) {
  window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, preference)
  applyColorMode(appliedColorMode(preference))
}

/**
 * Inline script for FOUC-free color mode before React hydrates.
 * Admin routes always stay light and ignore the public site preference.
 */
export const COLOR_MODE_INIT_SCRIPT = `(function(){try{var r=document.documentElement;var path=location.pathname||'';var isAdmin=path==='/admin'||path.indexOf('/admin/')===0;if(isAdmin){r.dataset.mode='light';r.style.colorScheme='light';return;}var k=${JSON.stringify(COLOR_MODE_STORAGE_KEY)};var s=localStorage.getItem(k);var m=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');r.dataset.mode=m;r.style.colorScheme=m;requestAnimationFrame(function(){var meta=document.querySelector('meta[name="theme-color"]');if(!meta)return;var bg=getComputedStyle(document.body).backgroundColor;if(bg)meta.setAttribute('content',bg);});}catch(e){}})();`
