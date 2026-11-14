import { queryOptions } from '@tanstack/react-query'
import { ACTIVITY_AREAS, listActivityLogs } from '@/lib/activity/activity'
import type { ActivityArea } from '@/lib/activity/activity'
import { listAdmins } from '@/lib/auth/admins'
import { listProductFeedback } from '@/lib/feedback/feedback'
import { listGuests } from '@/lib/guests/guests'
import { listMediaAssets } from '@/lib/media/media'
import { listNotifications } from '@/lib/notifications/notifications'
import { getPageBlocks } from '@/lib/page-blocks/settings'
import { listPhotoShareGroups } from '@/lib/photo-shares/photo-shares'
import { listRegistryAdmin } from '@/lib/registry/registry'

export const adminQueryKeys = {
  guests: ['admin', 'guests'] as const,
  registry: ['admin', 'registry'] as const,
  media: ['admin', 'media'] as const,
  photoShares: ['admin', 'photo-shares'] as const,
  admins: ['admin', 'admins'] as const,
  pages: ['admin', 'pages'] as const,
  feedback: ['admin', 'feedback'] as const,
  notifications: ['admin', 'notifications'] as const,
  notificationsPage: (page: number) =>
    ['admin', 'notifications', 'page', page] as const,
  activity: (filters: AdminActivityFilters) =>
    ['admin', 'activity', filters] as const,
}

export function guestsQueryOptions() {
  return queryOptions({
    queryKey: adminQueryKeys.guests,
    queryFn: () => listGuests(),
  })
}

export function registryQueryOptions() {
  return queryOptions({
    queryKey: adminQueryKeys.registry,
    queryFn: () => listRegistryAdmin(),
  })
}

export function mediaAssetsQueryOptions() {
  return queryOptions({
    queryKey: adminQueryKeys.media,
    queryFn: () => listMediaAssets(),
  })
}

export function photoSharesQueryOptions() {
  return queryOptions({
    queryKey: adminQueryKeys.photoShares,
    queryFn: () => listPhotoShareGroups(),
  })
}

export function adminsQueryOptions() {
  return queryOptions({
    queryKey: adminQueryKeys.admins,
    queryFn: () => listAdmins(),
  })
}

export function pageBlocksQueryOptions() {
  return queryOptions({
    queryKey: adminQueryKeys.pages,
    queryFn: () => getPageBlocks(),
  })
}

export function feedbackQueryOptions() {
  return queryOptions({
    queryKey: adminQueryKeys.feedback,
    queryFn: () => listProductFeedback(),
  })
}

export function notificationsQueryOptions() {
  return queryOptions({
    queryKey: adminQueryKeys.notifications,
    queryFn: () => listNotifications({ data: { limit: 30 } }),
  })
}

export function notificationsPageQueryOptions(page: number) {
  const limit = 50
  return queryOptions({
    queryKey: adminQueryKeys.notificationsPage(page),
    queryFn: () =>
      listNotifications({
        data: { limit, offset: (page - 1) * limit },
      }),
  })
}

export type AdminActivityFilters = {
  area: ActivityArea | '' | string
  actorRole: 'admin' | 'super_admin' | 'guest' | 'system' | '' | string
  q: string
  from: string
  to: string
  page: number
}

export function activityQueryOptions(filters: AdminActivityFilters) {
  const limit = 50
  const area =
    filters.area &&
    (ACTIVITY_AREAS as readonly string[]).includes(filters.area)
      ? (filters.area as ActivityArea)
      : null
  const actorRole =
    filters.actorRole === 'admin' ||
    filters.actorRole === 'super_admin' ||
    filters.actorRole === 'guest' ||
    filters.actorRole === 'system'
      ? filters.actorRole
      : null

  return queryOptions({
    queryKey: adminQueryKeys.activity({
      area: area ?? '',
      actorRole: actorRole ?? '',
      q: filters.q,
      from: filters.from,
      to: filters.to,
      page: filters.page,
    }),
    queryFn: () =>
      listActivityLogs({
        data: {
          area,
          actorRole,
          query: filters.q || null,
          from: filters.from
            ? new Date(`${filters.from}T00:00:00.000Z`).toISOString()
            : null,
          to: filters.to
            ? new Date(`${filters.to}T23:59:59.999Z`).toISOString()
            : null,
          limit,
          offset: (filters.page - 1) * limit,
        },
      }),
  })
}
