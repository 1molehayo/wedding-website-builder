import type { ReactNode } from 'react'
import { CheckIcon } from '@phosphor-icons/react'
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
    <div className="relative z-10 pointer-events-none">
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
          {label}
        </p>
        {active ? (
          <span className="bg-foreground text-background inline-flex size-5 items-center justify-center rounded-full">
            <CheckIcon className="size-3" weight="bold" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-serif text-3xl tabular-nums">{value}</p>
    </div>
  )

  return (
    <div
      className={cn(
        'bg-surface relative rounded-xl border p-5 transition duration-200',
        onClick &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-md',
        active
          ? 'border-foreground bg-background-secondary ring-foreground/15 shadow-sm ring-2'
          : 'border-border',
      )}
    >
      {onClick ? (
        <button
          type="button"
          aria-pressed={active}
          aria-label={`Filter by ${label.toLowerCase()}`}
          className="focus-visible:ring-ring absolute inset-0 z-0 rounded-xl focus-visible:ring-2 focus-visible:outline-none"
          onClick={onClick}
        />
      ) : null}
      {summary}
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  )
}
