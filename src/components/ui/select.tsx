import { CaretDownIcon } from '@phosphor-icons/react'
import type { VariantProps } from 'cva'
import { inputStyle } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface SelectProps
  extends
    Omit<React.ComponentPropsWithRef<'select'>, 'size'>,
    VariantProps<typeof inputStyle> {
  invalid?: boolean
}

const Select = ({
  className,
  invalid,
  variant,
  size,
  ref,
  ...props
}: SelectProps) => {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        data-invalid={invalid || undefined}
        aria-invalid={invalid || undefined}
        className={cn(
          inputStyle({ variant, size }),
          'appearance-none pr-10',
          className,
        )}
        {...props}
      />
      <CaretDownIcon
        aria-hidden
        className="text-foreground-secondary pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      />
    </div>
  )
}

export { Select }
