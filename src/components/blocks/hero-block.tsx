import { useState } from 'react'
import type { HeroPageBlock } from '@/lib/page-blocks/types'
import { publicSectionId } from '@/lib/page-blocks/types'
import { formatWeddingDate } from '@/lib/wedding/public-settings'
import type { PublicWeddingSettings } from '@/lib/wedding/public-settings'

export function HeroBlock({
  block,
  wedding,
  imageUrl,
}: {
  block: HeroPageBlock
  wedding: PublicWeddingSettings
  imageUrl?: string | null
}) {
  const title = block.fields.title?.trim()
  const tagline = block.fields.tagline?.trim()
  const [photoFailed, setPhotoFailed] = useState(false)
  const showPhoto = Boolean(imageUrl) && !photoFailed

  return (
    <section
      id={publicSectionId(block)}
      className="public-hero relative isolate -mt-(--public-header-height,5.5rem) flex min-h-dvh scroll-mt-28 items-center justify-center overflow-hidden px-6 pt-[calc(var(--public-header-height,5.5rem)+2.5rem)] pb-20 text-foreground sm:scroll-mt-24 md:pt-[calc(var(--public-header-height,5.5rem)+3rem)] md:pb-24"
    >
      {showPhoto && imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            fetchPriority="high"
            decoding="async"
            sizes="100vw"
            className="absolute inset-0 z-0 h-full w-full object-cover"
            onError={() => setPhotoFailed(true)}
          />
          <div
            className="public-hero-photo-overlay absolute inset-0 z-1"
            aria-hidden
          />
        </>
      ) : (
        <div
          className="public-hero-atmosphere absolute inset-0 z-0"
          aria-hidden
        />
      )}
      <div className="public-reveal relative z-10 mx-auto max-w-3xl text-center">
        {tagline ? <p className="public-kicker mb-8">{tagline}</p> : null}
        {title ? (
          <h1 className="public-display text-[clamp(3.25rem,11vw,7.5rem)]">
            {title}
          </h1>
        ) : (
          <h1 className="public-display text-[clamp(3.25rem,11vw,7.5rem)]">
            {wedding.groom_name}
            <br />
            <span className="text-highlight">&amp;</span>
            <br />
            {wedding.bride_name}
          </h1>
        )}
        <div className="public-reveal public-reveal-delay-1 bg-highlight mx-auto my-10 h-px w-20" />
        <p className="public-reveal public-reveal-delay-2 font-serif text-2xl md:text-3xl">
          {formatWeddingDate(wedding.wedding_date)}
        </p>
      </div>
    </section>
  )
}
