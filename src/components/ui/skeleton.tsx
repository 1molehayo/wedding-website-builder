import { cn } from '@/lib/utils'

export function Skeleton({
  className,
  ...props
}: React.ComponentPropsWithRef<'div'>) {
  return (
    <div
      className={cn(
        'bg-background-secondary animate-pulse',
        className,
      )}
      {...props}
    />
  )
}
