import { cva } from '@/lib/utils'
import type { VariantProps } from 'cva'

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'

const ringStyle = cva({
  base: [
    'relative animate-spin',
    'before:absolute before:top-0 before:left-0 before:block before:size-full before:rounded-full before:border-current before:opacity-40',
    'after:top-0 after:left-0 after:block after:size-full after:rounded-full after:border-transparent after:border-t-current after:border-r-current',
  ],
  variants: {
    size: {
      xs: 'size-2 before:border after:border',
      sm: 'size-3 before:border after:border',
      md: 'size-4 before:border-2 after:border-2',
      lg: 'size-5 before:border-2 after:border-2',
    } satisfies Record<SpinnerSize, string>,
  },
})

export interface SpinnerProps
  extends React.ComponentPropsWithRef<'div'>, VariantProps<typeof ringStyle> {}

export const Spinner = ({
  ref,
  className,
  size = 'md',
  ...props
}: SpinnerProps) => {
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-label="loading"
      className={ringStyle({ size, className })}
      {...props}
    />
  )
}
