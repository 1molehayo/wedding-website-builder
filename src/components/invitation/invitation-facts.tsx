import { invitationDateParts } from '@/lib/invitation/date-parts'
import { cn } from '@/lib/utils'

export type InvitationCardContent = {
  groomName: string
  brideName: string
  weddingDate: string | null
  venueName: string | null
  venueLocation: string | null
}

export function InviteLine({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-[0.62rem] leading-relaxed tracking-[0.2em] uppercase',
        className,
      )}
    >
      {children}
    </p>
  )
}

export function StackedNames({
  groomName,
  brideName,
  className,
}: {
  groomName: string
  brideName: string
  className?: string
}) {
  return (
    <div className={cn('font-serif leading-none italic', className)}>
      <p className="text-balance wrap-break-word">{groomName}</p>
      <p className="text-highlight my-1 text-[0.72em]">&amp;</p>
      <p className="text-balance wrap-break-word">{brideName}</p>
    </div>
  )
}

export function CapsNames({
  groomName,
  brideName,
  className,
}: {
  groomName: string
  brideName: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'font-serif leading-none tracking-[0.14em] uppercase',
        className,
      )}
    >
      <p className="text-balance wrap-break-word">{groomName}</p>
      <p className="text-highlight my-1 font-serif text-[0.7em] italic normal-case tracking-normal">
        and
      </p>
      <p className="text-balance wrap-break-word">{brideName}</p>
    </div>
  )
}

export function DateLine({
  weddingDate,
  className,
}: {
  weddingDate: string | null
  className?: string
}) {
  const parts = invitationDateParts(weddingDate)
  return (
    <p className={cn('font-serif text-base tracking-wide', className)}>
      {parts.label}
    </p>
  )
}

export function DateSplit({
  weddingDate,
  prominent = false,
}: {
  weddingDate: string | null
  prominent?: boolean
}) {
  const parts = invitationDateParts(weddingDate)
  if (!parts.day || !parts.month || !parts.weekday || !parts.year) {
    return <DateLine weddingDate={weddingDate} />
  }

  return (
    <div>
      <p
        className={cn(
          'tracking-[0.28em] uppercase',
          prominent ? 'text-xs' : 'text-[0.62rem]',
        )}
      >
        {parts.month}
      </p>
      <div className="mt-1.5 flex items-center justify-center gap-2.5">
        <span
          className={cn(
            'tracking-[0.14em] uppercase',
            prominent ? 'text-[0.7rem]' : 'text-[0.58rem]',
          )}
        >
          {parts.weekday}
        </span>
        <span className="bg-highlight h-px w-6 shrink-0" aria-hidden />
        <span
          className={cn(
            'font-serif leading-none',
            prominent ? 'text-5xl' : 'text-4xl',
          )}
        >
          {parts.day}
        </span>
        <span className="bg-highlight h-px w-6 shrink-0" aria-hidden />
        <span
          className={cn(
            'tracking-[0.16em]',
            prominent ? 'text-sm' : 'text-[0.62rem]',
          )}
        >
          {parts.year}
        </span>
      </div>
    </div>
  )
}

export function VenueLines({
  venueName,
  venueLocation,
  className,
}: {
  venueName: string | null
  venueLocation: string | null
  className?: string
}) {
  if (!venueName && !venueLocation) return null

  return (
    <div className={cn('space-y-0.5', className)}>
      {venueName ? (
        <p className="font-serif text-base leading-snug tracking-wide">
          {venueName}
        </p>
      ) : null}
      {venueLocation ? (
        <p className="text-sm leading-snug opacity-75">{venueLocation}</p>
      ) : null}
    </div>
  )
}

export function ReceptionLine({ className }: { className?: string }) {
  return (
    <p className={cn('font-serif text-base italic', className)}>
      Reception to follow
    </p>
  )
}

export function Hairline({ className }: { className?: string }) {
  return (
    <span
      className={cn('bg-highlight mx-auto block h-px w-10', className)}
      aria-hidden
    />
  )
}
