/** Shared activity constants and list types — safe for client and server. */

import type { ActivityActorRole } from '@/lib/supabase/types'

export const ACTIVITY_AREAS = [
  'guest',
  'registry',
  'pages',
  'media',
  'settings',
  'profile',
  'admins',
  'feedback',
  'auth',
  'system',
] as const

export type ActivityArea = (typeof ACTIVITY_AREAS)[number]

export type ListActivityLogsInput = {
  area: ActivityArea | null
  actorRole: ActivityActorRole | null
  query: string | null
  from: string | null
  to: string | null
  limit: number
  offset: number
}

/** JSON-safe activity row for server-fn responses. */
export type ActivityLogListItem = {
  id: string
  wedding_id: string | null
  actor_id: string | null
  actor_email: string | null
  actor_role: ActivityActorRole
  action: string
  entity_type: string
  entity_id: string | null
  summary: string
  metadata: Record<string, string | number | boolean | null>
  created_at: string
}

export type ListActivityLogsResult = {
  items: ActivityLogListItem[]
  total: number
  limit: number
  offset: number
}
