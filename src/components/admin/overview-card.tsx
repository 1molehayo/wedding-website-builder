import type { ReactNode } from 'react'

export function OverviewCard({
  label,
  value,
  children,
}: {
  label: string
  value: number | string
  children?: ReactNode
}) {
  return (
    <div className="bg-surface border-border rounded-xl border p-5">
      <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
        {label}
      </p>
      <p className="font-serif mt-2 text-3xl tabular-nums">{value}</p>
      {children}
    </div>
  )
}
