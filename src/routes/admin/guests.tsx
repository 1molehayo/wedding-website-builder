import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { Route as AdminRoute } from './route'
import {
  CopySimpleIcon,
  EnvelopeSimpleIcon,
  LinkSimpleIcon,
  LockOpenIcon,
  PlusIcon,
  WhatsappLogoIcon,
} from '@phosphor-icons/react'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useMemo, useState  } from 'react'
import type {ReactNode} from 'react';
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { fieldErrorMessage } from '@/lib/forms/field-error'
import { zodFormFieldErrors } from '@/lib/forms/zod-form-errors'
import { formatCoupleNames } from '@/lib/constants'
import {
  createGuest,
  deleteGuest,
  listGuests,
  sendGuestInvite,
  sendGuestInvitesBulk,
  unlockGuestRsvp,
  updateGuest,
} from '@/lib/guests/guests'
import type { GuestConflictMatch } from '@/lib/guests/guests'
import {
  guestFormSchema,
  guestFullName,
  toGuestFormValues,
} from '@/lib/guests/schema'
import type { GuestFormValues } from '@/lib/guests/schema'
import { whatsappRsvpShareUrl } from '@/lib/guests/whatsapp'
import { updateGuestRsvp } from '@/lib/rsvp/rsvp'
import {
  RSVP_STATUS_LABELS,
  RSVP_STATUSES,
  adminRsvpFormSchema,
  maxAttendingForPlusOnes,
  rsvpStatusBadgeVariant,
  toAdminRsvpFormValues,
} from '@/lib/rsvp/schema'
import type { AdminRsvpFormValues } from '@/lib/rsvp/schema'
import type { Guest } from '@/lib/supabase/types'
import { internalError, raiseRouteError, shouldRethrowRouteFailure } from '@/lib/errors/route-error'

export const Route = createFileRoute('/admin/guests')({
  beforeLoad: ({ context }) => {
    if (!context.session?.wedding) {
      throw redirect({ to: '/admin/onboarding' })
    }
  },
  loader: async () => {
    try {
      return await listGuests()
    } catch (cause) {
      if (shouldRethrowRouteFailure(cause)) {
        throw cause
      }
      throw raiseRouteError(
        internalError({
          message: 'Failed to load guests for /admin/guests',
          cause,
        }),
        { source: 'server', pathname: '/admin/guests' },
      )
    }
  },
  component: AdminGuestsPage,
})

const emptyGuestForm: GuestFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  partyName: '',
  plusOnes: 0,
  notes: '',
}

const emptyRsvpForm: AdminRsvpFormValues = {
  status: 'pending',
  attendingCount: 0,
  dietaryNotes: '',
  message: '',
}

function guestRsvpPath(token: string) {
  return `/rsvp/${token}`
}

function guestAdminDisplayName(guest: Guest) {
  const name = guestFullName(guest)
  return guest.admin_label ? `${name} (${guest.admin_label})` : name
}

function useGuestDrawerForms(
  guest: Guest | null,
  isCreating: boolean,
  onSubmit: (
    value: GuestFormValues,
    rsvpValues: AdminRsvpFormValues,
  ) => Promise<void>,
) {
  const rsvpForm = useForm({
    defaultValues:
      guest && !isCreating ? toAdminRsvpFormValues(guest) : emptyRsvpForm,
  })
  const form = useForm({
    defaultValues: guest ? toGuestFormValues(guest) : emptyGuestForm,
    validators: {
      onSubmit: ({ value }) => {
        const parsed = guestFormSchema.safeParse(value)
        if (parsed.success) return undefined
        return zodFormFieldErrors(parsed.error)
      },
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value, rsvpForm.state.values)
    },
  })

  return { form, rsvpForm }
}

function GuestDrawerForms({
  guest,
  isCreating,
  onSubmit,
  children,
}: {
  guest: Guest | null
  isCreating: boolean
  onSubmit: (
    value: GuestFormValues,
    rsvpValues: AdminRsvpFormValues,
  ) => Promise<void>
  children: (ctx: ReturnType<typeof useGuestDrawerForms>) => ReactNode
}) {
  return children(useGuestDrawerForms(guest, isCreating, onSubmit))
}

function AdminGuestsPage() {
  const initialGuests = Route.useLoaderData()
  const { session } = AdminRoute.useRouteContext()
  const router = useRouter()
  const coupleLabel =
    session?.wedding
      ? formatCoupleNames(
          session.wedding.groom_name,
          session.wedding.bride_name,
        )
      : 'us'
  const [guests, setGuests] = useState<Guest[]>(initialGuests)
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: false },
  ])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isEmailing, setIsEmailing] = useState(false)
  const [isBulkEmailing, setIsBulkEmailing] = useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [resendConfirmGuest, setResendConfirmGuest] = useState<Guest | null>(
    null,
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [adminLabelDraft, setAdminLabelDraft] = useState('')
  const [conflictMatches, setConflictMatches] = useState<GuestConflictMatch[]>(
    [],
  )
  const [conflictOpen, setConflictOpen] = useState(false)
  const [conflictNeedsLabels, setConflictNeedsLabels] = useState(false)
  const [newAdminLabel, setNewAdminLabel] = useState('')
  const [existingLabels, setExistingLabels] = useState<Record<string, string>>(
    {},
  )
  const [pendingPayload, setPendingPayload] = useState<Record<
    string,
    unknown
  > | null>(null)

  const selectedGuest = useMemo(
    () => guests.find((guest) => guest.id === selectedId) ?? null,
    [guests, selectedId],
  )

  const openNameConflict = (
    payload: Record<string, unknown>,
    matches: GuestConflictMatch[],
  ) => {
    setPendingPayload(payload)
    setConflictMatches(matches)
    setConflictNeedsLabels(false)
    setNewAdminLabel(adminLabelDraft.trim())
    setExistingLabels(
      Object.fromEntries(
        matches.map((match) => [match.id, match.admin_label ?? '']),
      ),
    )
    setConflictOpen(true)
  }

  const saveGuestRecord = async (
    value: GuestFormValues,
    rsvpValues: AdminRsvpFormValues,
  ): Promise<{ status: 'saved'; guest: Guest } | { status: 'conflict' }> => {
    const parsed = guestFormSchema.parse(value)
    const payload = {
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      email: parsed.email,
      phone: parsed.phone ?? '',
      party_name: parsed.partyName ?? '',
      plus_ones: parsed.plusOnes,
      notes: parsed.notes ?? '',
      admin_label: adminLabelDraft.trim() || null,
    }

    if (isCreating) {
      const result = await createGuest({ data: payload })
      if (result.status === 'conflict') {
        openNameConflict(payload, result.matches)
        return { status: 'conflict' }
      }
      return { status: 'saved', guest: result.guest }
    }

    if (!selectedGuest) {
      throw new Error('Select a guest to save.')
    }

    const maxAttending = maxAttendingForPlusOnes(parsed.plusOnes)
    const rsvpNormalized = {
      ...rsvpValues,
      attendingCount:
        rsvpValues.status === 'attending' ? rsvpValues.attendingCount : 0,
    }
    const rsvpParsed = adminRsvpFormSchema.safeParse(rsvpNormalized)
    if (!rsvpParsed.success) {
      throw new Error(
        rsvpParsed.error.issues[0]?.message ?? 'Invalid RSVP details.',
      )
    }
    if (
      rsvpParsed.data.status === 'attending' &&
      rsvpParsed.data.attendingCount > maxAttending
    ) {
      throw new Error(
        `Attending count cannot exceed ${maxAttending} for this guest.`,
      )
    }

    const result = await updateGuest({
      data: { guestId: selectedGuest.id, ...payload },
    })
    if (result.status === 'conflict') {
      openNameConflict(
        { guestId: selectedGuest.id, ...payload },
        result.matches,
      )
      return { status: 'conflict' }
    }

    const updatedRsvp = await updateGuestRsvp({
      data: {
        guestId: selectedGuest.id,
        status: rsvpParsed.data.status,
        attending_count: rsvpParsed.data.attendingCount,
        dietary_notes: rsvpParsed.data.dietaryNotes,
        rsvp_message: rsvpParsed.data.message,
      },
    })

    return { status: 'saved', guest: updatedRsvp }
  }

  const applySavedGuest = (guest: Guest) => {
    setGuests((current) => {
      const index = current.findIndex((item) => item.id === guest.id)
      if (index === -1) return [...current, guest]
      return current.map((item) => (item.id === guest.id ? guest : item))
    })
    setSelectedId(guest.id)
    setIsCreating(false)
    setAdminLabelDraft(guest.admin_label ?? '')
    setDrawerOpen(true)
  }

  const resolveConflictAsDifferentPeople = async () => {
    if (!pendingPayload) return
    const newLabel = newAdminLabel.trim()
    if (!newLabel) {
      toast.error('Add a label for the guest you’re saving.')
      return
    }
    const existingLabelList = conflictMatches.map((match) => ({
      guestId: match.id,
      adminLabel: (existingLabels[match.id] ?? '').trim(),
    }))
    if (existingLabelList.some((item) => !item.adminLabel)) {
      toast.error('Add a label for each existing matching guest.')
      return
    }

    setIsSaving(true)
    try {
      const conflictResolution = {
        newAdminLabel: newLabel,
        existingLabels: existingLabelList,
      }
      if (isCreating) {
        const result = await createGuest({
          data: { ...pendingPayload, conflictResolution },
        })
        if (result.status === 'conflict') {
          toast.error('Still conflicting. Check labels and try again.')
          return
        }
        applySavedGuest(result.guest)
        toast.success('Guest added with distinguishing labels.')
      } else {
        const guestId = String(pendingPayload.guestId ?? '')
        const result = await updateGuest({
          data: {
            ...pendingPayload,
            guestId,
            conflictResolution,
          },
        })
        if (result.status === 'conflict') {
          toast.error('Still conflicting. Check labels and try again.')
          return
        }
        applySavedGuest(result.guest)
        toast.success('Guest updated with distinguishing labels.')
      }
      setConflictOpen(false)
      setPendingPayload(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to save guest.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const openCreate = () => {
    setIsCreating(true)
    setSelectedId(null)
    setAdminLabelDraft('')
    setDrawerOpen(true)
  }

  const openEdit = (guest: Guest) => {
    setIsCreating(false)
    setSelectedId(guest.id)
    setAdminLabelDraft(guest.admin_label ?? '')
    setDrawerOpen(true)
  }

  const copyRsvpLink = async (guest: Guest) => {
    const url = `${window.location.origin}${guestRsvpPath(guest.rsvp_token)}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('RSVP link copied.')
    } catch {
      toast.error('Could not copy link.')
    }
  }

  const shareWhatsApp = (guest: Guest) => {
    const url = whatsappRsvpShareUrl({
      phone: guest.phone ?? '',
      guestFirstName: guest.first_name,
      coupleLabel,
      rsvpUrl: `${window.location.origin}${guestRsvpPath(guest.rsvp_token)}`,
    })
    if (!url) {
      toast.error('Add a valid phone number before sharing on WhatsApp.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const unlockGuestForUpdate = async (guest: Guest) => {
    setIsUnlocking(true)
    try {
      const updated = await unlockGuestRsvp({ data: { guestId: guest.id } })
      setGuests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      toast.success('Guest can update their RSVP again.')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to unlock RSVP.',
      )
    } finally {
      setIsUnlocking(false)
    }
  }

  const openExistingConflictMatch = () => {
    if (conflictMatches.length === 0) return
    const match = conflictMatches[0]
    const guest = guests.find((item) => item.id === match.id)
    setConflictOpen(false)
    setPendingPayload(null)
    setConflictNeedsLabels(false)
    if (guest) {
      openEdit(guest)
      toast.message('Opened the matching guest instead of creating a duplicate.')
      return
    }
    toast.message('Use the matching guest already on your list.')
    setDrawerOpen(false)
    setIsCreating(false)
  }

  const emailGuestInvite = async (guest: Guest) => {
    if (!guest.email?.trim()) {
      toast.error('Add an email address before sending an invite.')
      return
    }
    setIsEmailing(true)
    try {
      const result = await sendGuestInvite({ data: { guestId: guest.id } })
      toast.success(
        result.includedPhotos
          ? `Invite emailed to ${result.email} (includes photo link).`
          : `Invite emailed to ${result.email}.`,
      )
      setGuests((current) =>
        current.map((item) =>
          item.id === guest.id
            ? { ...item, invite_emailed_at: new Date().toISOString() }
            : item,
        ),
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to send invite email.',
      )
    } finally {
      setIsEmailing(false)
      setResendConfirmGuest(null)
    }
  }

  const emailPendingInvites = async () => {
    setIsBulkEmailing(true)
    try {
      const result = await sendGuestInvitesBulk({
        data: { onlyPending: true },
      })
      if (result.sent === 0 && result.failed.length === 0) {
        toast.message(
          result.skipped > 0
            ? 'No pending guests with email addresses to invite.'
            : 'No pending guests to invite.',
        )
      } else if (result.failed.length === 0) {
        toast.success(
          `Sent ${result.sent} invite${result.sent === 1 ? '' : 's'}${
            result.skipped
              ? ` · ${result.skipped} skipped (no email)`
              : ''
          }.`,
        )
      } else {
        const failedSample = result.failed
          .slice(0, 3)
          .map((item) => item.email)
          .join(', ')
        toast.error(
          `Sent ${result.sent}, failed ${result.failed.length}${
            result.skipped ? `, skipped ${result.skipped}` : ''
          }.${failedSample ? ` Failed: ${failedSample}` : ''}`,
        )
      }
      await router.invalidate()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to send invite emails.',
      )
    } finally {
      setIsBulkEmailing(false)
      setBulkConfirmOpen(false)
    }
  }

  const requestEmailGuestInvite = (guest: Guest) => {
    if (!guest.email?.trim()) {
      toast.error('Add an email address before sending an invite.')
      return
    }
    if (guest.invite_emailed_at) {
      setResendConfirmGuest(guest)
      return
    }
    void emailGuestInvite(guest)
  }

  const emailInviteFromDrawer = async (
    values: GuestFormValues,
    submit: () => Promise<void>,
    rsvpValues: AdminRsvpFormValues,
  ) => {
    const parsed = guestFormSchema.safeParse(values)
    if (!parsed.success) {
      await submit()
      return
    }

    setIsSaving(true)
    try {
      const result = await saveGuestRecord(values, rsvpValues)
      if (result.status === 'conflict') return
      applySavedGuest(result.guest)
      requestEmailGuestInvite(result.guest)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to save guest.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const columns = useMemo<ColumnDef<Guest>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => guestFullName(row),
        header: 'Name',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">
              {guestAdminDisplayName(row.original)}
            </p>
            {row.original.party_name ? (
              <p className="text-foreground-secondary truncate text-sm">
                {row.original.party_name}
              </p>
            ) : null}
          </div>
        ),
        meta: { minWidth: 180 },
      },
      {
        id: 'email',
        accessorFn: (row) => row.email ?? '',
        header: 'Email',
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="text-foreground-secondary text-sm">
              {row.original.email ?? '—'}
            </span>
            {row.original.invite_emailed_at ? (
              <p className="text-foreground-secondary mt-0.5 text-2xs">
                Emailed{' '}
                {new Date(row.original.invite_emailed_at).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        ),
        meta: { minWidth: 160 },
      },
      {
        id: 'rsvp',
        accessorFn: (row) => row.rsvp_status,
        header: 'RSVP',
        cell: ({ row }) => (
          <Badge
            variant={rsvpStatusBadgeVariant(row.original.rsvp_status)}
            size="sm"
          >
            {RSVP_STATUS_LABELS[row.original.rsvp_status]}
          </Badge>
        ),
        meta: { minWidth: 120 },
      },
      {
        id: 'plusOnes',
        accessorFn: (row) => row.plus_ones,
        header: 'Plus-ones',
        cell: ({ row }) => row.original.plus_ones,
        meta: { minWidth: 100 },
      },
      {
        id: 'actions',
        enableSorting: false,
        header: '',
        cell: ({ row }) => {
          const guest = row.original
          const items: DropdownMenuItem[] = [
            {
              id: 'view',
              label: 'View',
              onSelect: () => openEdit(guest),
            },
            {
              id: 'email',
              label: guest.invite_emailed_at ? 'Email again' : 'Email invite',
              icon: <EnvelopeSimpleIcon />,
              onSelect: () => requestEmailGuestInvite(guest),
            },
            {
              id: 'whatsapp',
              label: 'WhatsApp',
              icon: <WhatsappLogoIcon />,
              onSelect: () => shareWhatsApp(guest),
            },
            {
              id: 'link',
              label: 'Copy RSVP link',
              icon: <LinkSimpleIcon />,
              onSelect: () => void copyRsvpLink(guest),
            },
          ]
          return (
            <div className="flex justify-end">
              <DropdownMenu label="Guest actions" items={items} />
            </div>
          )
        },
        meta: { minWidth: 64, className: 'w-16' },
      },
    ],
    [coupleLabel, isEmailing],
  )

  const table = useReactTable({
    data: guests,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).trim().toLowerCase()
      if (!query) return true
      const guest = row.original
      const haystack = [
        guestFullName(guest),
        guest.admin_label ?? '',
        guest.email ?? '',
        guest.phone ?? '',
        guest.party_name ?? '',
        guest.notes ?? '',
        RSVP_STATUS_LABELS[guest.rsvp_status],
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    },
  })

  const onDelete = async () => {
    if (!selectedGuest) return
    setIsDeleting(true)
    try {
      await deleteGuest({ data: { guestId: selectedGuest.id } })
      toast.success('Guest removed.')
      setDeleteOpen(false)
      setDrawerOpen(false)
      setSelectedId(null)
      setGuests((current) =>
        current.filter((item) => item.id !== selectedGuest.id),
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to remove guest.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const attendingSummary = guests.reduce(
    (sum, guest) =>
      guest.rsvp_status === 'attending' ? sum + (guest.attending_count ?? 0) : sum,
    0,
  )
  const pendingCount = guests.filter((g) => g.rsvp_status === 'pending').length

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="admin-page-title">Guests</h1>
          <p className="text-foreground-secondary mt-2 text-sm">
            Manage the guest list, email invites, share via WhatsApp, or copy
            private RSVP links.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <PlusIcon />
          Add guest
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <OverviewCard label="Guests" value={guests.length} />
        <OverviewCard label="Attending" value={attendingSummary} />
        <OverviewCard label="Pending" value={pendingCount}>
          <Button
            className="mt-3"
            type="button"
            size="sm"
            variant="outline"
            disabled={isBulkEmailing || pendingCount === 0}
            isLoading={isBulkEmailing}
            onClick={() => setBulkConfirmOpen(true)}
          >
            <EnvelopeSimpleIcon />
            Email invites
          </Button>
        </OverviewCard>
      </div>

      <div className="space-y-3">
        <div className="flex justify-end">
          <Input
            size="sm"
            className="w-full max-w-xs"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, RSVP"
            aria-label="Search guests"
          />
        </div>

        <TableView
          table={table}
          emptyMessage="No guests yet. Add your first guest to get started."
          onRowClick={openEdit}
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
        {drawerOpen ? (
          <GuestDrawerForms
            key={isCreating ? 'new' : selectedId ?? 'edit'}
            guest={isCreating ? null : selectedGuest}
            isCreating={isCreating}
            onSubmit={async (value, rsvpValues) => {
              setIsSaving(true)
              try {
                const result = await saveGuestRecord(value, rsvpValues)
                if (result.status === 'conflict') return
                applySavedGuest(result.guest)
                toast.success(isCreating ? 'Guest added.' : 'Guest updated.')
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : 'Unable to save guest.',
                )
              } finally {
                setIsSaving(false)
              }
            }}
          >
            {({ form, rsvpForm }) => (
              <>
        <SideDrawer.Header
          title={
            isCreating
              ? 'Add guest'
              : selectedGuest
                ? guestAdminDisplayName(selectedGuest)
                : 'Guest'
          }
          drawerDescription="Guest details"
        />
          <form
            id="guest-form"
            className="flex min-h-0 flex-1 flex-col"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void form.handleSubmit()
            }}
          >
        <SideDrawer.Content>
          <div className="space-y-4">
            <form.Subscribe selector={(state) => state.submissionAttempts > 0}>
              {(submitted) => (
                <>
                  <div className="grid items-start gap-4 sm:grid-cols-2">
                    <form.Field name="firstName">
                      {(field) => {
                        const error = fieldErrorMessage(field.state.meta.errors)
                        const invalid =
                          !!error && (field.state.meta.isTouched || submitted)
                        return (
                          <Field invalid={invalid}>
                            <Field.Label required>First name</Field.Label>
                            <Field.Control>
                              <Input
                                value={field.state.value}
                                invalid={invalid}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                              />
                            </Field.Control>
                            <Field.Error>{invalid ? error : null}</Field.Error>
                          </Field>
                        )
                      }}
                    </form.Field>
                    <form.Field name="lastName">
                      {(field) => {
                        const error = fieldErrorMessage(field.state.meta.errors)
                        const invalid =
                          !!error && (field.state.meta.isTouched || submitted)
                        return (
                          <Field invalid={invalid}>
                            <Field.Label required>Last name</Field.Label>
                            <Field.Control>
                              <Input
                                value={field.state.value}
                                invalid={invalid}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                              />
                            </Field.Control>
                            <Field.Error>{invalid ? error : null}</Field.Error>
                          </Field>
                        )
                      }}
                    </form.Field>
                  </div>

                  <form.Field name="email">
                    {(field) => {
                      const error = fieldErrorMessage(field.state.meta.errors)
                      const invalid =
                        !!error && (field.state.meta.isTouched || submitted)
                      return (
                        <Field invalid={invalid}>
                          <Field.Label required>Email</Field.Label>
                          <Field.Control>
                            <Input
                              type="email"
                              value={field.state.value}
                              invalid={invalid}
                              onBlur={field.handleBlur}
                              onChange={(event) =>
                                field.handleChange(event.target.value)
                              }
                            />
                          </Field.Control>
                          <Field.Error>{invalid ? error : null}</Field.Error>
                        </Field>
                      )
                    }}
                  </form.Field>

                  <form.Field name="phone">
                    {(field) => {
                      const error = fieldErrorMessage(field.state.meta.errors)
                      const invalid =
                        !!error && (field.state.meta.isTouched || submitted)
                      return (
                        <Field invalid={invalid}>
                          <Field.Label>Phone</Field.Label>
                          <Field.Control>
                            <Input
                              value={field.state.value}
                              invalid={invalid}
                              onBlur={field.handleBlur}
                              onChange={(event) =>
                                field.handleChange(event.target.value)
                              }
                            />
                          </Field.Control>
                          <Field.Error>{invalid ? error : null}</Field.Error>
                        </Field>
                      )
                    }}
                  </form.Field>

                  <form.Field name="partyName">
                    {(field) => (
                      <Field>
                        <Field.Label>Party / household</Field.Label>
                        <Field.Control>
                          <Input
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder="Optional group label"
                          />
                        </Field.Control>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="plusOnes">
                    {(field) => {
                      const error = fieldErrorMessage(field.state.meta.errors)
                      const invalid =
                        !!error && (field.state.meta.isTouched || submitted)
                      return (
                        <Field invalid={invalid}>
                          <Field.Label>Plus-ones</Field.Label>
                          <Field.Control>
                            <Input
                              type="number"
                              min={0}
                              max={20}
                              value={String(field.state.value)}
                              invalid={invalid}
                              onBlur={field.handleBlur}
                              onChange={(event) =>
                                field.handleChange(
                                  Number(event.target.value || 0),
                                )
                              }
                            />
                          </Field.Control>
                          {invalid ? <Field.Error>{error}</Field.Error> : null}
                        </Field>
                      )
                    }}
                  </form.Field>

                  <form.Field name="notes">
                    {(field) => (
                      <Field>
                        <Field.Label>Notes</Field.Label>
                        <Field.Control>
                          <Textarea
                            rows={4}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />
                        </Field.Control>
                      </Field>
                    )}
                  </form.Field>

                  <Field>
                    <Field.Label>Admin label</Field.Label>
                    <Field.Control>
                      <Input
                        value={adminLabelDraft}
                        placeholder="Optional. Only you see this"
                        onChange={(event) =>
                          setAdminLabelDraft(event.target.value)
                        }
                      />
                    </Field.Control>
                    <p className="text-foreground-secondary mt-1 text-xs">
                      Helps tell apart guests with the same name. Never shown to
                      guests.
                    </p>
                  </Field>
                </>
              )}
            </form.Subscribe>

            <div className="border-border space-y-4 border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
                      Invite
                    </p>
                    {selectedGuest?.invite_emailed_at ? (
                      <p className="text-foreground-secondary mt-1 text-xs">
                        Last emailed{' '}
                        {new Date(
                          selectedGuest.invite_emailed_at,
                        ).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-foreground-secondary mt-1 text-xs">
                        Invite not emailed yet
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      isLoading={isEmailing || isSaving}
                      onClick={() =>
                        void emailInviteFromDrawer(
                          form.state.values,
                          async () => {
                            await form.handleSubmit()
                          },
                          rsvpForm.state.values,
                        )
                      }
                    >
                      <EnvelopeSimpleIcon />
                      {selectedGuest?.invite_emailed_at
                        ? 'Email again'
                        : 'Email invite'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!selectedGuest) {
                          toast.error(
                            'Save the guest before sharing on WhatsApp.',
                          )
                          return
                        }
                        shareWhatsApp(selectedGuest)
                      }}
                    >
                      <WhatsappLogoIcon />
                      WhatsApp
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!selectedGuest) {
                          toast.error('Save the guest before copying the RSVP link.')
                          return
                        }
                        void copyRsvpLink(selectedGuest)
                      }}
                    >
                      <CopySimpleIcon />
                      Copy link
                    </Button>
                  </div>
                </div>
            </div>

            {!isCreating && selectedGuest ? (
              <div className="border-border space-y-4 border-t pt-4">
                <div className="min-w-0">
                  <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
                    RSVP
                  </p>
                </div>

                {!selectedGuest.allow_rsvp_update &&
                selectedGuest.rsvp_status !== 'pending' ? (
                  <div className="border-border bg-background flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3">
                    <p className="text-foreground-secondary text-sm">
                      This guest already responded. Their RSVP page is locked
                      until you unlock it.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      isLoading={isUnlocking}
                      onClick={() => void unlockGuestForUpdate(selectedGuest)}
                    >
                      <LockOpenIcon />
                      Unlock for update
                    </Button>
                  </div>
                ) : null}

                <rsvpForm.Field name="status">
                  {(field) => (
                    <Field>
                      <Field.Label>Status</Field.Label>
                      <Field.Control>
                        <Select
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            const next = event.target
                              .value as AdminRsvpFormValues['status']
                            field.handleChange(next)
                            if (next !== 'attending') {
                              rsvpForm.setFieldValue('attendingCount', 0)
                            } else if (
                              rsvpForm.getFieldValue('attendingCount') < 1
                            ) {
                              rsvpForm.setFieldValue('attendingCount', 1)
                            }
                          }}
                        >
                          {RSVP_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {RSVP_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </Select>
                      </Field.Control>
                    </Field>
                  )}
                </rsvpForm.Field>

                <rsvpForm.Subscribe selector={(state) => state.values.status}>
                  {(status) =>
                    status === 'attending' ? (
                      <rsvpForm.Field name="attendingCount">
                        {(field) => (
                          <Field>
                            <Field.Label>Number attending</Field.Label>
                            <Field.Control>
                              <Input
                                type="number"
                                min={1}
                                max={maxAttendingForPlusOnes(
                                  selectedGuest.plus_ones,
                                )}
                                value={String(field.state.value)}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                  field.handleChange(
                                    Number(event.target.value || 0),
                                  )
                                }
                              />
                            </Field.Control>
                          </Field>
                        )}
                      </rsvpForm.Field>
                    ) : null
                  }
                </rsvpForm.Subscribe>

                <rsvpForm.Field name="dietaryNotes">
                  {(field) => (
                    <Field>
                      <Field.Label>Dietary notes</Field.Label>
                      <Field.Control>
                        <Textarea
                          rows={3}
                          value={field.state.value ?? ''}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                        />
                      </Field.Control>
                    </Field>
                  )}
                </rsvpForm.Field>

                <rsvpForm.Field name="message">
                  {(field) => (
                    <Field>
                      <Field.Label>Guest message</Field.Label>
                      <Field.Control>
                        <Textarea
                          rows={3}
                          value={field.state.value ?? ''}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                        />
                      </Field.Control>
                    </Field>
                  )}
                </rsvpForm.Field>
              </div>
            ) : null}
          </div>
        </SideDrawer.Content>
        <SideDrawer.Footer className="justify-between">
          {!isCreating && selectedGuest ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Remove
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="sm" isLoading={isSaving}>
            {isCreating ? 'Add guest' : 'Save changes'}
          </Button>
        </SideDrawer.Footer>
          </form>
              </>
            )}
          </GuestDrawerForms>
        ) : null}
      </SideDrawer>

      <ConfirmDialog
        open={deleteOpen}
        title="Remove this guest?"
        description="They will be removed from the guest list. This cannot be undone."
        confirmLabel="Remove"
        tone="destructive"
        isConfirming={isDeleting}
        onOpenChange={setDeleteOpen}
        onConfirm={onDelete}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Email pending guests?"
        description="Sends a themed RSVP invite to every pending guest who has an email address. Guests already emailed are included again. Guests without email are skipped. Private photo links are included when the guest is in a share group."
        confirmLabel="Send emails"
        isConfirming={isBulkEmailing}
        onOpenChange={setBulkConfirmOpen}
        onConfirm={() => void emailPendingInvites()}
      />

      <ConfirmDialog
        open={Boolean(resendConfirmGuest)}
        title="Send invite again?"
        description={
          resendConfirmGuest?.invite_emailed_at
            ? `This guest was already emailed on ${new Date(resendConfirmGuest.invite_emailed_at).toLocaleString()}. Send another themed invite to ${resendConfirmGuest.email}?`
            : 'Send another themed invite to this guest?'
        }
        confirmLabel="Send again"
        isConfirming={isEmailing}
        onOpenChange={(open) => {
          if (!open) setResendConfirmGuest(null)
        }}
        onConfirm={() => {
          if (resendConfirmGuest) void emailGuestInvite(resendConfirmGuest)
        }}
      />

      <ConfirmDialog
        open={conflictOpen}
        title="Possible duplicate guest"
        description="We found an existing guest that looks similar by name, email, or phone. Choose whether this is the same person or different people."
        confirmLabel={
          conflictNeedsLabels ? 'Save with labels' : 'These are different people'
        }
        cancelLabel="Cancel"
        isConfirming={isSaving}
        onOpenChange={(open) => {
          setConflictOpen(open)
          if (!open) {
            setPendingPayload(null)
            setConflictNeedsLabels(false)
          }
        }}
        onConfirm={() => {
          if (!conflictNeedsLabels) {
            setConflictNeedsLabels(true)
            return
          }
          void resolveConflictAsDifferentPeople()
        }}
      >
        <ul className="space-y-2 text-sm">
          {conflictMatches.map((match) => (
            <li
              key={match.id}
              className="border-border rounded-lg border px-3 py-2"
            >
              <p className="font-medium">
                {match.admin_label
                  ? `${guestFullName(match)} (${match.admin_label})`
                  : guestFullName(match)}
              </p>
              <p className="text-foreground-secondary mt-1 text-xs">
                Match on {match.reasons.join(', ')}
                {match.email ? ` · ${match.email}` : ''}
                {match.phone ? ` · ${match.phone}` : ''}
              </p>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          disabled={isSaving}
          onClick={openExistingConflictMatch}
        >
          It’s the same person. Open existing
        </Button>

        {conflictNeedsLabels ? (
          <div className="space-y-3">
            <Field>
              <Field.Label required>
                Label for {isCreating ? 'new guest' : 'this guest'}
              </Field.Label>
              <Field.Control>
                <Input
                  value={newAdminLabel}
                  placeholder="e.g. Cousin on groom’s side"
                  onChange={(event) => setNewAdminLabel(event.target.value)}
                />
              </Field.Control>
            </Field>
            {conflictMatches.map((match) => (
              <Field key={match.id}>
                <Field.Label required>
                  Label for {guestFullName(match)}
                </Field.Label>
                <Field.Control>
                  <Input
                    value={existingLabels[match.id] ?? ''}
                    placeholder="e.g. College friend"
                    onChange={(event) =>
                      setExistingLabels((current) => ({
                        ...current,
                        [match.id]: event.target.value,
                      }))
                    }
                  />
                </Field.Control>
              </Field>
            ))}
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}
