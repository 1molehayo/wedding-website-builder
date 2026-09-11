import type { StoryPageBlock } from '@/lib/page-blocks/types'
import {
  isPlaceholderStoryBody,
  publicSectionId,
} from '@/lib/page-blocks/types'

export function StoryBlock({ block }: { block: StoryPageBlock }) {
  const title = block.fields.title.trim()
  const body = block.fields.body.trim()
  const showBody = Boolean(body) && !isPlaceholderStoryBody(body)

  if (!title && !showBody) {
    return null
  }

  return (
    <section
      id={publicSectionId(block)}
      className="public-section mx-auto max-w-3xl scroll-mt-28 px-6 sm:scroll-mt-24"
    >
      <div className="public-reveal">
        {title ? (
          <>
            <p className="public-kicker mb-4">Our story</p>
            <h2 className="public-section-title">{title}</h2>
          </>
        ) : (
          <p className="public-kicker mb-4">Our story</p>
        )}
        {showBody ? (
          <p className="text-foreground-secondary mt-6 whitespace-pre-wrap text-base leading-relaxed md:text-lg">
            {body}
          </p>
        ) : null}
      </div>
    </section>
  )
}
