import type { PageBlock, HeroMediaUrls  } from '@/lib/page-blocks/types'
import type { PublicWeddingSettings } from '@/lib/wedding/public-settings'
import { DetailsBlock } from './details-block'
import { HeroBlock } from './hero-block'
import { ImageBlock } from './image-block'
import { StoryBlock } from './story-block'
import { TextBlock } from './text-block'

export function DynamicBlock({
  block,
  wedding,
  imageUrl,
  heroMediaUrls,
}: {
  block: PageBlock
  wedding: PublicWeddingSettings
  imageUrl?: string | null
  heroMediaUrls?: HeroMediaUrls
}) {
  switch (block.type) {
    case 'hero':
      return (
        <HeroBlock
          block={block}
          wedding={wedding}
          mediaUrls={heroMediaUrls}
        />
      )
    case 'story':
      return <StoryBlock block={block} />
    case 'text':
      return <TextBlock block={block} />
    case 'image':
      return <ImageBlock block={block} imageUrl={imageUrl} />
    case 'details':
      return <DetailsBlock block={block} wedding={wedding} />
    default:
      return null
  }
}
