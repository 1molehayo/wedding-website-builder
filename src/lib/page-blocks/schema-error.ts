const PAGE_CONTENT_SCHEMA_MARKERS = [
  'page_blocks_draft',
  'page_draft_updated_at',
  'page_published_at',
  'page_content_versions',
] as const

export function isMissingPageContentSchema(message: string) {
  const normalized = message.toLowerCase()
  const mentionsSchemaObject = PAGE_CONTENT_SCHEMA_MARKERS.some((marker) =>
    normalized.includes(marker),
  )
  if (!mentionsSchemaObject) return false

  return (
    normalized.includes('schema cache') ||
    normalized.includes('does not exist') ||
    normalized.includes('could not find') ||
    normalized.includes('column') ||
    normalized.includes('relation')
  )
}

export function pageContentSchemaUserMessage(input: {
  original: string
  isLocal: boolean
  apiHost: string
}): string {
  const hint = input.isLocal
    ? `This app is using local Supabase (${input.apiHost}), not the cloud project. Apply local migrations with \`pnpm db:migrate\`, then reload.`
    : `The API at ${input.apiHost} cannot see the page content draft columns yet. Apply cloud migrations with \`pnpm db:push\` (uses --remote), reload the API schema in the Supabase dashboard if needed, then reload this page.`

  const original = input.original.trim()
  return original ? `${hint} ${original}` : hint
}
