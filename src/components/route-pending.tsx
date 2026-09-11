import { Spinner } from '@/components/ui/spinner'

/** Full-viewport pending state (FCP-style) while route beforeLoad/loaders run. */
export function RoutePending() {
  return (
    <div className="bg-background text-foreground flex min-h-dvh w-full items-center justify-center">
      <Spinner size="lg" className="text-accent" />
    </div>
  )
}

/** Inline pending state for admin shell outlet transitions. */
export function AdminOutletPending() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center py-16">
      <Spinner size="lg" className="text-accent" />
    </div>
  )
}
