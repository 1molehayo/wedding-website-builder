import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { InfoIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SideDrawer } from '@/components/ui/side-drawer'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import {
  createRegistryAccount,
  createRegistryItem,
  deleteRegistryAccount,
  deleteRegistryItem,
  listRegistryAdmin,
  updateRegistryAccount,
  updateRegistryItem,
} from '@/lib/registry/registry'
import { REGISTRY_ITEM_STATUS_LABELS } from '@/lib/registry/schema'
import type { RegistryAccount, RegistryItem } from '@/lib/supabase/types'
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

type ItemDraft = {
  title: string
  description: string
  store_url: string
  price_label: string
  desired_qty: string
  claimed_qty: string
  status: RegistryItem['status']
  is_visible: boolean
}

type AccountDraft = {
  label: string
  bank_name: string
  currency: string
  account_name: string
  account_number: string
  routing_number: string
  notes: string
  is_enabled: boolean
}

const emptyItemDraft = (): ItemDraft => ({
  title: '',
  description: '',
  store_url: '',
  price_label: '',
  desired_qty: '1',
  claimed_qty: '0',
  status: 'available',
  is_visible: true,
})

const emptyAccountDraft = (): AccountDraft => ({
  label: '',
  bank_name: '',
  currency: 'USD',
  account_name: '',
  account_number: '',
  routing_number: '',
  notes: '',
  is_enabled: true,
})

function itemToDraft(item: RegistryItem): ItemDraft {
  return {
    title: item.title,
    description: item.description ?? '',
    store_url: item.store_url,
    price_label: item.price_label ?? '',
    desired_qty: String(item.desired_qty),
    claimed_qty: String(item.claimed_qty),
    status: item.status,
    is_visible: item.is_visible,
  }
}

function accountToDraft(account: RegistryAccount): AccountDraft {
  return {
    label: account.label,
    bank_name: account.bank_name ?? '',
    currency: account.currency,
    account_name: account.account_name,
    account_number: account.account_number,
    routing_number: account.routing_number ?? '',
    notes: account.notes ?? '',
    is_enabled: account.is_enabled,
  }
}

function AdminRegistryPage() {
  const initial = Route.useLoaderData()
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('gifts')
  const [items, setItems] = useState(initial.items)
  const [accounts, setAccounts] = useState(initial.accounts)
  const [reservations, setReservations] = useState(initial.reservations)

  const [itemDrawerOpen, setItemDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RegistryItem | null>(null)
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyItemDraft)
  const [isSavingItem, setIsSavingItem] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [isDeletingItem, setIsDeletingItem] = useState(false)

  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<RegistryAccount | null>(
    null,
  )
  const [accountDraft, setAccountDraft] =
    useState<AccountDraft>(emptyAccountDraft)
  const [isSavingAccount, setIsSavingAccount] = useState(false)
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
    setItemDraft(emptyItemDraft())
    setItemDrawerOpen(true)
  }

  const openEditItem = (item: RegistryItem) => {
    setEditingItem(item)
    setItemDraft(itemToDraft(item))
    setItemDrawerOpen(true)
  }

  const saveItem = async () => {
    setIsSavingItem(true)
    try {
      const payload = {
        title: itemDraft.title,
        description: itemDraft.description,
        store_url: itemDraft.store_url,
        price_label: itemDraft.price_label,
        desired_qty: Number(itemDraft.desired_qty),
        claimed_qty: Number(itemDraft.claimed_qty),
        status: itemDraft.status,
        is_visible: itemDraft.is_visible,
      }
      if (editingItem) {
        await updateRegistryItem({
          data: { itemId: editingItem.id, ...payload },
        })
        toast.success('Gift item updated.')
      } else {
        await createRegistryItem({ data: payload })
        toast.success('Gift item added.')
      }
      setItemDrawerOpen(false)
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to save gift item.',
      )
    } finally {
      setIsSavingItem(false)
    }
  }

  const openCreateAccount = () => {
    setEditingAccount(null)
    setAccountDraft(emptyAccountDraft())
    setAccountDrawerOpen(true)
  }

  const openEditAccount = (account: RegistryAccount) => {
    setEditingAccount(account)
    setAccountDraft(accountToDraft(account))
    setAccountDrawerOpen(true)
  }

  const saveAccount = async () => {
    setIsSavingAccount(true)
    try {
      const payload = {
        label: accountDraft.label,
        bank_name: accountDraft.bank_name,
        currency: accountDraft.currency,
        account_name: accountDraft.account_name,
        account_number: accountDraft.account_number,
        routing_number: accountDraft.routing_number,
        notes: accountDraft.notes,
        is_enabled: accountDraft.is_enabled,
      }
      if (editingAccount) {
        await updateRegistryAccount({
          data: { accountId: editingAccount.id, ...payload },
        })
        toast.success('Bank account updated.')
      } else {
        await createRegistryAccount({ data: payload })
        toast.success('Bank account added.')
      }
      setAccountDrawerOpen(false)
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to save bank account.',
      )
    } finally {
      setIsSavingAccount(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl italic">Registry</h1>
          <p className="text-foreground-secondary mt-2 max-w-2xl text-sm leading-relaxed">
            Add buy-as-gift or gift-card store links, manage quantities manually,
            and share bank details for cash gifts. No card payments and no
            Amazon auto-sync.
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

      <div className="bg-surface border-border flex w-full max-w-2xl items-start gap-3 rounded-xl border p-4 text-sm">
        <InfoIcon className="text-foreground-secondary mt-0.5 size-4 shrink-0" />
        <p className="text-foreground-secondary leading-relaxed">
          Use a store&apos;s <strong className="text-foreground">buy as gift</strong>{' '}
          or <strong className="text-foreground">gift card</strong> link whenever
          possible so guests are not asked for your shipping address. After
          someone buys externally, update claimed quantity or mark purchased
          here.
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
            No gift items yet. Add a store link to get started.
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
                  <a
                    href={item.store_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground mt-2 inline-block text-xs underline-offset-4 hover:underline"
                  >
                    {item.store_url}
                  </a>
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
                <p className="mt-1 font-mono text-sm">{account.account_number}</p>
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
        <SideDrawer.Header
          title={editingItem ? 'Edit gift item' : 'Add gift item'}
        />
        <SideDrawer.Content className="space-y-4">
          <Field>
            <Field.Label>Title</Field.Label>
            <Field.Control>
              <Input
                value={itemDraft.title}
                onChange={(event) =>
                  setItemDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </Field.Control>
          </Field>
          <Field>
            <Field.Label>Description</Field.Label>
            <Field.Control>
              <Textarea
                rows={3}
                value={itemDraft.description}
                onChange={(event) =>
                  setItemDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </Field.Control>
          </Field>
          <Field>
            <Field.Label>Store / gift link</Field.Label>
            <Field.Control>
              <Input
                value={itemDraft.store_url}
                placeholder="https://"
                onChange={(event) =>
                  setItemDraft((current) => ({
                    ...current,
                    store_url: event.target.value,
                  }))
                }
              />
            </Field.Control>
            <Field.Description>
              Prefer buy-as-gift or gift-card URLs from the store.
            </Field.Description>
          </Field>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field>
              <Field.Label>Price label</Field.Label>
              <Field.Control>
                <Input
                  value={itemDraft.price_label}
                  placeholder="Optional, e.g. $120"
                  onChange={(event) =>
                    setItemDraft((current) => ({
                      ...current,
                      price_label: event.target.value,
                    }))
                  }
                />
              </Field.Control>
            </Field>
            <Field>
              <Field.Label>Status</Field.Label>
              <Field.Control>
                <Select
                  value={itemDraft.status}
                  onChange={(event) =>
                    setItemDraft((current) => ({
                      ...current,
                      status: event.target.value as RegistryItem['status'],
                    }))
                  }
                >
                  {Object.entries(REGISTRY_ITEM_STATUS_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </Select>
              </Field.Control>
            </Field>
            <Field>
              <Field.Label>Desired qty</Field.Label>
              <Field.Control>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={itemDraft.desired_qty}
                  onChange={(event) =>
                    setItemDraft((current) => ({
                      ...current,
                      desired_qty: event.target.value,
                    }))
                  }
                />
              </Field.Control>
            </Field>
            <Field>
              <Field.Label>Claimed qty</Field.Label>
              <Field.Control>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={itemDraft.claimed_qty}
                  onChange={(event) =>
                    setItemDraft((current) => ({
                      ...current,
                      claimed_qty: event.target.value,
                    }))
                  }
                />
              </Field.Control>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={itemDraft.is_visible}
              onChange={(event) =>
                setItemDraft((current) => ({
                  ...current,
                  is_visible: event.target.checked,
                }))
              }
            />
            Visible on public registry
          </label>
        </SideDrawer.Content>
        <SideDrawer.Footer>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setItemDrawerOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            isLoading={isSavingItem}
            onClick={() => void saveItem()}
          >
            {editingItem ? 'Save gift' : 'Add gift'}
          </Button>
        </SideDrawer.Footer>
      </SideDrawer>

      <SideDrawer
        open={accountDrawerOpen}
        onOpenChange={setAccountDrawerOpen}
      >
        <SideDrawer.Header
          title={editingAccount ? 'Edit bank account' : 'Add bank account'}
        />
        <SideDrawer.Content className="space-y-4">
          <Field>
            <Field.Label>Display label</Field.Label>
            <Field.Control>
              <Input
                value={accountDraft.label}
                placeholder="e.g. NGN account"
                onChange={(event) =>
                  setAccountDraft((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
              />
            </Field.Control>
          </Field>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field>
              <Field.Label>Bank name</Field.Label>
              <Field.Control>
                <Input
                  value={accountDraft.bank_name}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      bank_name: event.target.value,
                    }))
                  }
                />
              </Field.Control>
            </Field>
            <Field>
              <Field.Label>Currency</Field.Label>
              <Field.Control>
                <Input
                  value={accountDraft.currency}
                  onChange={(event) =>
                    setAccountDraft((current) => ({
                      ...current,
                      currency: event.target.value,
                    }))
                  }
                />
              </Field.Control>
            </Field>
          </div>
          <Field>
            <Field.Label>Account name</Field.Label>
            <Field.Control>
              <Input
                value={accountDraft.account_name}
                onChange={(event) =>
                  setAccountDraft((current) => ({
                    ...current,
                    account_name: event.target.value,
                  }))
                }
              />
            </Field.Control>
          </Field>
          <Field>
            <Field.Label>Account number</Field.Label>
            <Field.Control>
              <Input
                value={accountDraft.account_number}
                onChange={(event) =>
                  setAccountDraft((current) => ({
                    ...current,
                    account_number: event.target.value,
                  }))
                }
              />
            </Field.Control>
          </Field>
          <Field>
            <Field.Label>Routing / sort code / IBAN note</Field.Label>
            <Field.Control>
              <Input
                value={accountDraft.routing_number}
                onChange={(event) =>
                  setAccountDraft((current) => ({
                    ...current,
                    routing_number: event.target.value,
                  }))
                }
              />
            </Field.Control>
          </Field>
          <Field>
            <Field.Label>Notes for guests</Field.Label>
            <Field.Control>
              <Textarea
                rows={3}
                value={accountDraft.notes}
                onChange={(event) =>
                  setAccountDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </Field.Control>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={accountDraft.is_enabled}
              onChange={(event) =>
                setAccountDraft((current) => ({
                  ...current,
                  is_enabled: event.target.checked,
                }))
              }
            />
            Visible on public registry
          </label>
        </SideDrawer.Content>
        <SideDrawer.Footer>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAccountDrawerOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            isLoading={isSavingAccount}
            onClick={() => void saveAccount()}
          >
            {editingAccount ? 'Save account' : 'Add account'}
          </Button>
        </SideDrawer.Footer>
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
