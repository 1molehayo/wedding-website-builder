import { z } from 'zod'
import { PAGE_BLOCK_TYPES } from '@/lib/page-blocks/types'
import type { PageBlock } from '@/lib/page-blocks/types'

const nullableTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value): string | null => {
    if (value === null || value === undefined) return null
    const trimmed = value.trim()
    return trimmed.length === 0 ? null : trimmed
  })

const trimmedString = z.string({ error: 'Expected a string.' }).trim()

const requiredTrimmedString = (label: string) =>
  trimmedString.min(1, `${label} is required.`)

function blockIdSchema() {
  return z.string().trim().min(1, 'Block id is required.')
}

function makePageBlocksSchema(mode: 'loose' | 'strict') {
  const storyFieldsSchema = z.object({
    title:
      mode === 'strict'
        ? requiredTrimmedString('Story title')
        : trimmedString,
    body:
      mode === 'strict' ? requiredTrimmedString('Story body') : trimmedString,
  })

  const imageFieldsSchema = z.object({
    imagePath:
      mode === 'strict' ? requiredTrimmedString('Image') : trimmedString,
    title: nullableTrimmedString,
    description: nullableTrimmedString,
  })

  const pageBlockSchema = z.discriminatedUnion('type', [
    z.object({
      id: blockIdSchema(),
      type: z.literal('hero'),
      fields: z.object({
        title: nullableTrimmedString,
        tagline: nullableTrimmedString,
        // Optional for older stored hero blocks that predate background photos.
        imagePath: nullableTrimmedString.default(null),
      }),
    }),
    z.object({
      id: blockIdSchema(),
      type: z.literal('story'),
      fields: storyFieldsSchema,
    }),
    z.object({
      id: blockIdSchema(),
      type: z.literal('image'),
      fields: imageFieldsSchema,
    }),
    z.object({
      id: blockIdSchema(),
      type: z.literal('details'),
      fields: z.object({
        showVenue: z.boolean({ error: 'showVenue must be a boolean.' }),
        showDressCode: z.boolean({ error: 'showDressCode must be a boolean.' }),
      }),
    }),
  ])

  return z
    .array(pageBlockSchema, {
      error: 'page_blocks must be an array.',
    })
    .superRefine((blocks, ctx) => {
      const ids = new Set<string>()
      for (const [index, block] of blocks.entries()) {
        if (ids.has(block.id)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'id'],
            message: 'Duplicate page block ids are not allowed.',
          })
        }
        ids.add(block.id)
      }
    })
}

const pageBlocksLooseSchema = makePageBlocksSchema('loose')
export const pageBlocksSchema = makePageBlocksSchema('strict')

export type PageBlockFieldErrors = Record<string, Record<string, string>>

export function mapPageBlockFieldErrors(
  error: z.ZodError,
  blocks: Array<{ id: string }>,
): PageBlockFieldErrors {
  const out: PageBlockFieldErrors = {}
  for (const issue of error.issues) {
    const [index, fieldsKey, fieldName] = issue.path
    if (
      typeof index !== 'number' ||
      fieldsKey !== 'fields' ||
      typeof fieldName !== 'string'
    ) {
      continue
    }
    const id = blocks[index]?.id
    if (!id) continue
    out[id] ??= {}
    out[id][fieldName] ??= issue.message
  }
  return out
}

export function firstPageBlocksErrorMessage(error: z.ZodError): string {
  const duplicate = error.issues.find((issue) =>
    issue.message.includes('Duplicate page block'),
  )
  if (duplicate) return duplicate.message

  return error.issues[0]?.message ?? 'Invalid page blocks.'
}

function throwParseError(value: unknown, error: z.ZodError): never {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (
        typeof item === 'object' &&
        item !== null &&
        'type' in item &&
        typeof (item as { type: unknown }).type === 'string' &&
        !PAGE_BLOCK_TYPES.includes(
          (item as { type: (typeof PAGE_BLOCK_TYPES)[number] }).type,
        )
      ) {
        throw new Error(
          `Unsupported block type: ${(item as { type: string }).type}`,
        )
      }
    }
  }
  throw new Error(firstPageBlocksErrorMessage(error))
}

/** Lenient parse for loading stored JSON (empty story/image content allowed). */
export function parsePageBlocks(value: unknown): PageBlock[] {
  const parsed = pageBlocksLooseSchema.safeParse(value)
  if (!parsed.success) {
    throwParseError(value, parsed.error)
  }
  return parsed.data
}

/** Strict parse for publish / server-fn validation. */
export function parsePageBlocksStrict(value: unknown): PageBlock[] {
  const parsed = pageBlocksSchema.safeParse(value)
  if (!parsed.success) {
    throwParseError(value, parsed.error)
  }
  return parsed.data
}

export function parseUpdatePageBlocksInput(data: unknown): {
  page_blocks: PageBlock[]
} {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid page blocks payload.')
  }
  return {
    page_blocks: parsePageBlocksStrict(
      (data as { page_blocks?: unknown }).page_blocks,
    ),
  }
}

/** Draft save may be empty or incomplete (story/image still in progress). */
export function parseSavePageDraftInput(data: unknown): {
  page_blocks: PageBlock[]
} {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid page blocks payload.')
  }
  return {
    page_blocks: parsePageBlocks(
      (data as { page_blocks?: unknown }).page_blocks,
    ),
  }
}

export function validatePageBlocksClient(blocks: PageBlock[]):
  | { ok: true; blocks: PageBlock[] }
  | {
      ok: false
      fieldErrors: PageBlockFieldErrors
      message: string
    } {
  const parsed = pageBlocksSchema.safeParse(blocks)
  if (parsed.success) {
    return { ok: true, blocks: parsed.data }
  }
  return {
    ok: false,
    fieldErrors: mapPageBlockFieldErrors(parsed.error, blocks),
    message: firstPageBlocksErrorMessage(parsed.error),
  }
}
