import { useId, useRef, useState } from 'react'
import { DotsThreeIcon } from '@phosphor-icons/react'
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
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  return (
    <div
      ref={rootRef}
      className={cn('relative inline-flex', open && 'z-50', className)}
      data-row-stop
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null
        if (next && rootRef.current?.contains(next)) return
        setOpen(false)
      }}
    >
      {trigger ? (
        <div
          className="w-full"
          onClick={() => setOpen((value) => !value)}
        >
          {trigger}
        </div>
      ) : (
        <IconButton
          type="button"
          size="sm"
          variant="outline"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <DotsThreeIcon weight="bold" />
        </IconButton>
      )}
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'border-border bg-background absolute z-50 min-w-44 rounded-xl border py-1 shadow-md',
            align === 'end' ? 'right-0' : 'left-0',
            side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
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
      ) : null}
    </div>
  )
}
