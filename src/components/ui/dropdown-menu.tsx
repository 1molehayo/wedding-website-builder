import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react'
import { DotsThreeIcon } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import { IconButton } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type DropdownMenuItem = {
  id: string
  label: string
  onSelect: () => void
  tone?: 'default' | 'destructive'
  icon?: React.ReactNode
  disabled?: boolean
}

export function DropdownMenu({
  label = 'Actions',
  items,
  align = 'end',
  side = 'bottom',
  trigger,
  className,
}: {
  label?: string
  items: DropdownMenuItem[]
  align?: 'start' | 'end'
  side?: 'top' | 'bottom'
  trigger?: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const placement =
    side === 'top'
      ? align === 'end'
        ? 'top-end'
        : 'top-start'
      : align === 'end'
        ? 'bottom-end'
        : 'bottom-start'

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    strategy: 'fixed',
    middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })
  const click = useClick(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'menu' })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ])

  return (
    <div className={cn('inline-flex', className)} data-row-stop>
      {trigger ? (
        <div
          ref={refs.setReference}
          className="w-full"
          {...getReferenceProps()}
        >
          {trigger}
        </div>
      ) : (
        <IconButton
          ref={refs.setReference}
          type="button"
          size="sm"
          variant="outline"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          {...getReferenceProps()}
        >
          <DotsThreeIcon weight="bold" />
        </IconButton>
      )}
      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={0}>
            <div
              ref={refs.setFloating}
              id={menuId}
              style={floatingStyles}
              className="border-border bg-background z-50 min-w-44 rounded-xl border py-1 shadow-md outline-none"
              {...getFloatingProps()}
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={cn(
                    'hover:bg-foreground/5 flex w-full items-center gap-2 px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40',
                    item.tone === 'destructive' && 'text-error',
                  )}
                  onClick={() => {
                    if (item.disabled) return
                    setOpen(false)
                    item.onSelect()
                  }}
                >
                  {item.icon ? (
                    <span className="inline-flex size-4 shrink-0 items-center justify-center [&>svg]:size-4">
                      {item.icon}
                    </span>
                  ) : null}
                  {item.label}
                </button>
              ))}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </div>
  )
}
