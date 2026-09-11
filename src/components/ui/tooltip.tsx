import type {
  Placement,
  UseFloatingOptions,
  UseInteractionsReturn,
} from '@floating-ui/react'
import {
  FloatingArrow,
  FloatingDelayGroup,
  FloatingPortal,
  arrow,
  autoUpdate,
  flip,
  hide,
  offset as offsetMiddleware,
  safePolygon,
  useDelayGroup,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
  useTransitionStatus,
} from '@floating-ui/react'
import { createContext, use, useCallback, useMemo, useRef, useState } from 'react'
import { Slot } from '@/components/slot'
import { useTopLayer } from '@/hooks/use-top-layer'
import { cn } from '@/lib/utils'

const DEFAULT_DELAY_IN = 600
const DEFAULT_DELAY_OUT = 0
const ARROW_HEIGHT = 4
const ARROW_WIDTH = 8
const DEFAULT_GROUP_TIMEOUT_MS = 150

interface UseTooltipFloatingOptions {
  initialOpen?: boolean
  open?: boolean
  onOpenChange?: UseFloatingOptions['onOpenChange']
  placement?: Placement
  offset?: number
  delayIn?: number
  delayOut?: number
  disabled?: boolean
  persistOnClick?: boolean
}

const useTooltipFloating = ({
  initialOpen = false,
  open: propsOpen,
  onOpenChange: propsOnOpenChange,
  placement = 'top',
  offset = 4,
  delayIn = DEFAULT_DELAY_IN,
  delayOut = DEFAULT_DELAY_OUT,
  disabled = false,
  persistOnClick = false,
}: UseTooltipFloatingOptions) => {
  const arrowRef = useRef<SVGSVGElement | null>(null)
  const [internalOpen, setInternalOpen] = useState(initialOpen)

  const open = propsOpen ?? internalOpen

  const setOpen = useCallback<NonNullable<UseFloatingOptions['onOpenChange']>>(
    (nextOpen, event, reason) => {
      setInternalOpen(nextOpen)
      propsOnOpenChange?.(nextOpen, event, reason)
    },
    [propsOnOpenChange],
  )

  const floating = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: (...args) =>
      autoUpdate(...args, {
        elementResize: true,
        layoutShift: true,
      }),
    middleware: [
      flip({ fallbackAxisSideDirection: 'start', padding: offset * 2 }),
      offsetMiddleware(offset + ARROW_HEIGHT),
      arrow({ element: arrowRef, padding: 8 }),
      hide(),
    ],
  })

  return useMemo(
    () => ({
      open,
      setOpen,
      arrowRef,
      delayIn,
      delayOut,
      disabled,
      persistOnClick,
      ...floating,
    }),
    [open, setOpen, delayIn, delayOut, disabled, persistOnClick, floating],
  )
}

interface TooltipContextType
  extends ReturnType<typeof useTooltipFloating>,
    UseInteractionsReturn {}

const TooltipContext = createContext<TooltipContextType | null>(null)

const useTooltipContext = () => {
  const context = use(TooltipContext)
  if (context == null) {
    throw new Error('Tooltip components must be wrapped in <Tooltip />')
  }
  return context
}

interface TooltipProps extends UseTooltipFloatingOptions {
  children: React.ReactNode
}

const TooltipRoot = ({ children, ...props }: TooltipProps) => {
  const floating = useTooltipFloating(props)
  const ctx = floating.context
  const { delay: groupDelay } = useDelayGroup(ctx)

  const hover = useHover(ctx, {
    enabled: !floating.disabled,
    move: false,
    delay: {
      open: typeof groupDelay === 'object' ? groupDelay.open : floating.delayIn,
      close:
        typeof groupDelay === 'object' ? groupDelay.close : floating.delayOut,
    },
    handleClose: safePolygon({}),
  })

  const focus = useFocus(ctx, { enabled: !floating.disabled })
  const dismiss = useDismiss(ctx, {
    referencePress: !floating.persistOnClick,
  })
  const role = useRole(ctx, { role: 'tooltip' })
  const interactions = useInteractions([hover, focus, dismiss, role])

  const tooltipContextValue = useMemo(
    () => ({
      ...floating,
      ...interactions,
    }),
    [floating, interactions],
  )

  return (
    <TooltipContext value={tooltipContextValue}>{children}</TooltipContext>
  )
}

interface TooltipTriggerProps extends React.ComponentPropsWithRef<'button'> {
  asChild?: boolean
}

const TooltipTrigger = ({
  ref: refProp,
  children,
  asChild = false,
  ...props
}: TooltipTriggerProps) => {
  const context = useTooltipContext()
  const Comp = asChild ? Slot : 'button'
  const ref = useMergeRefs([context.refs.setReference, refProp])

  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : 'button'}
      {...context.getReferenceProps(props)}
    >
      {children}
    </Comp>
  )
}

const TooltipContent = ({
  ref: refProp,
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<'div'>) => {
  const { context, refs, arrowRef, getFloatingProps } = useTooltipContext()
  const { isMounted, status } = useTransitionStatus(context, { duration: 0 })
  const topLayerRef = useTopLayer<HTMLDivElement>(isMounted, 'hint')
  const ref = useMergeRefs([refs.setFloating, refProp, topLayerRef])

  if (!isMounted) return null

  return (
    <FloatingPortal>
      <div
        ref={ref}
        className={cn(
          'z-50 max-w-80 overflow-visible rounded-lg bg-foreground px-3 py-1.5 text-xs text-background wrap-break-word whitespace-normal drop-shadow-md transition duration-300 ease-out',
          'data-[state=closed]:data-[side=left]:translate-x-2 data-[state=closed]:data-[side=right]:-translate-x-2 data-[state=closed]:data-[side=bottom]:-translate-y-2 data-[state=closed]:data-[side=top]:translate-y-2',
          'data-[state=closed]:scale-95 data-[state=closed]:opacity-0',
          'data-[state=open]:translate-x-0 data-[state=open]:translate-y-0 data-[state=open]:scale-100',
          context.middlewareData.hide?.referenceHidden && 'hidden',
          className,
        )}
        data-state={status === 'open' ? 'open' : 'closed'}
        data-side={context.placement.split('-')[0]}
        style={{
          position: context.strategy,
          top: context.y,
          left: context.x,
          ...props.style,
        }}
        {...getFloatingProps(props)}
      >
        <FloatingArrow
          ref={arrowRef}
          context={context}
          className="fill-foreground"
          tipRadius={1}
          height={ARROW_HEIGHT}
          width={ARROW_WIDTH}
        />
        {children}
      </div>
    </FloatingPortal>
  )
}

interface TooltipGroupProps {
  children: React.ReactNode
  delayIn?: number
  delayOut?: number
  timeoutMs?: number
}

const TooltipGroup = ({
  delayIn = DEFAULT_DELAY_IN,
  delayOut = DEFAULT_DELAY_OUT,
  timeoutMs = DEFAULT_GROUP_TIMEOUT_MS,
  children,
}: TooltipGroupProps) => {
  return (
    <FloatingDelayGroup
      delay={{ open: delayIn, close: delayOut }}
      timeoutMs={timeoutMs}
    >
      {children}
    </FloatingDelayGroup>
  )
}

const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Group: TooltipGroup,
})

export { Tooltip, useTooltipContext }
