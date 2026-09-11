import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toaster'
import { isSuperAdminProfile } from '@/lib/auth/roles'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  feedbackCategoryLabel,
} from '@/lib/feedback/categories'
import type { FeedbackStatus } from '@/lib/feedback/categories'
import {
  listProductFeedback,
  updateProductFeedbackStatus,
} from '@/lib/feedback/feedback'
import type { ProductFeedbackRow } from '@/lib/feedback/feedback'

export const Route = createFileRoute('/admin/feedback')({
  beforeLoad: ({ context }) => {
    if (!context.session || !isSuperAdminProfile(context.session.profile)) {
      throw redirect({ to: '/admin' })
    }
  },
  loader: async () => listProductFeedback(),
  component: AdminFeedbackBacklogPage,
})

function statusBadgeVariant(
  status: FeedbackStatus,
): 'info' | 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'new':
      return 'info'
    case 'planned':
      return 'warning'
    case 'done':
      return 'success'
    case 'dismissed':
      return 'neutral'
  }
}

function AdminFeedbackBacklogPage() {
  const initial = Route.useLoaderData()
  const router = useRouter()
  const [items, setItems] = useState<ProductFeedbackRow[]>(initial.items)
  const [counts, setCounts] = useState(initial.counts)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const onStatusChange = async (feedbackId: string, status: FeedbackStatus) => {
    setUpdatingId(feedbackId)
    try {
      await updateProductFeedbackStatus({ data: { feedbackId, status } })
      const next = await listProductFeedback()
      setItems(next.items)
      setCounts(next.counts)
      toast.success('Feedback updated.')
      await router.invalidate()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to update feedback.',
      )
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="admin-page-title">Backlog</h1>
        <p className="text-foreground-secondary mt-2 text-sm">
          Product feedback from admins. Use counts to prioritise v2 work.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {FEEDBACK_CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="bg-surface border-border rounded-xl border px-4 py-3"
          >
            <p className="text-foreground-secondary text-xs tracking-[0.14em] uppercase">
              {category.label}
            </p>
            <p className="mt-1 text-2xl font-medium tabular-nums">
              {counts[category.id]}
            </p>
            <p className="text-foreground-secondary text-xs">Open / planned</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-foreground-secondary text-sm">No feedback yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="bg-surface border-border space-y-3 rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge size="sm" variant="neutral">
                      {feedbackCategoryLabel(item.category)}
                    </Badge>
                    <Badge size="sm" variant={statusBadgeVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-foreground-secondary text-xs">
                    {item.admin_name || item.admin_email || 'Admin'}
                    {item.page_path ? ` · ${item.page_path}` : ''}
                    {' · '}
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <Select
                  value={item.status}
                  disabled={updatingId === item.id}
                  onChange={(event) =>
                    void onStatusChange(
                      item.id,
                      event.target.value as FeedbackStatus,
                    )
                  }
                  className="max-w-40"
                >
                  {FEEDBACK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {item.message}
              </p>
              {updatingId === item.id ? (
                <Button type="button" size="sm" variant="outline" disabled>
                  Saving…
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
