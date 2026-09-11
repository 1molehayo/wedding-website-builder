import type { VariantProps } from 'cva'
import { Slot } from '@/components/slot'
import { Spinner } from '@/components/ui/spinner'
import { cn, cva } from '@/lib/utils'

const buttonStyle = cva({
  base: [
    'relative inline-flex h-(--button-height) shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium text-(--button-text-color) shadow-xs [--button-text-color:var(--color-foreground)]',
    'transition enabled:cursor-pointer disabled:opacity-40',
    'active:scale-98',
    'focus-visible:ring-(length:--ring-width) ring-ring focus-visible:outline-none',
  ],
  variants: {
    variant: {
      primary:
        'bg-accent [--button-text-color:var(--color-accent-foreground)] hover:bg-accent/90',
      outline:
        'border border-border bg-surface shadow-sm hover:bg-foreground/4 focus-visible:border-accent',
      ghost:
        'border-none bg-transparent shadow-none ring-0 hover:bg-foreground/5',
      destructive:
        'bg-error ring-error/50 [--button-text-color:var(--color-white)] hover:bg-error/90',
    },
    size: {
      xs: 'rounded-lg px-2 text-sm [--button-height:--spacing(6)]',
      sm: 'rounded-lg px-3 text-sm [--button-height:--spacing(8)]',
      md: 'rounded-xl px-4 text-base [--button-height:--spacing(10)]',
      lg: 'rounded-2xl px-5 text-base [--button-height:--spacing(12)]',
    },
    square: {
      true: 'w-(--button-height) px-0',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

export interface ButtonProps
  extends
    React.ComponentPropsWithRef<'button'>,
    VariantProps<typeof buttonStyle> {
  asChild?: boolean
  isLoading?: boolean
}

const Button = ({
  children,
  className,
  variant,
  asChild = false,
  isLoading,
  size = 'md',
  square,
  type = 'button',
  ref,
  disabled,
  ...props
}: ButtonProps) => {
  const classes = cn(
    buttonStyle({ className, variant, size, square }),
    isLoading && 'text-transparent transition-none',
  )
  const isDisabled = Boolean(disabled || isLoading)

  // asChild must slot styles onto the child (e.g. Link) directly.
  // Wrapping with Slottable/Fragment drops classes and looks like plain text.
  if (asChild) {
    return (
      <Slot className={classes} ref={ref} disabled={isDisabled} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      className={classes}
      ref={ref}
      type={type}
      disabled={isDisabled}
      {...props}
    >
      {children}
      {isLoading ? (
        <span
          data-button-spinner
          className="text-(--button-text-color) absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <Spinner size={size} />
        </span>
      ) : null}
    </button>
  )
}

export interface IconButtonProps extends Omit<ButtonProps, 'square'> {
  'aria-label': string
}

const IconButton = ({ ref, ...props }: IconButtonProps) => {
  return <Button square {...props} ref={ref} />
}

export { buttonStyle, Button, IconButton }
