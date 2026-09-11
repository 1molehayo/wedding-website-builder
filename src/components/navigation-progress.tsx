import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Thin top progress bar while TanStack Router loads the next route
 * (loaders / beforeLoad). Skips flashes shorter than ~120ms.
 */
export function NavigationProgress() {
  const isLoading = useRouterState({ select: (state) => state.isLoading })
  const [visible, setVisible] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setCompleting(false)
      const showTimer = window.setTimeout(() => setVisible(true), 120)
      return () => window.clearTimeout(showTimer)
    }

    if (!visible) return

    setCompleting(true)
    const hideTimer = window.setTimeout(() => {
      setVisible(false)
      setCompleting(false)
    }, 220)
    return () => window.clearTimeout(hideTimer)
  }, [isLoading, visible])

  if (!visible) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
      role="progressbar"
      aria-hidden={!visible}
      aria-valuetext="Loading page"
    >
      <div
        className={cn(
          'bg-accent h-full origin-left shadow-[0_0_8px_color-mix(in_oklab,var(--color-accent)_55%,transparent)]',
          completing ? 'w-full transition-[width] duration-200 ease-out' : 'nav-progress-bar',
        )}
      />
    </div>
  )
}
