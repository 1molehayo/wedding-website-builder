import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { InfoIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { AccountForm, GiftItemForm } from '@/components/admin/registry-forms'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SideDrawer } from '@/components/ui/side-drawer'
import { toast } from '@/components/ui/toaster'
import {
  deleteRegistryAccount,
  deleteRegistryItem,
  listRegistryAdmin,
} from '@/lib/registry/registry'
import type { RegistryAdminData } from '@/lib/registry/registry'
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

type TabId = 'gifts' | 'accounts'

type AdminGift = RegistryAdminData['items'][number]

function AdminRegistryPage() {
  const initial = Route.useLoaderData()
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('gifts')
  const [items, setItems] = useState(initial.items)
  const [accounts, setAccounts] = useState(initial.accounts)
  const [reservations, setReservations] = useState(initial.reservations)

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

  useEffect(() => {
    setItems(initial.items)
    setAccounts(initial.accounts)
    setReservations(initial.reservations)
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="admin-page-title">Registry</h1>
          <p className="text-foreground-secondary mt-2 max-w-2xl text-sm leading-relaxed">
            Add gifts with a price in each currency you accept, and share bank
            details for cash gifts. No card payments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === 'gifts' ? (
            <Button type="button" size="sm" onClick={openCreateItem}>
              <PlusIcon />
              Add gift
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={openCreateAccount}>
              <PlusIcon />
              Add account
            </Button>
          )}
        </div>
      </div>

      <div className="bg-surface border-border flex w-full items-start gap-3 rounded-xl border p-4 text-sm">
        <InfoIcon className="text-foreground-secondary mt-0.5 size-4 shrink-0" />
        <p className="text-foreground-secondary leading-relaxed">
          A gift needs a price in at least one currency. The product link and
          photo are optional. After someone reserves a gift, update the claimed
          quantity here.
        </p>
      </div>

      <div className="flex gap-2">
        {(
          [
            ['gifts', 'Gift items'],
            ['accounts', 'Cash accounts'],
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
          </button>
        ))}
      </div>

      {tab === 'gifts' ? (
        items.length === 0 ? (
          <p className="text-foreground-secondary text-sm">
            No gifts yet. Add one with a price in at least one currency.
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
      ) : accounts.length === 0 ? (
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
      )}

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
