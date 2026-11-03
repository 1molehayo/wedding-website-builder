import { createContext, use, useRef } from 'react'
import type { VariantProps } from 'cva'
import { Slot } from '@/components/slot'
import { cn, cva } from '@/lib/utils'

const inputFrameBase = [
  'w-full font-medium [&,&_*]:placeholder:font-normal [&,&_*]:placeholder:text-foreground/40',
  'border outline-none transition',
  'flex items-center',
  '[:focus-visible,:has(:focus-visible)]:ring-(length:--ring-width) ring-ring [:focus-visible,:has(:focus-visible)]:border-accent',
  '[:disabled,:has(input:disabled)]:cursor-not-allowed [:disabled,:has(input:disabled)]:opacity-50',
  '[[data-invalid],:has([data-invalid])]:border-error! [[data-invalid],:has([data-invalid])]:ring-error/20',
]

const inputFrameVariants = {
  default:
    'border-border bg-background shadow-xs hover:border-[color-mix(in_oklab,var(--color-border),var(--color-foreground)_8%)]',
  minimal:
    'border-transparent bg-transparent hover:bg-background-secondary [:focus-visible,:has(:focus-visible)]:bg-background',
}

const inputFrameSize = {
  xs: 'h-6 rounded-lg text-sm',
  sm: 'h-8 rounded-lg text-sm',
  md: 'h-10 rounded-xl text-base',
  lg: 'h-12 rounded-2xl text-base',
}

const inputHorizontalPaddingBySize = {
  xs: 'gap-1 px-2',
  sm: 'gap-1 px-3',
  md: 'gap-2 px-4',
  lg: 'gap-2 px-5',
}

const inputStyle = cva({
  base: [
    ...inputFrameBase,
    'file:mr-3 file:inline-flex file:h-full file:cursor-pointer file:items-center file:border-0 file:bg-transparent file:p-0 file:font-medium file:text-foreground',
  ],
  variants: {
    variant: inputFrameVariants,
    size: {
      xs: cn(inputFrameSize.xs, inputHorizontalPaddingBySize.xs),
      sm: cn(inputFrameSize.sm, inputHorizontalPaddingBySize.sm),
      md: cn(inputFrameSize.md, inputHorizontalPaddingBySize.md),
      lg: cn(inputFrameSize.lg, inputHorizontalPaddingBySize.lg),
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
})

const inputGroupStyle = cva({
  base: inputFrameBase,
  variants: {
    variant: inputFrameVariants,
    size: inputFrameSize,
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
})

const inputInGroupStyle = cva({
  base: [
    'h-full w-full min-w-8 cursor-[inherit] bg-transparent outline-none',
    'file:mr-3 file:inline-flex file:h-full file:cursor-pointer file:items-center file:border-0 file:bg-transparent file:p-0 file:font-medium file:text-foreground',
  ],
  variants: {
    size: {
      xs: 'px-2 [&:has(+[data-input-addon])]:pr-1 [[data-input-addon]+&]:pl-1',
      sm: 'px-3 [&:has(+[data-input-addon])]:pr-2 [[data-input-addon]+&]:pl-2',
      md: 'px-4 [&:has(+[data-input-addon])]:pr-3 [[data-input-addon]+&]:pl-3',
      lg: 'px-5 [&:has(+[data-input-addon])]:pr-4 [[data-input-addon]+&]:pl-4',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

const inputAddonStyle = cva({
  base: ['flex h-full shrink-0 items-center justify-center'],
  variants: {
    size: {
      xs: 'first:pl-2 last:pr-2',
      sm: 'first:pl-3 last:pr-3',
      md: 'first:pl-4 last:pr-4',
      lg: 'first:pl-5 last:pr-5',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

export type InputSize = 'xs' | 'sm' | 'md' | 'lg'
export type InputVariant = 'default' | 'minimal'

interface InputGroupContextValue {
  size: InputSize
  variant: InputVariant
}

const InputGroupContext = createContext<InputGroupContextValue | null>(null)

function useInputStyle(
  props: VariantProps<typeof inputStyle> & { className?: string },
) {
  const ctx = use(InputGroupContext)
  if (ctx) {
    return inputInGroupStyle({ size: ctx.size, className: props.className })
  }
  return inputStyle(props)
}

export interface InputProps
  extends
    Omit<React.ComponentPropsWithRef<'input'>, 'size'>,
    VariantProps<typeof inputStyle> {
  invalid?: boolean
}

const InputRoot = ({
  className,
  variant,
  size,
  invalid,
  ref,
  ...props
}: InputProps) => {
  return (
    <input
      ref={ref}
      data-invalid={invalid || undefined}
      aria-invalid={invalid || undefined}
      className={cn(useInputStyle({ variant, size, className }))}
      {...props}
    />
  )
}

interface InputGroupProps
  extends
    React.ComponentPropsWithRef<'div'>,
    VariantProps<typeof inputGroupStyle> {
  invalid?: boolean
}

const InputGroup = ({
  className,
  size = 'md',
  variant = 'default',
  invalid,
  children,
  onClick,
  ref,
  ...props
}: InputGroupProps) => {
  const handleGroupClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(event)
    if (!event.defaultPrevented && event.target === event.currentTarget) {
      event.currentTarget.querySelector('input')?.focus()
    }
  }

  return (
    <InputGroupContext value={{ size, variant }}>
      <div
        ref={ref}
        data-ui-input-group
        data-invalid={invalid || undefined}
        className={inputGroupStyle({ variant, size, className })}
        onClick={handleGroupClick}
        {...props}
      >
        {children}
      </div>
    </InputGroupContext>
  )
}

interface InputAddonProps extends React.ComponentPropsWithRef<'div'> {
  asChild?: boolean
}

const InputAddon = ({
  ref,
  className,
  asChild = false,
  onClick,
  ...props
}: InputAddonProps) => {
  const ctx = use(InputGroupContext)
  const Comp = asChild ? Slot : 'div'
  const internalRef = useRef<HTMLDivElement | null>(null)

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    const target = event.target as HTMLElement
    if (
      target.closest(
        'button, a, input, select, textarea, [role="button"], [role="combobox"], [role="menuitem"]',
      )
    ) {
      return
    }
    const group = event.currentTarget.closest<HTMLElement>(
      '[data-ui-input-group]',
    )
    group?.querySelector<HTMLElement>('input, textarea, select')?.focus()
  }

  return (
    <Comp
      data-input-addon
      className={cn(inputAddonStyle({ size: ctx?.size }), className)}
      ref={ref ?? internalRef}
      onClick={handleClick}
      {...props}
    />
  )
}

const Input = Object.assign(InputRoot, {
  Group: InputGroup,
  Addon: InputAddon,
})

export { Input, inputStyle }
