import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { InfoIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { ContributionAuditDrawer } from '@/components/admin/contribution-audit'
import { RecordAmazonPurchaseDrawer } from '@/components/admin/record-amazon-purchase'
import { AccountForm, GiftItemForm } from '@/components/admin/registry-forms'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SideDrawer } from '@/components/ui/side-drawer'
import { toast } from '@/components/ui/toaster'
import { CONTRIBUTION_STATUS_LABELS } from '@/lib/registry/contribution-schema'
import {
  deleteRegistryAccount,
  deleteRegistryItem,
  listRegistryAdmin,
} from '@/lib/registry/registry'
import type {
  AdminContribution,
  RegistryAdminData,
} from '@/lib/registry/registry'
import { REGISTRY_ITEM_STATUS_LABELS } from '@/lib/registry/schema'
import type { RegistryAccount } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin/registry')({
  beforeLoad: ({ context }) => {
    if (!context.session?.wedding) {
      throw redirect({ to: '/admin/onboarding' })
    }
  },
  loader: async () => listRegistryAdmin(),
  component: AdminRegistryPage,
})

type TabId = 'gifts' | 'accounts' | 'transfers'

type AdminGift = RegistryAdminData['items'][number]

function AdminRegistryPage() {
  const initial = Route.useLoaderData()
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('gifts')
  const [items, setItems] = useState(initial.items)
  const [accounts, setAccounts] = useState(initial.accounts)
  const [reservations, setReservations] = useState(initial.reservations)
  const [contributions, setContributions] = useState(initial.contributions)

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

  useEffect(() => {
    setItems(initial.items)
    setAccounts(initial.accounts)
    setReservations(initial.reservations)
    setContributions(initial.contributions)
  }, [initial])

  const reservationCountByItem = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of reservations) {
      map.set(row.item_id, (map.get(row.item_id) ?? 0) + row.quantity)
    }
    return map
  }, [reservations])

  const refresh = async () => {
    await router.invalidate()
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
            onClick={() => setTab(id)}
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

      {tab === 'gifts' ? (
        items.length === 0 ? (
          <p className="text-foreground-secondary text-sm">
            No gifts yet. Add one with a single price.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
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
        ) : (
          <ul className="space-y-3">
            {contributions.map((row) => (
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

      <SideDrawer open={itemDrawerOpen} onOpenChange={setItemDrawerOpen}>
        {itemDrawerOpen ? (
          <GiftItemForm
            key={editingItem?.id ?? 'new'}
            item={editingItem}
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
            onClose={() => {
              setTransferDrawerOpen(false)
              setEditingTransfer(null)
            }}
            onSaved={async (row) => {
              setEditingTransfer(row)
              setContributions((current) =>
                current.map((item) => (item.id === row.id ? row : item)),
              )
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
            onSaved={async (row) => {
              setAmazonDrawerOpen(false)
              setContributions((current) => [row, ...current])
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
