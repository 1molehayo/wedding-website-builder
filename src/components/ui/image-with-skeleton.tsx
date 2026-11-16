import { useEffect, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type ImageWithSkeletonProps = Omit<
  React.ComponentPropsWithoutRef<'img'>,
  'className'
> & {
  /** Wrapper that reserves layout (aspect / size). */
  className?: string
  imgClassName?: string
  skeletonClassName?: string
}

/**
 * Aspect/size box with a pulse overlay until the image finishes loading.
 * Pass aspect/size classes on `className`; the image fills the box by default.
 */
export function ImageWithSkeleton({
  src,
  alt,
  className,
  imgClassName,
  skeletonClassName,
  onLoad,
  onError,
  ...imgProps
}: ImageWithSkeletonProps) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true)
    }
  }, [src])

  if (!src) return null

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!loaded ? (
        <Skeleton
          className={cn('absolute inset-0', skeletonClassName)}
          aria-hidden
        />
      ) : null}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn(
          'absolute inset-0 size-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
        onLoad={(event) => {
          setLoaded(true)
          onLoad?.(event)
        }}
        onError={(event) => {
          setLoaded(true)
          onError?.(event)
        }}
        {...imgProps}
      />
    </div>
  )
}
