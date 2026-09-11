import type { DetailsPageBlock } from '@/lib/page-blocks/types'
import { publicSectionId } from '@/lib/page-blocks/types'
import type { PublicWeddingSettings } from '@/lib/wedding/public-settings'
import { cn } from '@/lib/utils'

function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function DetailsBlock({
  block,
  wedding,
}: {
  block: DetailsPageBlock
  wedding: PublicWeddingSettings
}) {
  const venueName = block.fields.showVenue ? wedding.venue_name : null
  const venueLocation = block.fields.showVenue ? wedding.venue_location : null
  const dressCode =
    block.fields.showDressCode && wedding.dress_code ? wedding.dress_code : null
  const sectionId = publicSectionId(block)
  const mapsQuery = [venueName, venueLocation].filter(Boolean).join(', ')
  const hasVenue = Boolean(venueName || venueLocation)
  const hasDressCode = Boolean(dressCode)
  const twoColumns = hasVenue && hasDressCode

  if (!hasVenue && !hasDressCode) {
    return (
      <section
        id={sectionId}
        className="public-section border-border scroll-mt-28 border-t px-6 sm:scroll-mt-24"
      >
        <div className="public-reveal mx-auto max-w-3xl text-center">
          <p className="public-kicker mb-4">Details</p>
          <h2 className="public-section-title">Celebrate with us</h2>
          <p className="text-foreground-secondary mt-5 text-base leading-relaxed">
            Venue and dress code will be shared here when they&apos;re ready.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      id={sectionId}
      className="public-section border-border scroll-mt-28 border-t px-6 sm:scroll-mt-24"
    >
      <div className="public-reveal mx-auto max-w-4xl">
        <div className="mb-10 text-center md:mb-14">
          <p className="public-kicker mb-4">Details</p>
          <h2 className="public-section-title">Celebrate with us</h2>
        </div>
        <div className="flex justify-center">
          <div
            className={cn(
              twoColumns
                ? 'flex w-max max-w-full flex-col gap-10 text-left md:flex-row md:items-start md:gap-x-16'
                : 'w-max max-w-xl text-center',
            )}
          >
            {hasVenue ? (
              <div className="max-w-80 shrink-0">
                <p className="public-kicker mb-3">Venue</p>
                {venueName ? (
                  <p className="font-serif text-3xl italic md:text-4xl">
                    {venueName}
                  </p>
                ) : null}
                {venueLocation ? (
                  <p className="text-foreground-secondary mt-3 text-sm leading-relaxed md:text-base">
                    {venueLocation}
                  </p>
                ) : null}
                {mapsQuery ? (
                  <p className="mt-4">
                    <a
                      href={mapsSearchUrl(mapsQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground text-xs tracking-[0.14em] uppercase underline-offset-4 transition hover:underline"
                    >
                      Open in Maps
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}
            {hasDressCode ? (
              <div className="max-w-80 shrink-0">
                <p className="public-kicker mb-3">Dress code</p>
                <p className="text-foreground-secondary whitespace-pre-wrap text-base leading-relaxed md:text-lg">
                  {dressCode}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
