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
import { useEffect, useMemo, useRef, useState } from 'react'
import { FunnelIcon, UserPlusIcon } from '@phosphor-icons/react'
import { OverviewCard } from '@/components/admin/overview-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import type { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SideDrawer } from '@/components/ui/side-drawer'
import { TableView } from '@/components/ui/table-view'
import { TablePagination } from '@/components/ui/table-pagination'
import { toast } from '@/components/ui/toaster'
import {
  cancelAdminInvite,
  inviteAdmin,
  reinviteAdmin,
  removeAdmin,
  resendAdminInvite,
  updateAdminNames,
} from '@/lib/auth/admins'
import { adminQueryKeys, adminsQueryOptions } from '@/lib/query/admin-queries'
import type { AdminListItem } from '@/lib/auth/admins'
import { isSuperAdminProfile } from '@/lib/auth/roles'
import {
  ADMIN_STATUS_LABELS,
  DEFAULT_VISIBLE_ADMIN_STATUSES,
  adminFullName,
} from '@/lib/auth/types'
import type { AdminAccountStatus } from '@/lib/auth/types'
import {
  internalError,
  raiseRouteError,
  shouldRethrowRouteFailure,
} from '@/lib/errors/route-error'
import { parsePage, parsePageSize } from '@/lib/pagination'

type AdminStatusFilter = 'all' | AdminAccountStatus

function parseAdminStatusFilter(value: unknown): AdminStatusFilter {
  if (
    typeof value === 'string' &&
    (Object.keys(ADMIN_STATUS_LABELS)).includes(value)
  ) {
    return value as AdminAccountStatus
  }
  return 'all'
}

export const Route = createFileRoute('/admin/admins')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q.slice(0, 120) : '',
    status: parseAdminStatusFilter(search.status),
    page: parsePage(search.page),
    pageSize: parsePageSize(search.pageSize),
  }),
  beforeLoad: ({ context }) => {
    // Soft gate — redirect instead of RouteError so a preload race never
    // flashes the full-page “Something went wrong” UI.
    if (!context.session || !isSuperAdminProfile(context.session.profile)) {
      throw redirect({ to: '/admin' })
    }
  },
  loader: async ({ context }) => {
    try {
      return await context.queryClient.ensureQueryData(adminsQueryOptions())
    } catch (cause) {
      if (shouldRethrowRouteFailure(cause)) {
        throw cause
      }
      throw raiseRouteError(
        internalError({
          message: 'Failed to load admin list for /admin/admins',
          cause,
        }),
        { source: 'server', pathname: '/admin/admins' },
      )
    }
  },
  component: AdminAdminsPage,
})

function statusBadgeVariant(
  status: AdminAccountStatus,
): 'success' | 'warning' | 'neutral' | 'error' {
  switch (status) {
    case 'active':
      return 'success'
    case 'deletion_requested':
      return 'warning'
    case 'cancelled':
      return 'error'
    case 'pending':
      return 'neutral'
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function AdminAdminsPage() {
  const initialAdmins = Route.useLoaderData()
  const routeSearch = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const { data: adminsQueryData = initialAdmins } = useQuery(
    adminsQueryOptions(),
  )
  const [admins, setAdmins] = useState<AdminListItem[]>(adminsQueryData)

  useEffect(() => {
    setAdmins(adminsQueryData)
  }, [adminsQueryData])

  const refreshAdmins = async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.admins })
  }
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: false },
  ])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [isSavingNames, setIsSavingNames] = useState(false)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  useEffect(() => {
    setAdmins(initialAdmins)
  }, [initialAdmins])

  const selectedAdmin = useMemo(
    () => admins.find((admin) => admin.id === selectedId) ?? null,
    [admins, selectedId],
  )

  const filterDetailsRef = useRef<HTMLDetailsElement>(null)
  const [draftStatus, setDraftStatus] = useState<AdminStatusFilter>(
    routeSearch.status,
  )

  useEffect(() => {
    setDraftStatus(routeSearch.status)
  }, [routeSearch.status])

  const visibleAdmins = useMemo(() => {
    if (routeSearch.status === 'all') {
      return admins.filter((admin) =>
        DEFAULT_VISIBLE_ADMIN_STATUSES.includes(admin.status),
      )
    }
    return admins.filter((admin) => admin.status === routeSearch.status)
  }, [admins, routeSearch.status])

  const applyStatusFilter = (status: AdminStatusFilter) => {
    void navigate({
      replace: true,
      search: (previous) => ({ ...previous, status, page: 1 }),
    })
  }


  const openInvite = () => {
    setIsCreating(true)
    setSelectedId(null)
    setEmail('')
    setFirstName('')
    setLastName('')
    setDrawerOpen(true)
  }

  const openDrawer = (admin: AdminListItem) => {
    setIsCreating(false)
    setSelectedId(admin.id)
    setEditFirstName(admin.first_name ?? '')
    setEditLastName(admin.last_name ?? '')
    setDrawerOpen(true)
  }

  const runAction = async (
    adminId: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setActionBusyId(adminId)
    try {
      await action()
      toast.success(successMessage)
      await refreshAdmins()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setActionBusyId(null)
    }
  }

  const menuItemsFor = (admin: AdminListItem): DropdownMenuItem[] => {
    const items: DropdownMenuItem[] = [
      {
        id: 'view',
        label: 'View',
        onSelect: () => openDrawer(admin),
      },
    ]

    if (admin.role === 'super_admin') {
      return items
    }

    if (admin.status === 'pending') {
      items.push(
        {
          id: 'resend',
          label: 'Resend invite',
          disabled: actionBusyId === admin.id,
          onSelect: () =>
            void runAction(
              admin.id,
              () => resendAdminInvite({ data: { adminId: admin.id } }),
              'Invite resent.',
            ),
        },
        {
          id: 'cancel',
          label: 'Cancel invite',
          tone: 'destructive',
          disabled: actionBusyId === admin.id,
          onSelect: () =>
            void runAction(
              admin.id,
              () => cancelAdminInvite({ data: { adminId: admin.id } }),
              'Invite cancelled.',
            ),
        },
      )
    }

    if (admin.status === 'cancelled') {
      items.push({
        id: 'reinvite',
        label: 'Send new invitation',
        disabled: actionBusyId === admin.id,
        onSelect: () =>
          void runAction(
            admin.id,
            () => reinviteAdmin({ data: { adminId: admin.id } }),
            'Invitation sent.',
          ),
      })
    }

    if (admin.status === 'active' || admin.status === 'deletion_requested') {
      items.push(
        {
          id: 'edit',
          label: 'Edit details',
          onSelect: () => openDrawer(admin),
        },
        {
          id: 'delete',
          label: 'Delete admin',
          tone: 'destructive',
          onSelect: () => {
            setSelectedId(admin.id)
            setRemoveOpen(true)
          },
        },
      )
    }

    return items
  }

  const columns = useMemo<ColumnDef<AdminListItem>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => adminFullName(row),
        header: 'Name',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">
              {adminFullName(row.original)}
            </p>
            <p className="text-foreground-secondary truncate text-sm">
              {row.original.email ?? row.original.id}
            </p>
          </div>
        ),
        meta: { minWidth: 200 },
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={statusBadgeVariant(row.original.status)} size="sm">
            {ADMIN_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
        meta: { minWidth: 140 },
      },
      {
        id: 'role',
        accessorFn: (row) => row.role,
        header: 'Role',
        cell: ({ row }) =>
          row.original.role === 'super_admin' ? (
            <Badge variant="info" size="sm">
              Super admin
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              Admin
            </Badge>
          ),
        meta: { minWidth: 120 },
      },
      {
        id: 'actions',
        enableSorting: false,
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu items={menuItemsFor(row.original)} />
          </div>
        ),
        meta: { minWidth: 64, className: 'w-16' },
      },
    ],
    [actionBusyId, admins],
  )

  const table = useReactTable({
    data: visibleAdmins,
    columns,
    state: {
      sorting,
      globalFilter: routeSearch.q,
      pagination: {
        pageIndex: routeSearch.page - 1,
        pageSize: routeSearch.pageSize,
      },
    },
    onSortingChange: (next) => {
      setSorting(next)
      void navigate({
        replace: true,
        search: (previous) => ({ ...previous, page: 1 }),
      })
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).trim().toLowerCase()
      if (!query) return true
      const admin = row.original
      const haystack = [
        adminFullName(admin),
        admin.email ?? '',
        ADMIN_STATUS_LABELS[admin.status],
        admin.role === 'super_admin' ? 'super admin' : 'admin',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    },
  })
  const filteredAdminCount = table.getFilteredRowModel().rows.length
  const adminPageCount = Math.max(
    1,
    Math.ceil(filteredAdminCount / routeSearch.pageSize),
  )

  useEffect(() => {
    if (routeSearch.page <= adminPageCount) return
    void navigate({
      replace: true,
      search: (previous) => ({ ...previous, page: adminPageCount }),
    })
  }, [adminPageCount, navigate, routeSearch.page])

  const onInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsInviting(true)
    try {
      await inviteAdmin({
        data: {
          email,
          first_name: firstName,
          last_name: lastName,
        },
      })
      setEmail('')
      setFirstName('')
      setLastName('')
      setDrawerOpen(false)
      setIsCreating(false)
      toast.success('Invite sent. They’ll get an email with an accept link.')
      await refreshAdmins()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to invite admin.',
      )
    } finally {
      setIsInviting(false)
    }
  }

  const onSaveNames = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedAdmin) return
    setIsSavingNames(true)
    try {
      await updateAdminNames({
        data: {
          adminId: selectedAdmin.id,
          first_name: editFirstName,
          last_name: editLastName,
        },
      })
      toast.success('Admin details updated.')
      await refreshAdmins()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to update admin.',
      )
    } finally {
      setIsSavingNames(false)
    }
  }

  const onRemove = async () => {
    if (!selectedAdmin) return
    setIsRemoving(true)
    try {
      await removeAdmin({ data: { adminId: selectedAdmin.id } })
      toast.success('Admin archived and removed.')
      setRemoveOpen(false)
      setDrawerOpen(false)
      setSelectedId(null)
      setIsCreating(false)
      await refreshAdmins()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to remove admin.',
      )
    } finally {
      setIsRemoving(false)
    }
  }

  const canEditNames =
    selectedAdmin &&
    selectedAdmin.role === 'admin' &&
    (selectedAdmin.status === 'active' ||
      selectedAdmin.status === 'deletion_requested' ||
      selectedAdmin.status === 'pending')

  const activeCount = admins.filter((admin) => admin.status === 'active').length
  const pendingCount = admins.filter(
    (admin) => admin.status === 'pending',
  ).length
  const deletionCount = admins.filter(
    (admin) => admin.status === 'deletion_requested',
  ).length

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="admin-page-title">Admins</h1>
          <p className="text-foreground-secondary mt-2 text-sm">
            Invite admins, resend or cancel pending invites, and review deletion
            requests. Deleted admins are archived so the email can be invited
            again.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          onClick={openInvite}
        >
          <UserPlusIcon />
          Invite admin
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          label="Admins"
          value={admins.length}
          active={routeSearch.status === 'all'}
          onClick={() => applyStatusFilter('all')}
        />
        <OverviewCard
          label="Active"
          value={activeCount}
          active={routeSearch.status === 'active'}
          onClick={() => applyStatusFilter('active')}
        />
        <OverviewCard
          label="Pending"
          value={pendingCount}
          active={routeSearch.status === 'pending'}
          onClick={() => applyStatusFilter('pending')}
        />
        <OverviewCard
          label="Deletion requested"
          value={deletionCount}
          active={routeSearch.status === 'deletion_requested'}
          onClick={() => applyStatusFilter('deletion_requested')}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap justify-end gap-2">
          <details ref={filterDetailsRef} className="relative">
            <summary className="border-border bg-surface hover:bg-background-secondary flex h-8 cursor-pointer list-none items-center gap-2 rounded-lg border px-3 text-sm font-medium transition">
              <FunnelIcon />
              Filters
              {routeSearch.status !== 'all' ? (
                <Badge size="sm" variant="info">
                  1
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
                      setDraftStatus(event.target.value as AdminStatusFilter)
                    }
                  >
                    <option value="all">All visible</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="deletion_requested">
                      Deletion requested
                    </option>
                    <option value="cancelled">Cancelled</option>
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
                    applyStatusFilter('all')
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
            placeholder="Search name, email, status"
            aria-label="Search admins"
          />
        </div>

        <TableView
          table={table}
          emptyMessage="No admins match your filters."
          onRowClick={openDrawer}
        />
        <TablePagination
          page={routeSearch.page}
          pageSize={routeSearch.pageSize}
          totalRows={filteredAdminCount}
          itemLabel="admins"
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

      <SideDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) {
            setSelectedId(null)
            setIsCreating(false)
          }
        }}
      >
        {isCreating ? (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={onInvite}>
            <SideDrawer.Header
              title="Invite admin"
              drawerDescription="Send an invite email"
            />
            <SideDrawer.Content className="space-y-4">
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <Field>
                  <Field.Label required>First name</Field.Label>
                  <Field.Control>
                    <Input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      required
                    />
                  </Field.Control>
                </Field>
                <Field>
                  <Field.Label required>Last name</Field.Label>
                  <Field.Control>
                    <Input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      required
                    />
                  </Field.Control>
                </Field>
              </div>
              <Field>
                <Field.Label required>Email</Field.Label>
                <Field.Control>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </Field.Control>
              </Field>
            </SideDrawer.Content>
            <SideDrawer.Footer>
              <Button type="submit" size="sm" isLoading={isInviting}>
                Send invite
              </Button>
            </SideDrawer.Footer>
          </form>
        ) : selectedAdmin ? (
          <>
            <SideDrawer.Header
              title={adminFullName(selectedAdmin)}
              drawerDescription="Admin account details"
            />
            <SideDrawer.Content className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusBadgeVariant(selectedAdmin.status)}>
                  {ADMIN_STATUS_LABELS[selectedAdmin.status]}
                </Badge>
                {selectedAdmin.role === 'super_admin' ? (
                  <Badge variant="info">Super admin</Badge>
                ) : (
                  <Badge variant="neutral">Admin</Badge>
                )}
              </div>

              {canEditNames ? (
                <form className="space-y-3" onSubmit={onSaveNames}>
                  <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
                    Edit details
                  </p>
                  <div className="grid items-start gap-3 sm:grid-cols-2">
                    <Field>
                      <Field.Label required>First name</Field.Label>
                      <Field.Control>
                        <Input
                          value={editFirstName}
                          onChange={(event) =>
                            setEditFirstName(event.target.value)
                          }
                          required
                        />
                      </Field.Control>
                    </Field>
                    <Field>
                      <Field.Label required>Last name</Field.Label>
                      <Field.Control>
                        <Input
                          value={editLastName}
                          onChange={(event) =>
                            setEditLastName(event.target.value)
                          }
                          required
                        />
                      </Field.Control>
                    </Field>
                  </div>
                  <Field>
                    <Field.Label>Email</Field.Label>
                    <Field.Control>
                      <Input
                        value={selectedAdmin.email ?? ''}
                        disabled
                        readOnly
                      />
                    </Field.Control>
                    <Field.Description>
                      Admin email can’t be changed. Invite a new address
                      instead.
                    </Field.Description>
                  </Field>
                  <Button type="submit" size="sm" isLoading={isSavingNames}>
                    Save name
                  </Button>
                </form>
              ) : (
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-foreground-secondary">Email</dt>
                    <dd className="mt-1 font-medium break-all">
                      {selectedAdmin.email ?? '—'}
                    </dd>
                  </div>
                </dl>
              )}

              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-foreground-secondary">Created</dt>
                  <dd className="mt-1 font-medium">
                    {formatDateTime(selectedAdmin.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-secondary">Invited</dt>
                  <dd className="mt-1 font-medium">
                    {formatDateTime(selectedAdmin.invited_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-secondary">Accepted</dt>
                  <dd className="mt-1 font-medium">
                    {formatDateTime(selectedAdmin.invite_accepted_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-secondary">Last sign-in</dt>
                  <dd className="mt-1 font-medium">
                    {formatDateTime(selectedAdmin.last_sign_in_at)}
                  </dd>
                </div>
                {selectedAdmin.deletion_requested_at ? (
                  <>
                    <div>
                      <dt className="text-foreground-secondary">
                        Deletion requested
                      </dt>
                      <dd className="mt-1 font-medium">
                        {formatDateTime(selectedAdmin.deletion_requested_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-foreground-secondary">Reason</dt>
                      <dd className="mt-1 font-medium whitespace-pre-wrap">
                        {selectedAdmin.deletion_reason?.trim() || '—'}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </SideDrawer.Content>
            {selectedAdmin.role === 'admin' &&
            (selectedAdmin.status === 'active' ||
              selectedAdmin.status === 'deletion_requested') ? (
              <SideDrawer.Footer>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setRemoveOpen(true)}
                >
                  Delete admin
                </Button>
              </SideDrawer.Footer>
            ) : null}
          </>
        ) : null}
      </SideDrawer>

      <ConfirmDialog
        open={removeOpen}
        title="Delete this admin?"
        description="They’ll lose access immediately. Their profile is archived so activity history can still resolve them later, and the email can be invited again."
        confirmLabel="Delete admin"
        tone="destructive"
        isConfirming={isRemoving}
        onOpenChange={setRemoveOpen}
        onConfirm={onRemove}
      />
    </div>
  )
}
