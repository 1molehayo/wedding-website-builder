import { createServerFn } from '@tanstack/react-start'
import type { ListNotificationsResult } from '@/lib/notifications/notifications.server'

export type {
  AdminNotificationItem,
  ListNotificationsResult,
} from '@/lib/notifications/notifications.server'

export const listNotifications = createServerFn({ method: 'GET' })
  .validator((data: unknown) => {
    const value = (data ?? {}) as { limit?: unknown }
    const limit = value.limit == null ? undefined : Number(value.limit)
    return {
      limit:
        limit != null && Number.isFinite(limit) ? Math.floor(limit) : undefined,
    }
  })
  .handler(async ({ data }): Promise<ListNotificationsResult> => {
    const { listNotificationsHandler } = await import('./notifications.server')
    return listNotificationsHandler(data)
  })

export const markNotificationRead = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const value = data as { notificationId?: unknown }
    const notificationId = String(value.notificationId ?? '').trim()
    if (!notificationId) throw new Error('Notification is required.')
    return { notificationId }
  })
  .handler(async ({ data }): Promise<ListNotificationsResult> => {
    const { markNotificationReadHandler } =
      await import('./notifications.server')
    return markNotificationReadHandler(data.notificationId)
  })

export const markAllNotificationsRead = createServerFn({
  method: 'POST',
}).handler(async (): Promise<ListNotificationsResult> => {
  const { markAllNotificationsReadHandler } =
    await import('./notifications.server')
  return markAllNotificationsReadHandler()
})
