import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  appliedColorMode,
  applyColorMode,
  getStoredColorModePreference,
  persistColorModePreference,
  systemColorMode,
} from '@/lib/color-mode'
import type { ColorModePreference } from '@/lib/color-mode'
import { cn } from '@/lib/utils'

const OPTIONS: { id: ColorModePreference; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
]

export function ColorModeToggle({ className }: { className?: string }) {
  const [preference, setPreference] = useState<ColorModePreference>('system')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const initial = getStoredColorModePreference()
    setPreference(initial)
    setReady(true)
    applyColorMode(appliedColorMode(initial))
  }, [])

  useEffect(() => {
    if (!ready || preference !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => applyColorMode(systemColorMode())
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [preference, ready])

  return (
    <div
      role="group"
      aria-label="Colour mode"
      className={cn(
        'border-border bg-background/80 flex rounded-lg border p-0.5 backdrop-blur-sm',
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const selected = ready && preference === option.id
        return (
          <Button
            key={option.id}
            type="button"
            size="xs"
            variant={selected ? 'primary' : 'ghost'}
            aria-pressed={selected}
            className="px-2 shadow-none"
            onClick={() => {
              setPreference(option.id)
              persistColorModePreference(option.id)
            }}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
