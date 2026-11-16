import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { FunnelIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TablePagination } from '@/components/ui/table-pagination'
import { ACTIVITY_AREAS } from '@/lib/activity/activity'
import type { ListActivityLogsResult } from '@/lib/activity/activity'
import { activityQueryOptions } from '@/lib/query/admin-queries'

const ACTOR_ROLES = [
  { value: '', label: 'All actors' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super admin' },
  { value: 'guest', label: 'Guest' },
  { value: 'system', label: 'System' },
] as const

const AREA_LABELS: Record<(typeof ACTIVITY_AREAS)[number], string> = {
  guest: 'Guests',
  registry: 'Registry',
  pages: 'Pages',
  media: 'Media',
  settings: 'Settings',
  profile: 'Profile',
  admins: 'Admins',
  feedback: 'Feedback',
  auth: 'Auth',
  system: 'System',
}

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

function areaFromAction(action: string) {
  const area = action.split('.')[0]
  if ((ACTIVITY_AREAS as readonly string[]).includes(area)) {
    return AREA_LABELS[area as (typeof ACTIVITY_AREAS)[number]]
  }
  return area
}

export const Route = createFileRoute('/admin/activity')({
  beforeLoad: ({ context }) => {
    if (!context.session?.wedding) {
      throw redirect({ to: '/admin/onboarding' })
    }
  },
  validateSearch: (search: Record<string, unknown>) => ({
    area:
      typeof search.area === 'string' &&
      (ACTIVITY_AREAS as readonly string[]).includes(search.area)
        ? search.area
        : '',
    actorRole:
      typeof search.actorRole === 'string' &&
      ['admin', 'super_admin', 'guest', 'system'].includes(search.actorRole)
        ? search.actorRole
        : '',
    q: typeof search.q === 'string' ? search.q : '',
    from: typeof search.from === 'string' ? search.from : '',
    to: typeof search.to === 'string' ? search.to : '',
    page:
      typeof search.page === 'number' && Number.isFinite(search.page)
        ? Math.max(1, Math.floor(search.page))
        : typeof search.page === 'string' && /^\d+$/.test(search.page)
          ? Math.max(1, Number(search.page))
          : 1,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }): Promise<ListActivityLogsResult> => {
    return context.queryClient.ensureQueryData(activityQueryOptions(deps))
  },
  component: AdminActivityPage,
})

function AdminActivityPage() {
  const initial = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data = initial } = useQuery(activityQueryOptions(search))
  const filterDetailsRef = useRef<HTMLDetailsElement>(null)
  const [draftArea, setDraftArea] = useState(search.area)
  const [draftActorRole, setDraftActorRole] = useState(search.actorRole)
  const [draftFrom, setDraftFrom] = useState(search.from)
  const [draftTo, setDraftTo] = useState(search.to)

  useEffect(() => {
    setDraftArea(search.area)
    setDraftActorRole(search.actorRole)
    setDraftFrom(search.from)
    setDraftTo(search.to)
  }, [search.area, search.actorRole, search.from, search.to])

  const activeFilterCount =
    (search.area ? 1 : 0) +
    (search.actorRole ? 1 : 0) +
    (search.from ? 1 : 0) +
    (search.to ? 1 : 0)

  const applyFilters = () => {
    void navigate({
      search: (previous) => ({
        ...previous,
        area: draftArea,
        actorRole: draftActorRole,
        from: draftFrom,
        to: draftTo,
        page: 1,
      }),
    })
    filterDetailsRef.current?.removeAttribute('open')
  }

  const clearFilters = () => {
    setDraftArea('')
    setDraftActorRole('')
    setDraftFrom('')
    setDraftTo('')
    void navigate({
      search: (previous) => ({
        ...previous,
        area: '',
        actorRole: '',
        from: '',
        to: '',
        page: 1,
      }),
    })
    filterDetailsRef.current?.removeAttribute('open')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="admin-page-title">Activity</h1>
        <p className="text-foreground-secondary mt-2 max-w-2xl text-sm leading-relaxed">
          Append-only log of admin and guest changes. Newest first.
        </p>
      </div>

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
            <div className="border-border bg-surface absolute top-full right-0 z-20 mt-2 w-72 space-y-3 rounded-xl border p-4 shadow-lg">
              <Field>
                <Field.Label>Area</Field.Label>
                <Field.Control>
                  <Select
                    value={draftArea}
                    onChange={(event) => setDraftArea(event.target.value)}
                  >
                    <option value="">All areas</option>
                    {ACTIVITY_AREAS.map((id) => (
                      <option key={id} value={id}>
                        {AREA_LABELS[id]}
                      </option>
                    ))}
                  </Select>
                </Field.Control>
              </Field>
              <Field>
                <Field.Label>Actor</Field.Label>
                <Field.Control>
                  <Select
                    value={draftActorRole}
                    onChange={(event) => setDraftActorRole(event.target.value)}
                  >
                    {ACTOR_ROLES.map((role) => (
                      <option key={role.label} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Select>
                </Field.Control>
              </Field>
              <Field>
                <Field.Label>From</Field.Label>
                <Field.Control>
                  <Input
                    type="date"
                    value={draftFrom}
                    onChange={(event) => setDraftFrom(event.target.value)}
                  />
                </Field.Control>
              </Field>
              <Field>
                <Field.Label>To</Field.Label>
                <Field.Control>
                  <Input
                    type="date"
                    value={draftTo}
                    onChange={(event) => setDraftTo(event.target.value)}
                  />
                </Field.Control>
              </Field>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearFilters}
                >
                  Clear
                </Button>
                <Button type="button" size="sm" onClick={applyFilters}>
                  Apply
                </Button>
              </div>
            </div>
          </details>
          <Input
            size="sm"
            className="w-full max-w-xs"
            value={search.q}
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
            placeholder="Search email or summary"
            aria-label="Search activity"
          />
        </div>

        {data.items.length === 0 ? (
          <p className="text-foreground-secondary text-sm">
            No activity matches these filters yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.items.map((row) => (
              <li
                key={row.id}
                className="bg-surface border-border rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{row.summary}</p>
                  <p className="text-foreground-secondary text-xs whitespace-nowrap">
                    {formatWhen(row.created_at)}
                  </p>
                </div>
                <p className="text-foreground-secondary mt-1 text-sm">
                  {areaFromAction(row.action)} · {row.action}
                  {row.actor_email
                    ? ` · ${row.actor_email}`
                    : ` · ${row.actor_role}`}
                </p>
              </li>
            ))}
          </ul>
        )}

        {data.total > data.limit ? (
          <TablePagination
            page={search.page}
            pageSize={data.limit}
            totalRows={data.total}
            itemLabel="events"
            showPageSize={false}
            onPageChange={(page) =>
              void navigate({ search: (previous) => ({ ...previous, page }) })
            }
          />
        ) : null}
      </div>
    </div>
  )
}
