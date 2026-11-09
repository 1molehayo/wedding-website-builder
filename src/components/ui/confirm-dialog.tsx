import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  isConfirming?: boolean
  tone?: 'default' | 'destructive'
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isConfirming,
  tone = 'default',
  onConfirm,
  onOpenChange,
  children,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isConfirming) return
      event.preventDefault()
      event.stopPropagation()
      onOpenChange(false)
    }
    document.addEventListener('keydown', onKeyDown, true)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previous
    }
  }, [open, onOpenChange, isConfirming])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        disabled={isConfirming}
        onClick={() => {
          if (!isConfirming) onOpenChange(false)
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="bg-surface border-border relative z-10 w-full max-w-md rounded-2xl border p-5 shadow-lg"
      >
        <h2 id={titleId} className="font-serif text-2xl italic">
          {title}
        </h2>
        <p
          id={descriptionId}
          className="text-foreground-secondary mt-2 text-sm leading-relaxed"
        >
          {description}
        </p>
        {children ? <div className="mt-4 space-y-3">{children}</div> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isConfirming}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tone === 'destructive' ? 'destructive' : 'primary'}
            isLoading={isConfirming}
            className={cn(tone === 'destructive' && 'text-white')}
            onClick={() => {
              if (isConfirming) return
              onConfirm()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
