import { useEffect, useId } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ModalProps = {
  open: boolean
  title: string
  description?: string
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  /** Wider dialog for forms with more content. */
  size?: 'md' | 'lg'
}

export function Modal({
  open,
  title,
  description,
  onOpenChange,
  children,
  footer,
  className,
  size = 'md',
}: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'bg-surface border-border relative z-10 w-full rounded-2xl border p-5 shadow-lg',
          size === 'md' ? 'max-w-md' : 'max-w-lg',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-serif text-2xl italic">
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="text-foreground-secondary mt-2 text-sm leading-relaxed"
              >
                {description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            square
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <XIcon />
          </Button>
        </div>
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  )
}
