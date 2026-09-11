import type { PageBlock } from '@/lib/page-blocks/types'
import type { PublicWeddingSettings } from '@/lib/wedding/public-settings'
import { DetailsBlock } from './details-block'
import { HeroBlock } from './hero-block'
import { ImageBlock } from './image-block'
import { StoryBlock } from './story-block'

export function DynamicBlock({
  block,
  wedding,
  imageUrl,
}: {
  block: PageBlock
  wedding: PublicWeddingSettings
  imageUrl?: string | null
}) {
  switch (block.type) {
    case 'hero':
      return (
        <HeroBlock block={block} wedding={wedding} imageUrl={imageUrl} />
      )
    case 'story':
      return <StoryBlock block={block} />
    case 'image':
      return <ImageBlock block={block} imageUrl={imageUrl} />
    case 'details':
      return <DetailsBlock block={block} wedding={wedding} />
    default:
      return null
  }
}
