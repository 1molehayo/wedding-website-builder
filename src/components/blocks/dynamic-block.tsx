import type {
  HeroMediaUrls,
  PageBlock,
  ResponsiveMediaUrls,
} from '@/lib/page-blocks/types'
import type { PublicWeddingSettings } from '@/lib/wedding/public-settings'
import { DetailsBlock } from './details-block'
import { HeroBlock } from './hero-block'
import { ImageBlock } from './image-block'
import { StoryBlock } from './story-block'
import { TextBlock } from './text-block'
import { VideoBlock } from './video-block'

export function DynamicBlock({
  block,
  wedding,
  imageMediaUrls,
  videoMediaUrls,
  heroMediaUrls,
}: {
  block: PageBlock
  wedding: PublicWeddingSettings
  imageMediaUrls?: ResponsiveMediaUrls
  videoMediaUrls?: ResponsiveMediaUrls
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
      return <ImageBlock block={block} mediaUrls={imageMediaUrls} />
    case 'video':
      return <VideoBlock block={block} mediaUrls={videoMediaUrls} />
    case 'details':
      return <DetailsBlock block={block} wedding={wedding} />
    default:
      return null
  }
}
