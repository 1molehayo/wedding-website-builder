import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react'
import { BellIcon } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications/notifications'
import type { AdminNotificationItem } from '@/lib/notifications/notifications'
import { cn } from '@/lib/utils'

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AdminNotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-end',
    strategy: 'fixed',
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })
  const click = useClick(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'dialog' })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ])

  const applyResult = useCallback(
    (result: { items: AdminNotificationItem[]; unreadCount: number }) => {
      setItems(result.items)
      setUnreadCount(result.unreadCount)
    },
    [],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listNotifications({ data: { limit: 30 } })
      applyResult(result)
    } catch {
      // Keep the last good list if refresh fails.
    } finally {
      setLoading(false)
    }
  }, [applyResult])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => {
      void refresh()
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  const onSelect = async (item: AdminNotificationItem) => {
    setOpen(false)
    if (!item.read_at) {
      try {
        const result = await markNotificationRead({
          data: { notificationId: item.id },
        })
        applyResult(result)
      } catch {
        // Navigation still proceeds.
      }
    }
    if (item.href) {
      void navigate({ to: item.href })
    }
  }

  const onMarkAll = async () => {
    try {
      const result = await markAllNotificationsRead()
      applyResult(result)
    } catch {
      // Ignore; user can retry.
    }
  }

  return (
    <>
      <Button
        ref={refs.setReference}
        type="button"
        size="sm"
        variant="outline"
        square
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        className="relative"
        {...getReferenceProps()}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="bg-error text-background absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.65rem] font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="border-border bg-surface z-50 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border shadow-lg"
              {...getFloatingProps()}
            >
              <div className="border-border flex items-center justify-between gap-2 border-b px-3 py-2.5">
                <p className="text-sm font-medium">Notifications</p>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    className="text-foreground-secondary text-xs underline-offset-4 hover:underline"
                    onClick={() => void onMarkAll()}
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loading && items.length === 0 ? (
                  <p className="text-foreground-secondary px-3 py-6 text-center text-sm">
                    Loading…
                  </p>
                ) : items.length === 0 ? (
                  <p className="text-foreground-secondary px-3 py-6 text-center text-sm">
                    No notifications yet.
                  </p>
                ) : (
                  <ul className="divide-border divide-y">
                    {items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={cn(
                            'hover:bg-background-secondary w-full px-3 py-2.5 text-left transition',
                            !item.read_at && 'bg-background-secondary/60',
                          )}
                          onClick={() => void onSelect(item)}
                        >
                          <p className="text-sm leading-snug">{item.summary}</p>
                          <p className="text-foreground-secondary mt-1 text-xs">
                            {formatWhen(item.created_at)}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  )
}
