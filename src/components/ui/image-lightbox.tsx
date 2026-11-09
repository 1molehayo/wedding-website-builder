import { useEffect } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ImageLightboxProps = {
  open: boolean
  src: string | null
  alt?: string
  onClose: () => void
  className?: string
}

/**
 * Full-viewport image preview. Keeps aspect ratio (`object-contain`).
 * Used on public image blocks and private photo shares.
 */
export function ImageLightbox({
  open,
  src,
  alt = '',
  onClose,
  className,
}: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open || !src) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6',
        className,
      )}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-zoom-out bg-black/80"
        aria-label="Close photo preview"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(100dvh,100%)] max-w-full flex-col items-center">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="absolute top-0 right-0 z-20 border-white/30 bg-black/40 text-white hover:bg-black/60"
          aria-label="Close"
          onClick={onClose}
        >
          <XIcon />
        </Button>
        <img
          src={src}
          alt={alt}
          className="max-h-[min(90dvh,100%)] max-w-full object-contain"
        />
      </div>
    </div>
  )
}
