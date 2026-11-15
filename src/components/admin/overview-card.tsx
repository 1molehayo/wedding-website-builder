import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function OverviewCard({
  label,
  value,
  children,
  onClick,
  active = false,
}: {
  label: string
  value: number | string
  children?: ReactNode
  onClick?: () => void
  active?: boolean
}) {
  const summary = (
    <>
      <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl tabular-nums">{value}</p>
    </>
  )

  return (
    <div
      className={cn(
        'bg-surface rounded-xl border p-5',
        active ? 'border-foreground' : 'border-border',
      )}
    >
      {onClick ? (
        <button
          type="button"
          aria-pressed={active}
          className="focus-visible:ring-ring w-full rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
          onClick={onClick}
        >
          {summary}
        </button>
      ) : (
        summary
      )}
      {children}
    </div>
  )
}
