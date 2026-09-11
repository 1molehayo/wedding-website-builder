import { describe, expect, it } from 'vitest'
import type { Wedding } from '@/lib/supabase/types'

describe('wedding date contract', () => {
  it('allows a wedding record with a null date', () => {
    const wedding: Wedding = {
      id: '00000000-0000-0000-0000-000000000001',
      groom_name: 'Marvelous',
      bride_name: 'Lillian',
      wedding_date: null,
      date_published_at: null,
      status: 'planning',
      venue_name: null,
      venue_location: 'Chicago',
      dress_code: 'Formal attire',
      active_public_theme: 'celeste',
      public_slug: 'lillian-marvelous-2026',
      page_blocks: [],
      page_blocks_draft: [],
      page_draft_updated_at: null,
      page_published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    expect(wedding.wedding_date).toBeNull()
    expect(wedding.status).toBe('planning')
  })
})
