import { useEffect, useState } from 'react'
import { MoonIcon, SunIcon } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/button'
import {
  applyColorMode,
  persistColorMode,
  resolveInitialColorMode,
} from '@/lib/color-mode'
import type { ColorMode } from '@/lib/site-settings'

export function ColorModeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<ColorMode>('light')

  useEffect(() => {
    const initial = resolveInitialColorMode()
    setMode(initial)
    applyColorMode(initial)
  }, [])

  const toggle = () => {
    const next: ColorMode = mode === 'light' ? 'dark' : 'light'
    setMode(next)
    persistColorMode(next)
  }

  return (
    <IconButton
      type="button"
      variant="outline"
      size="sm"
      className={className}
      aria-label={
        mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
      }
      onClick={toggle}
    >
      {mode === 'light' ? <MoonIcon weight="regular" /> : <SunIcon weight="regular" />}
    </IconButton>
  )
}
