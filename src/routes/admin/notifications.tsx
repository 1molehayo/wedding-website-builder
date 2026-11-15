import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TablePagination } from '@/components/ui/table-pagination'
import { toast } from '@/components/ui/toaster'
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications/notifications'
import type { AdminNotificationItem } from '@/lib/notifications/notifications'
import { notificationCtaForHref } from '@/lib/notifications/notify-rules'
import {
  adminQueryKeys,
  notificationsPageQueryOptions,
} from '@/lib/query/admin-queries'
import { cn } from '@/lib/utils'

function formatWhen(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export const Route = createFileRoute('/admin/notifications')({
  validateSearch: (search: Record<string, unknown>) => ({
    page:
      typeof search.page === 'number' && Number.isFinite(search.page)
        ? Math.max(1, Math.floor(search.page))
        : typeof search.page === 'string' && /^\d+$/.test(search.page)
          ? Math.max(1, Number(search.page))
          : 1,
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      notificationsPageQueryOptions(deps.page),
    ),
  component: AdminNotificationsPage,
})

function AdminNotificationsPage() {
  const initial = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const { data = initial } = useQuery(
    notificationsPageQueryOptions(search.page),
  )
  const refreshNotifications = async () => {
    await queryClient.invalidateQueries({
      queryKey: adminQueryKeys.notifications,
    })
  }

  const onSelect = async (item: AdminNotificationItem) => {
    if (!item.read_at) {
      try {
        const result = await markNotificationRead({
          data: { notificationId: item.id },
        })
        queryClient.setQueryData(adminQueryKeys.notifications, result)
        await refreshNotifications()
      } catch {
        // Navigation still proceeds.
      }
    }
    void navigate({ to: item.href })
  }

  const onMarkAllRead = async () => {
    try {
      const result = await markAllNotificationsRead()
      queryClient.setQueryData(adminQueryKeys.notifications, result)
      await refreshNotifications()
      toast.success('All notifications marked as read.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to mark notifications as read.',
      )
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="admin-page-title">Notifications</h1>
          <p className="text-foreground-secondary mt-2 max-w-2xl text-sm leading-relaxed">
            Read and unread updates for this admin account. Newest first.
          </p>
        </div>
        {data.unreadCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void onMarkAllRead()}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      {data.items.length === 0 ? (
        <div className="border-border bg-surface rounded-xl border border-dashed px-6 py-12 text-center">
          <p className="text-lg font-medium">No notifications yet</p>
          <p className="text-foreground-secondary mt-2 text-sm">
            Updates that need your attention will appear here.
          </p>
        </div>
      ) : (
        <ul className="border-border bg-surface divide-border divide-y overflow-hidden rounded-xl border">
          {data.items.map((item) => {
            const cta = notificationCtaForHref(item.href)
            const content = (
              <>
                <span className="min-w-0">
                  <span className="block text-sm leading-relaxed font-medium">
                    {item.summary}
                  </span>
                  <span className="text-foreground-secondary mt-1 block text-xs">
                    {formatWhen(item.created_at)}
                  </span>
                  {cta ? (
                    <span className="mt-2 block text-sm font-medium underline underline-offset-4">
                      {cta.label}
                    </span>
                  ) : null}
                </span>
                <Badge
                  size="sm"
                  variant={item.read_at ? 'neutral' : 'info'}
                  className="shrink-0"
                >
                  {item.read_at ? 'Read' : 'Unread'}
                </Badge>
              </>
            )
            const className = cn(
              'flex w-full items-start justify-between gap-4 px-4 py-4 text-left md:px-5',
              !item.read_at && 'bg-background-secondary/60',
            )
            return (
              <li key={item.id}>
                {cta ? (
                  <button
                    type="button"
                    className={cn(
                      className,
                      'hover:bg-background-secondary transition',
                    )}
                    onClick={() => void onSelect(item)}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={className}>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {data.total > 50 ? (
        <TablePagination
          page={search.page}
          pageSize={50}
          totalRows={data.total}
          itemLabel="notifications"
          showPageSize={false}
          onPageChange={(page) => void navigate({ search: { page } })}
        />
      ) : null}
    </div>
  )
}
