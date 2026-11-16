import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { CheckIcon, FunnelIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { OverviewCard } from '@/components/admin/overview-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import type { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableView } from '@/components/ui/table-view'
import { toast } from '@/components/ui/toaster'
import { isSuperAdminProfile } from '@/lib/auth/roles'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  feedbackCategoryLabel,
  feedbackStatusLabel,
} from '@/lib/feedback/categories'
import type {
  FeedbackCategoryId,
  FeedbackStatus,
} from '@/lib/feedback/categories'
import {
  updateProductFeedbackStatus
  
} from '@/lib/feedback/feedback'
import type {ProductFeedbackRow} from '@/lib/feedback/feedback';
import { adminQueryKeys, feedbackQueryOptions } from '@/lib/query/admin-queries'
import { parsePage, parsePageSize } from '@/lib/pagination'

type FeedbackCategoryFilter = 'all' | FeedbackCategoryId
type FeedbackStatusFilter = 'all' | FeedbackStatus

function parseCategoryFilter(value: unknown): FeedbackCategoryFilter {
  const raw = typeof value === 'string' ? value : 'all'
  if (raw === 'all') return 'all'
  if (FEEDBACK_CATEGORIES.some((item) => item.id === raw)) {
    return raw as FeedbackCategoryId
  }
  return 'all'
}

function parseStatusFilter(value: unknown): FeedbackStatusFilter {
  const raw = typeof value === 'string' ? value : 'all'
  if (raw === 'all') return 'all'
  if ((FEEDBACK_STATUSES as readonly string[]).includes(raw)) {
    return raw as FeedbackStatus
  }
  return 'all'
}

export const Route = createFileRoute('/admin/feedback')({
  validateSearch: (search: Record<string, unknown>) => ({
    page: parsePage(search.page),
    pageSize: parsePageSize(search.pageSize),
    category: parseCategoryFilter(search.category),
    status: parseStatusFilter(search.status),
    q: typeof search.q === 'string' ? search.q : '',
  }),
  beforeLoad: ({ context }) => {
    if (!context.session || !isSuperAdminProfile(context.session.profile)) {
      throw redirect({ to: '/admin' })
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(feedbackQueryOptions()),
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
  const routeSearch = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const { data = initial } = useQuery(feedbackQueryOptions())
  const items = data.items
  const counts = data.counts
  const openTotal = FEEDBACK_CATEGORIES.reduce(
    (sum, category) => sum + counts[category.id],
    0,
  )
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'submitted', desc: true },
  ])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<FeedbackStatusFilter>(
    routeSearch.status,
  )
  const filterDetailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    setDraftStatus(routeSearch.status)
  }, [routeSearch.status])

  const applyCategoryFilter = (category: FeedbackCategoryFilter) => {
    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        category: previous.category === category ? 'all' : category,
        page: 1,
      }),
    })
  }

  const applyStatusFilter = (status: FeedbackStatusFilter) => {
    void navigate({
      replace: true,
      search: (previous) => ({ ...previous, status, page: 1 }),
    })
  }

  const onStatusChange = async (feedbackId: string, status: FeedbackStatus) => {
    setUpdatingId(feedbackId)
    try {
      await updateProductFeedbackStatus({ data: { feedbackId, status } })
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.feedback })
      toast.success('Feedback updated.')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to update feedback.',
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const columns = useMemo<ColumnDef<ProductFeedbackRow>[]>(
    () => [
      {
        id: 'message',
        accessorFn: (row) => row.message,
        header: 'Feedback',
        cell: ({ row }) => (
          <p className="max-w-md text-sm leading-relaxed whitespace-pre-wrap">
            {row.original.message}
          </p>
        ),
        meta: { minWidth: 240 },
      },
      {
        id: 'category',
        accessorFn: (row) => row.category,
        header: 'Category',
        cell: ({ row }) => (
          <Badge size="sm" variant="neutral">
            {feedbackCategoryLabel(row.original.category)}
          </Badge>
        ),
        meta: { minWidth: 140 },
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: 'Status',
        cell: ({ row }) => (
          <Badge size="sm" variant={statusBadgeVariant(row.original.status)}>
            {feedbackStatusLabel(row.original.status)}
          </Badge>
        ),
        meta: { minWidth: 110 },
      },
      {
        id: 'author',
        accessorFn: (row) => row.admin_name || row.admin_email || '',
        header: 'Author',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">
              {row.original.admin_name || row.original.admin_email || 'Admin'}
            </p>
            {row.original.admin_name && row.original.admin_email ? (
              <p className="text-foreground-secondary truncate text-sm">
                {row.original.admin_email}
              </p>
            ) : null}
          </div>
        ),
        meta: { minWidth: 180 },
      },
      {
        id: 'page',
        accessorFn: (row) => row.page_path ?? '',
        header: 'Page',
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">
            {row.original.page_path || '—'}
          </span>
        ),
        meta: { minWidth: 120 },
      },
      {
        id: 'submitted',
        accessorFn: (row) => row.created_at,
        header: 'Submitted',
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm tabular-nums">
            {new Date(row.original.created_at).toLocaleString()}
          </span>
        ),
        meta: { minWidth: 170 },
      },
      {
        id: 'actions',
        enableSorting: false,
        header: '',
        cell: ({ row }) => {
          const item = row.original
          const busy = updatingId === item.id
          const menuItems: DropdownMenuItem[] = FEEDBACK_STATUSES.map(
            (status) => {
              const isCurrent = item.status === status
              return {
                id: status,
                label: isCurrent
                  ? `${feedbackStatusLabel(status)} (current)`
                  : `Mark as ${feedbackStatusLabel(status).toLowerCase()}`,
                icon: isCurrent ? <CheckIcon weight="bold" /> : undefined,
                disabled: isCurrent || busy,
                onSelect: () => {
                  void onStatusChange(item.id, status)
                },
              }
            },
          )
          return (
            <div className="flex justify-end">
              <DropdownMenu label="Feedback actions" items={menuItems} />
            </div>
          )
        },
        meta: { minWidth: 64, className: 'w-16' },
      },
    ],
    [updatingId],
  )

  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
      globalFilter: routeSearch.q,
      pagination: {
        pageIndex: routeSearch.page - 1,
        pageSize: routeSearch.pageSize,
      },
      columnFilters: [
        ...(routeSearch.category === 'all'
          ? []
          : [{ id: 'category', value: routeSearch.category }]),
        ...(routeSearch.status === 'all'
          ? []
          : [{ id: 'status', value: routeSearch.status }]),
      ],
    },
    onSortingChange: (next) => {
      setSorting(next)
      void navigate({
        replace: true,
        search: (previous) => ({ ...previous, page: 1 }),
      })
    },
    onGlobalFilterChange: (next) => {
      const q =
        typeof next === 'function' ? String(next(routeSearch.q)) : String(next)
      void navigate({
        replace: true,
        search: (previous) => ({ ...previous, q, page: 1 }),
      })
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).trim().toLowerCase()
      if (!query) return true
      const item = row.original
      const haystack = [
        item.message,
        item.admin_name ?? '',
        item.admin_email ?? '',
        item.page_path ?? '',
        feedbackCategoryLabel(item.category),
        feedbackStatusLabel(item.status),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    },
  })

  const filteredCount = table.getFilteredRowModel().rows.length
  const pageCount = Math.max(1, Math.ceil(filteredCount / routeSearch.pageSize))

  useEffect(() => {
    if (routeSearch.page <= pageCount) return
    void navigate({
      replace: true,
      search: (previous) => ({ ...previous, page: pageCount }),
    })
  }, [navigate, pageCount, routeSearch.page])

  const activeFilterCount =
    (routeSearch.status !== 'all' ? 1 : 0) +
    (routeSearch.category !== 'all' ? 1 : 0)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="admin-page-title">Backlog</h1>
        <p className="text-foreground-secondary mt-2 text-sm">
          Product feedback from admins. Use counts to prioritise v2 work.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <OverviewCard
          label="All"
          value={openTotal}
          active={routeSearch.category === 'all'}
          onClick={() => applyCategoryFilter('all')}
        />
        {FEEDBACK_CATEGORIES.map((category) => (
          <OverviewCard
            key={category.id}
            label={category.label}
            value={counts[category.id]}
            active={routeSearch.category === category.id}
            onClick={() => applyCategoryFilter(category.id)}
          />
        ))}
      </div>
      <p className="text-foreground-secondary -mt-3 text-xs">
        Card counts are open and planned items. Click a card to filter the
        table.
      </p>

      <div className="space-y-3">
        <div className="flex flex-wrap justify-end gap-2">
          <details ref={filterDetailsRef} className="relative">
            <summary className="border-border bg-surface hover:bg-background-secondary flex h-8 cursor-pointer list-none items-center gap-2 rounded-lg border px-3 text-sm font-medium transition">
              <FunnelIcon />
              Filters
              {activeFilterCount > 0 ? (
                <Badge size="sm" variant="info">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </summary>
            <div className="border-border bg-surface absolute top-full right-0 z-20 mt-2 w-64 rounded-xl border p-4 shadow-lg">
              <Field>
                <Field.Label>Status</Field.Label>
                <Field.Control>
                  <Select
                    value={draftStatus}
                    onChange={(event) =>
                      setDraftStatus(
                        event.target.value as FeedbackStatusFilter,
                      )
                    }
                  >
                    <option value="all">All statuses</option>
                    {FEEDBACK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {feedbackStatusLabel(status)}
                      </option>
                    ))}
                  </Select>
                </Field.Control>
              </Field>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDraftStatus('all')
                    void navigate({
                      replace: true,
                      search: (previous) => ({
                        ...previous,
                        category: 'all',
                        status: 'all',
                        page: 1,
                      }),
                    })
                    filterDetailsRef.current?.removeAttribute('open')
                  }}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    applyStatusFilter(draftStatus)
                    filterDetailsRef.current?.removeAttribute('open')
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </details>
          <Input
            size="sm"
            className="w-full max-w-xs"
            value={routeSearch.q}
            onChange={(event) =>
              void navigate({
                replace: true,
                search: (previous) => ({
                  ...previous,
                  q: event.target.value,
                  page: 1,
                }),
              })
            }
            placeholder="Search message, author, page"
            aria-label="Search feedback"
          />
        </div>

        <TableView
          table={table}
          emptyMessage="No feedback matches these filters."
        />
        <TablePagination
          page={routeSearch.page}
          pageSize={routeSearch.pageSize}
          totalRows={filteredCount}
          itemLabel="feedback items"
          onPageChange={(page) =>
            void navigate({
              search: (previous) => ({ ...previous, page }),
            })
          }
          onPageSizeChange={(pageSize) =>
            void navigate({
              search: (previous) => ({ ...previous, pageSize, page: 1 }),
            })
          }
        />
      </div>
    </div>
  )
}
