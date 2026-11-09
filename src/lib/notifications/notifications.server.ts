import {
  notificationHrefForAction,
  shouldNotifyAction,
} from '@/lib/notifications/notify-rules'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'

export type AdminNotificationItem = {
  id: string
  wedding_id: string | null
  action: string
  summary: string
  href: string | null
  read_at: string | null
  created_at: string
}

export type ListNotificationsResult = {
  items: AdminNotificationItem[]
  unreadCount: number
}

async function listRecipientIds(input: {
  weddingId: string | null
  action: string
  actorId: string | null
}): Promise<string[]> {
  const admin = createAdminSupabaseClient()

  if (input.action === 'feedback.submitted' || input.weddingId == null) {
    const result = await admin
      .from('admin_profiles')
      .select('id')
      .eq('role', 'super_admin')
      .is('cancelled_at', null)
      .not('invite_accepted_at', 'is', null)

    if (result.error) throw new Error(result.error.message)
    return result.data.map((row) => row.id).filter((id) => id !== input.actorId)
  }

  const result = await admin
    .from('admin_profiles')
    .select('id')
    .eq('wedding_id', input.weddingId)
    .is('cancelled_at', null)
    .not('invite_accepted_at', 'is', null)

  if (result.error) throw new Error(result.error.message)
  return result.data.map((row) => row.id).filter((id) => id !== input.actorId)
}

/** Fan-out inbox rows for a notify-worthy activity. Never throws to callers. */
export async function fanOutNotifications(input: {
  activityLogId: string
  weddingId: string | null
  actorId: string | null
  action: string
  summary: string
}): Promise<void> {
  if (!shouldNotifyAction(input.action)) return

  try {
    const recipientIds = await listRecipientIds({
      weddingId: input.weddingId,
      action: input.action,
      actorId: input.actorId,
    })
    if (recipientIds.length === 0) return

    const href = notificationHrefForAction(input.action)
    const admin = createAdminSupabaseClient()
    const { error } = await admin.from('admin_notifications').insert(
      recipientIds.map((recipientId) => ({
        recipient_id: recipientId,
        wedding_id: input.weddingId,
        activity_log_id: input.activityLogId,
        action: input.action,
        summary: input.summary,
        href,
      })),
    )
    if (error) {
      console.error('[notifications] fan-out failed', error.message)
    }
  } catch (error) {
    console.error('[notifications] fan-out failed', error)
  }
}

export async function listNotificationsHandler(input: {
  limit?: number
}): Promise<ListNotificationsResult> {
  const { requireAdminSession } = await import('@/lib/auth/session.server')
  const session = await requireAdminSession()
  const admin = createAdminSupabaseClient()
  const limit = Math.min(50, Math.max(1, input.limit ?? 30))

  const [listResult, unreadResult] = await Promise.all([
    admin
      .from('admin_notifications')
      .select('id, wedding_id, action, summary, href, read_at, created_at')
      .eq('recipient_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit),
    admin
      .from('admin_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', session.user.id)
      .is('read_at', null),
  ])

  if (listResult.error) throw new Error(listResult.error.message)
  if (unreadResult.error) throw new Error(unreadResult.error.message)

  return {
    items: listResult.data.map((row) => ({
      id: row.id,
      wedding_id: row.wedding_id,
      action: row.action,
      summary: row.summary,
      href: row.href,
      read_at: row.read_at,
      created_at: row.created_at,
    })),
    unreadCount: unreadResult.count ?? 0,
  }
}

export async function markNotificationReadHandler(
  notificationId: string,
): Promise<ListNotificationsResult> {
  const { requireAdminSession } = await import('@/lib/auth/session.server')
  const session = await requireAdminSession()
  const admin = createAdminSupabaseClient()

  const updated = await admin
    .from('admin_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_id', session.user.id)
    .is('read_at', null)
    .select('id')
    .maybeSingle()

  if (updated.error) throw new Error(updated.error.message)

  return listNotificationsHandler({})
}

export async function markAllNotificationsReadHandler(): Promise<ListNotificationsResult> {
  const { requireAdminSession } = await import('@/lib/auth/session.server')
  const session = await requireAdminSession()
  const admin = createAdminSupabaseClient()

  const updated = await admin
    .from('admin_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', session.user.id)
    .is('read_at', null)

  if (updated.error) throw new Error(updated.error.message)

  return listNotificationsHandler({})
}
