export const PAGE_BLOCK_TYPES = ['hero', 'story', 'image', 'details'] as const

export type PageBlockType = (typeof PAGE_BLOCK_TYPES)[number]

export type HeroBlockFields = {
  title: string | null
  tagline: string | null
  /** Optional full-bleed background photo (storage path). */
  imagePath: string | null
}

export type StoryBlockFields = {
  title: string
  body: string
}

export type ImageBlockFields = {
  imagePath: string
  title: string | null
  description: string | null
}

export type DetailsBlockFields = {
  showVenue: boolean
  showDressCode: boolean
}

export type HeroPageBlock = {
  id: string
  type: 'hero'
  fields: HeroBlockFields
}

export type StoryPageBlock = {
  id: string
  type: 'story'
  fields: StoryBlockFields
}

export type ImagePageBlock = {
  id: string
  type: 'image'
  fields: ImageBlockFields
}

export type DetailsPageBlock = {
  id: string
  type: 'details'
  fields: DetailsBlockFields
}

export type PageBlock =
  HeroPageBlock | StoryPageBlock | ImagePageBlock | DetailsPageBlock

export const PAGE_BLOCK_TYPE_LABELS: Record<PageBlockType, string> = {
  hero: 'Hero',
  story: 'Story',
  image: 'Image',
  details: 'Details',
}

export function createDefaultBlock(type: PageBlockType): PageBlock {
  const id = crypto.randomUUID()

  switch (type) {
    case 'hero':
      return {
        id,
        type: 'hero',
        fields: {
          title: null,
          tagline: "We're getting married",
          imagePath: null,
        },
      }
    case 'story':
      return {
        id,
        type: 'story',
        fields: {
          title: 'Our story',
          body: 'Share how you met.',
        },
      }
    case 'image':
      return {
        id,
        type: 'image',
        fields: {
          imagePath: '',
          title: null,
          description: null,
        },
      }
    case 'details':
      return {
        id,
        type: 'details',
        fields: {
          showVenue: true,
          showDressCode: true,
        },
      }
  }
}

export const PAGE_CONTENT_VERSION_LIMIT = 10

export type PageContentEditorData = {
  draft: PageBlock[]
  published: PageBlock[]
  draftUpdatedAt: string | null
  publishedAt: string | null
}

export type PageContentVersion = {
  id: string
  published_at: string
  page_blocks: PageBlock[]
}

export function pageBlocksEqual(a: PageBlock[], b: PageBlock[]) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function isPageContentLive(data: PageContentEditorData) {
  return (
    Boolean(data.publishedAt) && pageBlocksEqual(data.draft, data.published)
  )
}

export function createDefaultPageBlocks(): PageBlock[] {
  return [
    createDefaultBlock('hero'),
    createDefaultBlock('story'),
    createDefaultBlock('details'),
  ]
}

export type PublicSectionNavItem = {
  id: string
  label: string
}

/** Default CMS placeholder — never show to public guests. */
const PLACEHOLDER_STORY_BODIES = new Set([
  'share how you met.',
  'share how you met',
])

export function isPlaceholderStoryBody(body: string): boolean {
  return PLACEHOLDER_STORY_BODIES.has(body.trim().toLowerCase())
}

/** Stable section ids for public anchors / in-page nav. */
export function publicSectionId(block: PageBlock): string {
  switch (block.type) {
    case 'hero':
      return 'hero'
    case 'story':
      return `story-${block.id}`
    case 'image':
      return `photo-${block.id}`
    case 'details':
      return 'details'
  }
}

/** One nav entry per section type (first occurrence). */
export function getPublicSectionNav(
  blocks: PageBlock[],
): PublicSectionNavItem[] {
  const items: PublicSectionNavItem[] = []
  const seen = new Set<PageBlockType>()

  for (const block of blocks) {
    if (seen.has(block.type)) continue
    seen.add(block.type)
    switch (block.type) {
      case 'hero':
        items.push({ id: publicSectionId(block), label: 'Home' })
        break
      case 'story':
        items.push({ id: publicSectionId(block), label: 'Story' })
        break
      case 'image':
        items.push({ id: publicSectionId(block), label: 'Photos' })
        break
      case 'details':
        items.push({ id: publicSectionId(block), label: 'Details' })
        break
    }
  }

  return items
}
