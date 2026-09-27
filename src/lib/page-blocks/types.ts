export const PAGE_BLOCK_TYPES = ['hero', 'story', 'image', 'details'] as const

export type PageBlockType = (typeof PAGE_BLOCK_TYPES)[number]

export type HeroBlockFields = {
  title: string | null
  tagline: string | null
  /** Optional full-bleed background photo (storage path). */
  imagePath: string | null
}

/** Shown in the nav instead of the block title when the checkbox is off. */
export type BlockNavFields = {
  /** When true, the nav label is the block title. Default for new and stored blocks. */
  useTitleInNav: boolean
  /** Used only when useTitleInNav is false. */
  navLabel: string | null
}

export type StoryBlockFields = BlockNavFields & {
  title: string
  body: string
}

export type ImageBlockFields = BlockNavFields & {
  imagePath: string
  title: string | null
  description: string | null
}

export type DetailsBlockFields = BlockNavFields & {
  /** Section heading. Also the nav label when useTitleInNav is on. */
  title: string
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
          useTitleInNav: true,
          navLabel: null,
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
          useTitleInNav: true,
          navLabel: null,
        },
      }
    case 'details':
      return {
        id,
        type: 'details',
        fields: {
          title: 'Celebrate with us',
          showVenue: true,
          showDressCode: true,
          useTitleInNav: true,
          navLabel: null,
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
  /** Visible label, shortened when it would crowd the bar. */
  label: string
  /** Full label for the tooltip and accessible name. */
  fullLabel: string
}

/** Visible nav labels longer than this end with an ellipsis. */
export const NAV_LABEL_MAX_LENGTH = 20

export function truncateNavLabel(
  label: string,
  max = NAV_LABEL_MAX_LENGTH,
): string {
  const trimmed = label.trim()
  const chars = Array.from(trimmed)
  if (chars.length <= max) return trimmed
  return `${chars.slice(0, max).join('').trimEnd()}…`
}

/** Default CMS placeholder — never show to public guests. */
const PLACEHOLDER_STORY_BODIES = new Set([
  'share how you met.',
  'share how you met',
])

export function isPlaceholderStoryBody(body: string): boolean {
  return PLACEHOLDER_STORY_BODIES.has(body.trim().toLowerCase())
}

/**
 * Stable section ids. The block id is the slug: renaming the title does not
 * change the anchor. Hero stays `hero` (one Home link). Details used to share
 * a single `details` id; each details block now has its own.
 */
export function publicSectionId(block: PageBlock): string {
  switch (block.type) {
    case 'hero':
      return 'hero'
    case 'story':
      return `story-${block.id}`
    case 'image':
      return `photo-${block.id}`
    case 'details':
      return `details-${block.id}`
  }
}

function sectionNavFullLabel(block: PageBlock): string | null {
  if (block.type === 'hero') return 'Home'

  if (!block.fields.useTitleInNav) {
    const custom = block.fields.navLabel?.trim() ?? ''
    return custom || null
  }

  const title = block.fields.title?.trim() ?? ''
  return title || null
}

function toNavItem(id: string, fullLabel: string): PublicSectionNavItem {
  return {
    id,
    fullLabel,
    label: truncateNavLabel(fullLabel),
  }
}

/**
 * One nav entry per block, except hero (first hero only, labelled Home).
 * Blocks with no title and no custom nav label are left out.
 */
export function getPublicSectionNav(
  blocks: PageBlock[],
): PublicSectionNavItem[] {
  const items: PublicSectionNavItem[] = []
  let heroAdded = false

  for (const block of blocks) {
    if (block.type === 'hero') {
      if (heroAdded) continue
      heroAdded = true
      items.push(toNavItem(publicSectionId(block), 'Home'))
      continue
    }

    const fullLabel = sectionNavFullLabel(block)
    if (!fullLabel) continue
    items.push(toNavItem(publicSectionId(block), fullLabel))
  }

  return items
}
