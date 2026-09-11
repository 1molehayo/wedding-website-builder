import type { ReactNode } from 'react'

export function formatLastUpdated(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function PageActionBar({
  children,
  lastUpdatedAt,
}: {
  children: ReactNode
  lastUpdatedAt?: string | null
}) {
  const lastUpdated = formatLastUpdated(lastUpdatedAt)

  return (
    <>
      <div className="h-16" aria-hidden />
      <div className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-sm md:left-60">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-8">
          {lastUpdatedAt !== undefined ? (
            <p className="text-foreground-secondary min-w-0 text-sm">
              {lastUpdated
                ? `Last updated ${lastUpdated}`
                : 'Not saved yet'}
            </p>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
