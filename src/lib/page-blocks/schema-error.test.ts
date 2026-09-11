import { describe, expect, it } from 'vitest'
import {
  isMissingPageContentSchema,
  pageContentSchemaUserMessage,
} from '@/lib/page-blocks/schema-error'

describe('page content schema errors', () => {
  it('matches PostgREST missing-column errors, not unrelated schema-cache noise', () => {
    expect(
      isMissingPageContentSchema(
        "Could not find the 'page_blocks_draft' column of 'weddings' in the schema cache",
      ),
    ).toBe(true)
    expect(
      isMissingPageContentSchema(
        "Could not find the table 'public.page_content_versions' in the schema cache",
      ),
    ).toBe(true)
    expect(
      isMissingPageContentSchema(
        "Could not find the 'email' column of 'guests' in the schema cache",
      ),
    ).toBe(false)
  })

  it('explains local vs cloud when draft columns are missing', () => {
    expect(
      pageContentSchemaUserMessage({
        original: "Could not find the 'page_blocks_draft' column",
        isLocal: true,
        apiHost: '127.0.0.1',
      }),
    ).toMatch(/local Supabase \(127\.0\.0\.1\)/)
    expect(
      pageContentSchemaUserMessage({
        original: "Could not find the 'page_blocks_draft' column",
        isLocal: false,
        apiHost: 'whaytaxejkhopdolpvgc.supabase.co',
      }),
    ).toMatch(/reload the API schema/)
  })
})
