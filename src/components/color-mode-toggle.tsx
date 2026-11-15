import { useEffect, useState } from 'react'
import { DesktopIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'
import { Tooltip } from '@/components/ui/tooltip'
import {
  appliedColorMode,
  applyColorMode,
  getStoredColorModePreference,
  persistColorModePreference,
  systemColorMode,
} from '@/lib/color-mode'
import type { ColorModePreference } from '@/lib/color-mode'
import { cn } from '@/lib/utils'

const OPTIONS: {
  id: ColorModePreference
  label: string
  icon: typeof SunIcon
}[] = [
  { id: 'light', label: 'Light', icon: SunIcon },
  { id: 'dark', label: 'Dark', icon: MoonIcon },
  { id: 'system', label: 'System', icon: DesktopIcon },
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
    <Tooltip.Group delayIn={200}>
      <div
        role="group"
        aria-label="Colour mode"
        className={cn(
          'public-mode-toggle flex rounded-lg border p-0.5 backdrop-blur-sm',
          className,
        )}
      >
        {OPTIONS.map((option) => {
          const selected = ready && preference === option.id
          const Icon = option.icon
          return (
            <Tooltip key={option.id} placement="bottom">
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  data-selected={selected || undefined}
                  aria-pressed={selected}
                  aria-label={selected ? undefined : option.label}
                  className={cn(
                    'public-mode-option inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition',
                    !selected && 'w-7 px-0',
                  )}
                  onClick={() => {
                    setPreference(option.id)
                    persistColorModePreference(option.id)
                  }}
                >
                  <Icon className="size-3.5" weight="regular" aria-hidden />
                  {selected ? option.label : null}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>{option.label}</Tooltip.Content>
            </Tooltip>
          )
        })}
      </div>
    </Tooltip.Group>
  )
}
