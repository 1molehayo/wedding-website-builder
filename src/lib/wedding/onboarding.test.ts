import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createDefaultPageBlocks } from '@/lib/page-blocks/types'
import { parseOnboardingInput } from '@/lib/wedding/onboarding-validation'

describe('onboarding defaults', () => {
  it('generates default page blocks for a first wedding', () => {
    const blocks = createDefaultPageBlocks()
    expect(blocks.map((b) => b.type)).toEqual(['hero', 'story', 'details'])
  })

  it('requires groom and bride names', () => {
    expect(() =>
      parseOnboardingInput({
        groom_name: '',
        bride_name: 'Ada',
        wedding_date: null,
        venue_name: null,
        venue_location: null,
        dress_code: null,
        active_public_theme: 'celeste',
      }),
    ).toThrow()
  })

  it('accepts optional date and venue', () => {
    const parsed = parseOnboardingInput({
      groom_name: 'Theo',
      bride_name: 'Ada',
      wedding_date: null,
      venue_name: null,
      venue_location: null,
      dress_code: null,
      active_public_theme: 'celeste',
    })
    expect(parsed.groom_name).toBe('Theo')
    expect(parsed.bride_name).toBe('Ada')
    expect(parsed.wedding_date).toBeNull()
  })
})

describe('opt-in seed.sql safety', () => {
  it('refuses to insert a second wedding when one already exists', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'supabase/seed.sql'),
      'utf8',
    )
    expect(sql).toMatch(
      /where not exists\s*\(\s*select 1 from public\.weddings\s*\)/i,
    )
  })
})
