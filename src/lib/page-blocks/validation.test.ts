import { describe, expect, it } from 'vitest'
import {
  createDefaultBlock,
  createDefaultPageBlocks,
  getPublicSectionNav,
  isPageContentLive,
  isPlaceholderStoryBody,
} from '@/lib/page-blocks/types'
import {
  parsePageBlocks,
  parsePageBlocksStrict,
  validatePageBlocksClient,
} from '@/lib/page-blocks/validation'

describe('page blocks validation', () => {
  it('detects default story placeholder copy', () => {
    expect(isPlaceholderStoryBody('Share how you met.')).toBe(true)
    expect(isPlaceholderStoryBody('  share how you met  ')).toBe(true)
    expect(isPlaceholderStoryBody('We met in Lagos.')).toBe(false)
  })

  it('accepts the default seed blocks (loose + strict)', () => {
    const blocks = createDefaultPageBlocks()
    expect(parsePageBlocks(blocks)).toHaveLength(3)
    expect(parsePageBlocksStrict(blocks)).toHaveLength(3)
  })

  it('keeps an empty stored page empty (no starter sections invented)', () => {
    expect(parsePageBlocks([])).toEqual([])
    expect(parsePageBlocksStrict([])).toEqual([])
    expect(validatePageBlocksClient([]).ok).toBe(true)
  })

  it('rejects unknown block types', () => {
    expect(() =>
      parsePageBlocks([
        {
          id: '1',
          type: 'gallery',
          fields: {},
        },
      ]),
    ).toThrow(/Unsupported block type/)
  })

  it('allows empty story body when loading (loose)', () => {
    const blocks = parsePageBlocks([
      {
        id: 'story-1',
        type: 'story',
        fields: { title: 'Our story', body: '' },
      },
    ])
    expect(blocks[0]).toMatchObject({
      type: 'story',
      fields: { title: 'Our story', body: '' },
    })
  })

  it('rejects empty story body on save (strict)', () => {
    const result = validatePageBlocksClient([
      {
        id: 'story-1',
        type: 'story',
        fields: { title: 'Our story', body: '' },
      },
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.fieldErrors['story-1'].body).toMatch(/required/i)
  })

  it('rejects image blocks without a path on save', () => {
    const result = validatePageBlocksClient([
      {
        id: 'image-1',
        type: 'image',
        fields: { imagePath: '', title: null, description: null },
      },
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.fieldErrors['image-1'].imagePath).toBeTruthy()
  })

  it('loads older hero blocks without imagePath', () => {
    const blocks = parsePageBlocks([
      {
        id: 'hero-1',
        type: 'hero',
        fields: { title: null, tagline: "We're getting married" },
      },
    ])
    expect(blocks[0]).toMatchObject({
      type: 'hero',
      fields: { imagePath: null },
    })
  })

  it('loads older blocks and uses each title in the nav', () => {
    const blocks = parsePageBlocks([
      {
        id: 'story-1',
        type: 'story',
        fields: { title: 'Our story', body: 'We met in Lagos.' },
      },
      {
        id: 'image-1',
        type: 'image',
        fields: {
          imagePath: 'palette.jpg',
          title: 'Colour Palette',
          description: null,
        },
      },
      {
        id: 'details-1',
        type: 'details',
        fields: { showVenue: true, showDressCode: true },
      },
    ])

    expect(getPublicSectionNav(blocks).map((item) => item.fullLabel)).toEqual([
      'Our story',
      'Colour Palette',
      'Celebrate with us',
    ])
    expect(getPublicSectionNav(blocks).map((item) => item.id)).toEqual([
      'story-story-1',
      'photo-image-1',
      'details-details-1',
    ])
  })

  it('keeps a second block of the same type and shortens long nav labels', () => {
    const blocks = parsePageBlocks([
      createDefaultBlock('hero'),
      {
        id: 'image-1',
        type: 'image',
        fields: {
          imagePath: 'a.jpg',
          title: 'Colour Palette for the whole weekend party',
          description: null,
        },
      },
      {
        id: 'image-2',
        type: 'image',
        fields: {
          imagePath: 'b.jpg',
          title: 'Travel',
          description: null,
          useTitleInNav: false,
          navLabel: 'Getting there together',
        },
      },
      createDefaultBlock('hero'),
    ])
    const nav = getPublicSectionNav(blocks)

    expect(nav.map((item) => item.fullLabel)).toEqual([
      'Home',
      'Colour Palette for the whole weekend party',
      'Getting there together',
    ])
    expect(nav[1]?.label).toBe('Colour Palette for t…')
    expect(nav[1]?.id).toBe('photo-image-1')
    expect(nav[2]?.label).toBe('Getting there togeth…')
    expect(nav.filter((item) => item.label === 'Home')).toHaveLength(1)
  })

  it('leaves an image with no title out of the nav', () => {
    expect(getPublicSectionNav([createDefaultBlock('image')])).toEqual([])
  })

  it('treats matching draft and live as published only when published_at is set', () => {
    const blocks = createDefaultPageBlocks()
    expect(
      isPageContentLive({
        draft: blocks,
        published: blocks,
        draftUpdatedAt: '2026-09-11T00:00:00.000Z',
        publishedAt: '2026-09-11T00:00:00.000Z',
      }),
    ).toBe(true)
    expect(
      isPageContentLive({
        draft: blocks,
        published: blocks,
        draftUpdatedAt: '2026-09-11T00:00:00.000Z',
        publishedAt: null,
      }),
    ).toBe(false)
    expect(
      isPageContentLive({
        draft: [],
        published: blocks,
        draftUpdatedAt: '2026-09-11T00:00:00.000Z',
        publishedAt: '2026-09-11T00:00:00.000Z',
      }),
    ).toBe(false)
  })
})
