import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { FunnelIcon, InfoIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ContributionAuditDrawer } from '@/components/admin/contribution-audit'
import { RecordAmazonPurchaseDrawer } from '@/components/admin/record-amazon-purchase'
import { AccountForm, GiftItemForm } from '@/components/admin/registry-forms'
import { AmountRangeSlider } from '@/components/ui/amount-range-slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SideDrawer } from '@/components/ui/side-drawer'
import { TablePagination } from '@/components/ui/table-pagination'
import { toast } from '@/components/ui/toaster'
import { adminQueryKeys, registryQueryOptions } from '@/lib/query/admin-queries'
import { CONTRIBUTION_STATUS_LABELS } from '@/lib/registry/contribution-schema'
import {
  deleteRegistryAccount,
  deleteRegistryItem,
} from '@/lib/registry/registry'
import type {
  AdminContribution,
  RegistryAdminData,
} from '@/lib/registry/registry'
import { REGISTRY_ITEM_STATUS_LABELS } from '@/lib/registry/schema'
import type {
  RegistryAccount,
  RegistryContributionStatus,
} from '@/lib/supabase/types'
import { paginateItems, parsePage, parsePageSize } from '@/lib/pagination'
import { cn } from '@/lib/utils'

type TabId = 'gifts' | 'accounts' | 'transfers'
type GiftStatusFilter = 'all' | keyof typeof REGISTRY_ITEM_STATUS_LABELS
type TransferStatusFilter = 'all' | RegistryContributionStatus

const GIFT_STATUS_OPTIONS = Object.keys(
  REGISTRY_ITEM_STATUS_LABELS,
) as Array<keyof typeof REGISTRY_ITEM_STATUS_LABELS>

const TRANSFER_STATUS_OPTIONS = Object.keys(
  CONTRIBUTION_STATUS_LABELS,
) as RegistryContributionStatus[]

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseGiftStatus(value: unknown): GiftStatusFilter {
  if (
    typeof value === 'string' &&
    (GIFT_STATUS_OPTIONS as readonly string[]).includes(value)
  ) {
    return value as GiftStatusFilter
  }
  return 'all'
}

function parseTransferStatus(value: unknown): TransferStatusFilter {
  if (
    typeof value === 'string' &&
    (TRANSFER_STATUS_OPTIONS as readonly string[]).includes(value)
  ) {
    return value as TransferStatusFilter
  }
  return 'all'
}

function dateKey(value: string) {
  return value.slice(0, 10)
}

export const Route = createFileRoute('/admin/registry')({
  validateSearch: (search: Record<string, unknown>) => {
    const tab: TabId =
      search.tab === 'accounts' || search.tab === 'transfers'
        ? search.tab
        : 'gifts'
    return {
      tab,
      page: parsePage(search.page),
      pageSize: parsePageSize(search.pageSize),
      q: typeof search.q === 'string' ? search.q : '',
      giftStatus: parseGiftStatus(search.giftStatus),
      transferStatus: parseTransferStatus(search.transferStatus),
      amountMin: parseOptionalNumber(search.amountMin),
      amountMax: parseOptionalNumber(search.amountMax),
      from: typeof search.from === 'string' ? search.from : '',
      to: typeof search.to === 'string' ? search.to : '',
    }
  },
  beforeLoad: ({ context }) => {
    if (!context.session?.wedding) {
      throw redirect({ to: '/admin/onboarding' })
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(registryQueryOptions()),
  component: AdminRegistryPage,
})

type AdminGift = RegistryAdminData['items'][number]

function AdminRegistryPage() {
  const initial = Route.useLoaderData()
  const routeSearch = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const { data = initial } = useQuery(registryQueryOptions())
  const tab: TabId = routeSearch.tab
  const items = data.items
  const accounts = data.accounts
  const reservations = data.reservations
  const contributions = data.contributions
  const filterDetailsRef = useRef<HTMLDetailsElement>(null)

  const amountBounds = useMemo(() => {
    if (contributions.length === 0) {
      return { min: 0, max: 0, currency: 'USD' }
    }
    const values = contributions.map((row) => row.amount_base)
    const min = Math.floor(Math.min(...values))
    const max = Math.ceil(Math.max(...values))
    return {
      min,
      max: Math.max(max, min),
      currency: contributions[0]?.base_currency ?? 'USD',
    }
  }, [contributions])

  const [draftGiftStatus, setDraftGiftStatus] = useState(
    routeSearch.giftStatus,
  )
  const [draftTransferStatus, setDraftTransferStatus] = useState(
    routeSearch.transferStatus,
  )
  const [draftFrom, setDraftFrom] = useState(routeSearch.from)
  const [draftTo, setDraftTo] = useState(routeSearch.to)
  const [draftAmountMin, setDraftAmountMin] = useState(
    routeSearch.amountMin ?? amountBounds.min,
  )
  const [draftAmountMax, setDraftAmountMax] = useState(
    routeSearch.amountMax ?? amountBounds.max,
  )

  useEffect(() => {
    setDraftGiftStatus(routeSearch.giftStatus)
    setDraftTransferStatus(routeSearch.transferStatus)
    setDraftFrom(routeSearch.from)
    setDraftTo(routeSearch.to)
    setDraftAmountMin(routeSearch.amountMin ?? amountBounds.min)
    setDraftAmountMax(routeSearch.amountMax ?? amountBounds.max)
  }, [
    amountBounds.max,
    amountBounds.min,
    routeSearch.amountMax,
    routeSearch.amountMin,
    routeSearch.from,
    routeSearch.giftStatus,
    routeSearch.to,
    routeSearch.transferStatus,
  ])

  const filteredGifts = useMemo(() => {
    const query = routeSearch.q.trim().toLowerCase()
    return items.filter((item) => {
      if (
        routeSearch.giftStatus !== 'all' &&
        item.status !== routeSearch.giftStatus
      ) {
        return false
      }
      if (!query) return true
      const haystack = [
        item.title,
        item.description ?? '',
        item.store_url ?? '',
        REGISTRY_ITEM_STATUS_LABELS[item.status],
        ...item.prices.map((price) => `${price.amount} ${price.currency}`),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [items, routeSearch.giftStatus, routeSearch.q])

  const filteredContributions = useMemo(() => {
    const query = routeSearch.q.trim().toLowerCase()
    return contributions.filter((row) => {
      if (
        routeSearch.transferStatus !== 'all' &&
        row.status !== routeSearch.transferStatus
      ) {
        return false
      }
      if (
        routeSearch.amountMin != null &&
        row.amount_base < routeSearch.amountMin
      ) {
        return false
      }
      if (
        routeSearch.amountMax != null &&
        row.amount_base > routeSearch.amountMax
      ) {
        return false
      }
      const created = dateKey(row.created_at)
      if (routeSearch.from && created < routeSearch.from) return false
      if (routeSearch.to && created > routeSearch.to) return false
      if (!query) return true
      const haystack = [
        row.payer_name,
        row.payer_email,
        row.payer_phone ?? '',
        row.gift_title ?? 'Direct donation',
        row.bank?.reference ?? '',
        CONTRIBUTION_STATUS_LABELS[row.status],
        `${row.amount} ${row.currency}`,
        `${row.amount_base} ${row.base_currency}`,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [
    contributions,
    routeSearch.amountMax,
    routeSearch.amountMin,
    routeSearch.from,
    routeSearch.q,
    routeSearch.to,
    routeSearch.transferStatus,
  ])

  const pagedItems = paginateItems(
    filteredGifts,
    routeSearch.page,
    routeSearch.pageSize,
  )
  const pagedContributions = paginateItems(
    filteredContributions,
    routeSearch.page,
    routeSearch.pageSize,
  )
  const currentTotal =
    tab === 'gifts'
      ? filteredGifts.length
      : tab === 'transfers'
        ? filteredContributions.length
        : 0
  const currentPageCount = Math.max(
    1,
    Math.ceil(currentTotal / routeSearch.pageSize),
  )

  useEffect(() => {
    if (tab === 'accounts' || routeSearch.page <= currentPageCount) return
    void navigate({
      replace: true,
      search: (previous) => ({ ...previous, page: currentPageCount }),
    })
  }, [currentPageCount, navigate, routeSearch.page, tab])

  const [itemDrawerOpen, setItemDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AdminGift | null>(null)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [isDeletingItem, setIsDeletingItem] = useState(false)

  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<RegistryAccount | null>(
    null,
  )
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  const [transferDrawerOpen, setTransferDrawerOpen] = useState(false)
  const [editingTransfer, setEditingTransfer] =
    useState<AdminContribution | null>(null)
  const [amazonDrawerOpen, setAmazonDrawerOpen] = useState(false)

  const reservationCountByItem = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of reservations) {
      map.set(row.item_id, (map.get(row.item_id) ?? 0) + row.quantity)
    }
    return map
  }, [reservations])

  const enabledAccountCurrencies = useMemo(() => {
    return [
      ...new Set(
        accounts
          .filter((account) => account.is_enabled)
          .map((account) => account.currency.toUpperCase()),
      ),
    ]
  }, [accounts])

  const activeFilterCount =
    tab === 'gifts'
      ? routeSearch.giftStatus !== 'all'
        ? 1
        : 0
      : tab === 'transfers'
        ? (routeSearch.transferStatus !== 'all' ? 1 : 0) +
          (routeSearch.from ? 1 : 0) +
          (routeSearch.to ? 1 : 0) +
          (routeSearch.amountMin != null || routeSearch.amountMax != null
            ? 1
            : 0)
        : 0

  const applyFilters = () => {
    if (tab === 'gifts') {
      void navigate({
        replace: true,
        search: (previous) => ({
          ...previous,
          giftStatus: draftGiftStatus,
          page: 1,
        }),
      })
    } else if (tab === 'transfers') {
      const amountMin =
        draftAmountMin <= amountBounds.min ? null : draftAmountMin
      const amountMax =
        draftAmountMax >= amountBounds.max ? null : draftAmountMax
      void navigate({
        replace: true,
        search: (previous) => ({
          ...previous,
          transferStatus: draftTransferStatus,
          from: draftFrom,
          to: draftTo,
          amountMin,
          amountMax,
          page: 1,
        }),
      })
    }
    filterDetailsRef.current?.removeAttribute('open')
  }

  const clearFilters = () => {
    setDraftGiftStatus('all')
    setDraftTransferStatus('all')
    setDraftFrom('')
    setDraftTo('')
    setDraftAmountMin(amountBounds.min)
    setDraftAmountMax(amountBounds.max)
    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        giftStatus: 'all',
        transferStatus: 'all',
        from: '',
        to: '',
        amountMin: null,
        amountMax: null,
        page: 1,
      }),
    })
    filterDetailsRef.current?.removeAttribute('open')
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.registry })
  }

  const openCreateItem = () => {
    setEditingItem(null)
    setItemDrawerOpen(true)
  }

  const openEditItem = (item: AdminGift) => {
    setEditingItem(item)
    setItemDrawerOpen(true)
  }

  const openCreateAccount = () => {
    setEditingAccount(null)
    setAccountDrawerOpen(true)
  }

  const openEditAccount = (account: RegistryAccount) => {
    setEditingAccount(account)
    setAccountDrawerOpen(true)
  }

  const openTransfer = (row: AdminContribution) => {
    setEditingTransfer(row)
    setTransferDrawerOpen(true)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="admin-page-title">Registry</h1>
          <p className="text-foreground-secondary mt-2 max-w-2xl text-sm leading-relaxed">
            Add gifts with one price, share bank accounts in the currencies you
            accept, and audit guest transfers. Guests convert with a live rate
            locked per payment. No card payments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === 'gifts' ? (
            <Button type="button" size="sm" onClick={openCreateItem}>
              <PlusIcon />
              Add gift
            </Button>
          ) : null}
          {tab === 'accounts' ? (
            <Button type="button" size="sm" onClick={openCreateAccount}>
              <PlusIcon />
              Add account
            </Button>
          ) : null}
          {tab === 'transfers' ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setAmazonDrawerOpen(true)}
            >
              <PlusIcon />
              Record Amazon
            </Button>
          ) : null}
        </div>
      </div>

      <div className="bg-surface border-border flex w-full items-start gap-3 rounded-xl border p-4 text-sm">
        <InfoIcon className="text-foreground-secondary mt-0.5 size-4 shrink-0" />
        <p className="text-foreground-secondary leading-relaxed">
          Guests contribute by bank transfer. After they confirm they sent the
          money, audit it here: edit the amount if needed, then mark Received or
          Not received.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['gifts', 'Gift items'],
            ['accounts', 'Cash accounts'],
            ['transfers', 'Transfers'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              void navigate({
                search: (previous) => ({
                  ...previous,
                  tab: id,
                  page: 1,
                }),
              })
            }
            className={cn(
              'rounded-lg px-3 py-2 text-sm transition',
              tab === id
                ? 'bg-foreground text-background'
                : 'bg-surface text-foreground-secondary border-border border',
            )}
          >
            {label}
            {id === 'transfers' && contributions.length > 0
              ? ` (${contributions.length})`
              : ''}
          </button>
        ))}
      </div>

      {tab === 'gifts' || tab === 'transfers' ? (
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
            <div className="border-border bg-surface absolute top-full right-0 z-20 mt-2 w-80 space-y-3 rounded-xl border p-4 shadow-lg">
              {tab === 'gifts' ? (
                <Field>
                  <Field.Label>Status</Field.Label>
                  <Field.Control>
                    <Select
                      value={draftGiftStatus}
                      onChange={(event) =>
                        setDraftGiftStatus(
                          event.target.value as GiftStatusFilter,
                        )
                      }
                    >
                      <option value="all">All statuses</option>
                      {GIFT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {REGISTRY_ITEM_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </Select>
                  </Field.Control>
                </Field>
              ) : (
                <>
                  <Field>
                    <Field.Label>Status</Field.Label>
                    <Field.Control>
                      <Select
                        value={draftTransferStatus}
                        onChange={(event) =>
                          setDraftTransferStatus(
                            event.target.value as TransferStatusFilter,
                          )
                        }
                      >
                        <option value="all">All statuses</option>
                        {TRANSFER_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {CONTRIBUTION_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </Select>
                    </Field.Control>
                  </Field>
                  <Field>
                    <Field.Label>
                      Amount ({amountBounds.currency} base)
                    </Field.Label>
                    <Field.Control>
                      <AmountRangeSlider
                        min={amountBounds.min}
                        max={amountBounds.max}
                        valueMin={draftAmountMin}
                        valueMax={draftAmountMax}
                        currencyLabel={amountBounds.currency}
                        onChange={({ min, max }) => {
                          setDraftAmountMin(min)
                          setDraftAmountMax(max)
                        }}
                      />
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
                </>
              )}
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
            placeholder={
              tab === 'gifts'
                ? 'Search title, link, status'
                : 'Search payer, gift, reference'
            }
            aria-label={tab === 'gifts' ? 'Search gifts' : 'Search transfers'}
          />
        </div>
      ) : null}

      {tab === 'gifts' ? (
        items.length === 0 ? (
          <p className="text-foreground-secondary text-sm">
            No gifts yet. Add one with a single price.
          </p>
        ) : filteredGifts.length === 0 ? (
          <p className="text-foreground-secondary text-sm">
            No gifts match these filters.
          </p>
        ) : (
          <ul className="space-y-3">
            {pagedItems.map((item) => (
              <li
                key={item.id}
                className="bg-surface border-border flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-foreground-secondary mt-1 text-sm">
                    {REGISTRY_ITEM_STATUS_LABELS[item.status]} · claimed{' '}
                    {item.claimed_qty}/{item.desired_qty}
                    {reservationCountByItem.get(item.id)
                      ? ` · ${reservationCountByItem.get(item.id)} reserved via site`
                      : ''}
                    {item.is_visible ? '' : ' · hidden'}
                  </p>
                  {item.prices.length > 0 ? (
                    <p className="text-foreground-secondary mt-1 text-sm">
                      {item.prices
                        .map((price) => `${price.amount} ${price.currency}`)
                        .join(' · ')}
                    </p>
                  ) : null}
                  {item.store_url ? (
                    <a
                      href={item.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground mt-2 inline-block text-xs underline-offset-4 hover:underline"
                    >
                      {item.store_url}
                    </a>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEditItem(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteItemId(item.id)}
                  >
                    <TrashIcon />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'accounts' ? (
        accounts.length === 0 ? (
          <p className="text-foreground-secondary text-sm">
            No cash accounts yet. Add one or more bank details for guests.
          </p>
        ) : (
          <ul className="space-y-3">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="bg-surface border-border flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{account.label}</p>
                  <p className="text-foreground-secondary mt-1 text-sm">
                    {account.currency}
                    {account.bank_name ? ` · ${account.bank_name}` : ''} ·{' '}
                    {account.account_name}
                    {account.is_enabled ? '' : ' · hidden'}
                  </p>
                  <p className="mt-1 font-mono text-sm">
                    {account.account_number}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEditAccount(account)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteAccountId(account.id)}
                  >
                    <TrashIcon />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'transfers' ? (
        contributions.length === 0 ? (
          <p className="text-foreground-secondary text-sm">
            No transfers yet. They appear when a guest starts a contribution on
            the public registry.
          </p>
        ) : filteredContributions.length === 0 ? (
          <p className="text-foreground-secondary text-sm">
            No transfers match these filters.
          </p>
        ) : (
          <ul className="space-y-3">
            {pagedContributions.map((row) => (
              <li
                key={row.id}
                className="bg-surface border-border flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {row.amount} {row.currency}
                    {row.currency !== row.base_currency
                      ? ` (${row.amount_base} ${row.base_currency})`
                      : ''}{' '}
                    · {row.payer_name}
                  </p>
                  <p className="text-foreground-secondary mt-1 text-sm">
                    {CONTRIBUTION_STATUS_LABELS[row.status]}
                    {row.channel === 'external_store'
                      ? ` · ${row.provider ?? 'store'}`
                      : row.applied_at
                        ? ' · guest confirmed'
                        : ' · awaiting confirm'}
                    {' · '}
                    {row.gift_title ?? 'Direct donation'}
                    {row.bank?.reference ? ` · ${row.bank.reference}` : ''}
                  </p>
                  <p className="text-foreground-secondary mt-1 text-xs">
                    {row.payer_email}
                    {row.payer_phone ? ` · ${row.payer_phone}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openTransfer(row)}
                >
                  Audit
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab !== 'accounts' && currentTotal > 0 ? (
        <TablePagination
          page={routeSearch.page}
          pageSize={routeSearch.pageSize}
          totalRows={currentTotal}
          itemLabel={tab === 'gifts' ? 'gifts' : 'transfers'}
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
      ) : null}

      <SideDrawer open={itemDrawerOpen} onOpenChange={setItemDrawerOpen}>
        {itemDrawerOpen ? (
          <GiftItemForm
            key={editingItem?.id ?? 'new'}
            item={editingItem}
            accountCurrencies={enabledAccountCurrencies}
            onClose={() => setItemDrawerOpen(false)}
            onSaved={async () => {
              setItemDrawerOpen(false)
              await refresh()
            }}
          />
        ) : null}
      </SideDrawer>

      <SideDrawer open={accountDrawerOpen} onOpenChange={setAccountDrawerOpen}>
        {accountDrawerOpen ? (
          <AccountForm
            key={editingAccount?.id ?? 'new'}
            account={editingAccount}
            onClose={() => setAccountDrawerOpen(false)}
            onSaved={async () => {
              setAccountDrawerOpen(false)
              await refresh()
            }}
          />
        ) : null}
      </SideDrawer>

      <SideDrawer
        open={transferDrawerOpen}
        onOpenChange={(open) => {
          setTransferDrawerOpen(open)
          if (!open) setEditingTransfer(null)
        }}
      >
        {transferDrawerOpen && editingTransfer ? (
          <ContributionAuditDrawer
            key={editingTransfer.id}
            contribution={editingTransfer}
            thankYouTemplate={data.thankYouTemplate}
            coupleLabel={data.coupleLabel}
            onClose={() => {
              setTransferDrawerOpen(false)
              setEditingTransfer(null)
            }}
            onSaved={async (row) => {
              setEditingTransfer(row)
              await refresh()
            }}
          />
        ) : null}
      </SideDrawer>

      <SideDrawer open={amazonDrawerOpen} onOpenChange={setAmazonDrawerOpen}>
        {amazonDrawerOpen ? (
          <RecordAmazonPurchaseDrawer
            gifts={items}
            onClose={() => setAmazonDrawerOpen(false)}
            onSaved={async () => {
              setAmazonDrawerOpen(false)
              await refresh()
            }}
          />
        ) : null}
      </SideDrawer>

      <ConfirmDialog
        open={Boolean(deleteItemId)}
        onOpenChange={(open) => {
          if (!open) setDeleteItemId(null)
        }}
        title="Delete gift item?"
        description="Removes this gift and its reservation history from the registry."
        confirmLabel="Delete"
        tone="destructive"
        isConfirming={isDeletingItem}
        onConfirm={() => {
          if (!deleteItemId) return
          void (async () => {
            setIsDeletingItem(true)
            try {
              await deleteRegistryItem({ data: { itemId: deleteItemId } })
              toast.success('Gift item deleted.')
              setDeleteItemId(null)
              await refresh()
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : 'Unable to delete gift item.',
              )
            } finally {
              setIsDeletingItem(false)
            }
          })()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteAccountId)}
        onOpenChange={(open) => {
          if (!open) setDeleteAccountId(null)
        }}
        title="Delete bank account?"
        description="Guests will no longer see these bank details on the registry."
        confirmLabel="Delete"
        tone="destructive"
        isConfirming={isDeletingAccount}
        onConfirm={() => {
          if (!deleteAccountId) return
          void (async () => {
            setIsDeletingAccount(true)
            try {
              await deleteRegistryAccount({
                data: { accountId: deleteAccountId },
              })
              toast.success('Bank account deleted.')
              setDeleteAccountId(null)
              await refresh()
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : 'Unable to delete bank account.',
              )
            } finally {
              setIsDeletingAccount(false)
            }
          })()
        }}
      />
    </div>
  )
}
