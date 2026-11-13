import { useEffect, useState } from 'react'
import type {
  ResponsiveMediaUrls,
  VideoPageBlock,
} from '@/lib/page-blocks/types'
import { publicSectionId } from '@/lib/page-blocks/types'
import { cn } from '@/lib/utils'

export function VideoBlock({
  block,
  mediaUrls,
}: {
  block: VideoPageBlock
  mediaUrls?: ResponsiveMediaUrls
}) {
  const [isMobile, setIsMobile] = useState(false)
  const [failed, setFailed] = useState(false)
  const selectedVideo =
    (isMobile ? mediaUrls?.mobile : null) ?? mediaUrls?.desktop ?? null

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mobile.matches)
    sync()
    mobile.addEventListener('change', sync)
    return () => mobile.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    setFailed(false)
  }, [selectedVideo])

  return (
    <section
      id={publicSectionId(block)}
      className="public-section mx-auto max-w-5xl scroll-mt-28 px-6 sm:scroll-mt-24"
    >
      <figure className="public-reveal">
        {block.fields.title || block.fields.description ? (
          <figcaption className="mb-5 max-w-2xl lg:mb-10">
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
            (!selectedVideo || failed) &&
              'flex items-center justify-center',
          )}
        >
          {selectedVideo && !failed ? (
            <video
              key={selectedVideo}
              src={selectedVideo}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onError={() => setFailed(true)}
            >
              Your browser does not support video playback.
            </video>
          ) : (
            <p className="text-foreground-secondary px-6 text-center text-sm tracking-[0.14em] uppercase">
              Video coming soon
            </p>
          )}
        </div>
      </figure>
    </section>
  )
}
