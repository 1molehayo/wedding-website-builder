import type {
  ListActivityLogsInput,
  ListActivityLogsResult,
} from '@/lib/activity/areas'
import {
  assertActivityAction,
  redactActivityMetadata,
} from '@/lib/activity/redact'
import type { AdminSession } from '@/lib/auth/types'
import { isSuperAdminProfile } from '@/lib/auth/roles'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import type { ActivityActorRole } from '@/lib/supabase/types'

export type {
  ActivityArea,
  ActivityLogListItem,
  ListActivityLogsInput,
  ListActivityLogsResult,
} from '@/lib/activity/areas'
export { ACTIVITY_AREAS } from '@/lib/activity/areas'

export type RecordActivityInput = {
  weddingId: string | null
  actorId: string | null
  actorEmail: string | null
  actorRole: ActivityActorRole
  action: string
  entityType: string
  entityId: string | null
  summary: string
  metadata?: Record<string, unknown>
}

function toSerializableMetadata(
  value: unknown,
): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const output: Record<string, string | number | boolean | null> = {}
  for (const [key, child] of Object.entries(value)) {
    if (
      typeof child === 'string' ||
      typeof child === 'boolean' ||
      child === null
    ) {
      output[key] = child
      continue
    }
    if (typeof child === 'number' && Number.isFinite(child)) {
      output[key] = child
    }
  }
  return output
}

/**
 * Append one activity_logs row.
 * Checks the action shape, then runs redactActivityMetadata so secrets are not stored.
 * Throws if the insert fails, so the action that called this does not look successful.
 */
export async function recordActivity(
  input: RecordActivityInput,
): Promise<void> {
  const action = assertActivityAction(input.action)
  const summary = input.summary.trim()
  if (summary.length === 0 || summary.length > 280) {
    throw new Error('Activity summary must be 1–280 characters.')
  }
  const entityType = input.entityType.trim()
  if (entityType.length === 0 || entityType.length > 40) {
    throw new Error('Activity entity type must be 1–40 characters.')
  }

  const metadata = redactActivityMetadata(input.metadata ?? {})
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('activity_logs')
    .insert({
      wedding_id: input.weddingId,
      actor_id: input.actorId,
      actor_email: input.actorEmail,
      actor_role: input.actorRole,
      action,
      entity_type: entityType,
      entity_id: input.entityId,
      summary,
      metadata,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const { fanOutNotifications } = await import(
    '@/lib/notifications/notifications.server'
  )
  await fanOutNotifications({
    activityLogId: data.id,
    weddingId: input.weddingId,
    actorId: input.actorId,
    action,
    summary,
  })
}

/** Record a mutation by the signed-in admin. */
export async function recordAdminActivity(
  session: AdminSession,
  input: {
    weddingId?: string | null
    action: string
    entityType: string
    entityId?: string | null
    summary: string
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  const weddingId =
    input.weddingId === undefined
      ? (session.wedding?.id ?? null)
      : input.weddingId

  await recordActivity({
    weddingId,
    actorId: session.user.id,
    actorEmail: session.profile.email ?? session.user.email ?? null,
    actorRole: session.profile.role,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    summary: input.summary,
    metadata: input.metadata,
  })
}

export async function listActivityLogsHandler(
  input: ListActivityLogsInput,
): Promise<ListActivityLogsResult> {
  const { requireAdminSession } = await import('@/lib/auth/session.server')
  const session = await requireAdminSession()
  const admin = createAdminSupabaseClient()
  const isSuper = isSuperAdminProfile(session.profile)

  let query = admin
    .from('activity_logs')
    .select(
      'id, wedding_id, actor_id, actor_email, actor_role, action, entity_type, entity_id, summary, metadata, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(input.offset, input.offset + input.limit - 1)

  if (!isSuper) {
    const weddingId = session.wedding?.id
    if (!weddingId) {
      return { items: [], total: 0, limit: input.limit, offset: input.offset }
    }
    query = query.eq('wedding_id', weddingId)
  }

  if (input.area) {
    query = query.like('action', `${input.area}.%`)
  }
  if (input.actorRole) {
    query = query.eq('actor_role', input.actorRole)
  }
  if (input.query) {
    query = query.ilike('actor_email', `%${input.query}%`)
  }
  if (input.from) {
    query = query.gte('created_at', input.from)
  }
  if (input.to) {
    query = query.lte('created_at', input.to)
  }

  const result = await query
  if (result.error) throw new Error(result.error.message)

  return {
    items: result.data.map((row) => ({
      id: row.id,
      wedding_id: row.wedding_id,
      actor_id: row.actor_id,
      actor_email: row.actor_email,
      actor_role: row.actor_role,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      summary: row.summary,
      metadata: toSerializableMetadata(row.metadata),
      created_at: row.created_at,
    })),
    total: result.count ?? 0,
    limit: input.limit,
    offset: input.offset,
  }
}
