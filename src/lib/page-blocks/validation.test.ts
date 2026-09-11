import { describe, expect, it } from 'vitest'
import {
  createDefaultPageBlocks,
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
})
