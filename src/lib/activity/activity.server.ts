import {
  assertActivityAction,
  redactActivityMetadata,
} from '@/lib/activity/redact'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import type { ActivityActorRole } from '@/lib/supabase/types'

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
  const { error } = await admin.from('activity_logs').insert({
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

  if (error) {
    throw new Error(error.message)
  }
}
