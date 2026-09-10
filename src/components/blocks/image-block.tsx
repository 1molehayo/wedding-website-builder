import { useState } from 'react'
import type { ImagePageBlock } from '#/lib/page-blocks/types'
import { publicSectionId } from '#/lib/page-blocks/types'
import { cn } from '#/lib/utils'

export function ImageBlock({
  block,
  imageUrl,
}: {
  block: ImagePageBlock
  imageUrl?: string | null
}) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(imageUrl) && !failed

  return (
    <section
      id={publicSectionId(block)}
      className="public-section mx-auto max-w-5xl scroll-mt-28 px-6 sm:scroll-mt-24"
    >
      <figure className="public-reveal">
        {block.fields.title || block.fields.description ? (
          <figcaption className="mb-5 max-w-2xl">
            {block.fields.title ? (
              <p className="font-serif text-2xl italic md:text-3xl">
                {block.fields.title}
              </p>
            ) : null}
            {block.fields.description ? (
              <p className="text-foreground-secondary mt-2 text-sm leading-relaxed md:text-base">
                {block.fields.description}
              </p>
            ) : null}
          </figcaption>
        ) : null}

        <div
          className={cn(
            'relative aspect-4/5 w-full overflow-hidden rounded-sm md:aspect-16/10',
            !showImage && 'flex items-center justify-center',
          )}
        >
          {showImage && imageUrl ? (
            <img
              src={imageUrl}
              alt={block.fields.title ?? 'Wedding photo'}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1024px) 64rem, 100vw"
              className="public-image h-full w-full object-contain"
              onError={() => setFailed(true)}
            />
          ) : (
            <p className="text-foreground-secondary px-6 text-center text-sm tracking-[0.14em] uppercase">
              Photo coming soon
            </p>
          )}
        </div>
      </figure>
    </section>
  )
}
