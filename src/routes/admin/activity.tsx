import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ACTIVITY_AREAS, listActivityLogs } from '@/lib/activity/activity'
import type { ListActivityLogsResult } from '@/lib/activity/activity'

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
  loader: async ({ deps }): Promise<ListActivityLogsResult> => {
    const limit = 50
    const result = await listActivityLogs({
      data: {
        area: deps.area || null,
        actorRole: deps.actorRole || null,
        query: deps.q || null,
        from: deps.from
          ? new Date(`${deps.from}T00:00:00.000Z`).toISOString()
          : null,
        to: deps.to ? new Date(`${deps.to}T23:59:59.999Z`).toISOString() : null,
        limit,
        offset: (deps.page - 1) * limit,
      },
    })
    return result
  },
  component: AdminActivityPage,
})

function AdminActivityPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const [area, setArea] = useState(search.area)
  const [actorRole, setActorRole] = useState(search.actorRole)
  const [query, setQuery] = useState(search.q)
  const [from, setFrom] = useState(search.from)
  const [to, setTo] = useState(search.to)

  useEffect(() => {
    setArea(search.area)
    setActorRole(search.actorRole)
    setQuery(search.q)
    setFrom(search.from)
    setTo(search.to)
  }, [search])

  const applyFilters = () => {
    void navigate({
      search: {
        area,
        actorRole,
        q: query.trim(),
        from,
        to,
        page: 1,
      },
    })
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit))
  const page = search.page

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="admin-page-title">Activity</h1>
        <p className="text-foreground-secondary mt-2 max-w-2xl text-sm leading-relaxed">
          Append-only log of admin and guest changes. Newest first.
        </p>
      </div>

      <form
        className="bg-surface border-border grid gap-3 rounded-xl border p-4 md:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault()
          applyFilters()
        }}
      >
        <Field>
          <Field.Label>Area</Field.Label>
          <Field.Control>
            <Select
              value={area}
              onChange={(event) => setArea(event.target.value)}
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
              value={actorRole}
              onChange={(event) => setActorRole(event.target.value)}
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
          <Field.Label>Actor email</Field.Label>
          <Field.Control>
            <Input
              value={query}
              placeholder="Contains…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </Field.Control>
        </Field>
        <Field>
          <Field.Label>From</Field.Label>
          <Field.Control>
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field.Control>
        </Field>
        <Field>
          <Field.Label>To</Field.Label>
          <Field.Control>
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field.Control>
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm">
            Apply filters
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void navigate({
                search: {
                  area: '',
                  actorRole: '',
                  q: '',
                  from: '',
                  to: '',
                  page: 1,
                },
              })
            }}
          >
            Clear
          </Button>
        </div>
      </form>

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-foreground-secondary text-sm">
            {data.total} events · page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => {
                void navigate({
                  search: { ...search, page: page - 1 },
                })
                void router.invalidate()
              }}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => {
                void navigate({
                  search: { ...search, page: page + 1 },
                })
                void router.invalidate()
              }}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
