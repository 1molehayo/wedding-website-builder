import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { ACTIVITY_AREAS } from '@/lib/activity/areas'
import type { ActivityArea, ListActivityLogsResult } from '@/lib/activity/areas'

const actorRoles = ['admin', 'super_admin', 'guest', 'system'] as const

const listActivitySchema = z.object({
  area: z.enum(ACTIVITY_AREAS).nullable().optional(),
  actorRole: z.enum(actorRoles).nullable().optional(),
  query: z.string().trim().max(200).nullable().optional(),
  from: z.string().trim().nullable().optional(),
  to: z.string().trim().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type { ActivityArea, ListActivityLogsResult }
export { ACTIVITY_AREAS }

export const listActivityLogs = createServerFn({ method: 'GET' })
  .validator((data: unknown) => {
    const parsed = listActivitySchema.safeParse(data ?? {})
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Invalid filters.')
    }
    const value = parsed.data
    return {
      area: value.area ?? null,
      actorRole: value.actorRole ?? null,
      query: value.query?.trim() ? value.query.trim() : null,
      from: value.from?.trim() ? value.from.trim() : null,
      to: value.to?.trim() ? value.to.trim() : null,
      limit: value.limit ?? 50,
      offset: value.offset ?? 0,
    }
  })
  .handler(async ({ data }): Promise<ListActivityLogsResult> => {
    const { listActivityLogsHandler } = await import('./activity.server')
    return listActivityLogsHandler(data)
  })
