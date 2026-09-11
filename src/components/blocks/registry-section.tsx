import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { reserveRegistryItem } from '@/lib/registry/registry'
import type {
  PublicRegistryAccount,
  PublicRegistryData,
  PublicRegistryItem,
} from '@/lib/registry/registry'
import { REGISTRY_ITEM_STATUS_LABELS } from '@/lib/registry/schema'
import { cn } from '@/lib/utils'

function GiftItemCard({
  item,
  onUpdated,
}: {
  item: PublicRegistryItem
  onUpdated: (next: PublicRegistryItem) => void
}) {
  const [guestName, setGuestName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [isReserving, setIsReserving] = useState(false)
  const canReserve =
    item.status !== 'purchased' && item.remaining_qty > 0

  const onReserve = async () => {
    setIsReserving(true)
    try {
      const next = await reserveRegistryItem({
        data: {
          itemId: item.id,
          guestName: guestName.trim() || null,
          quantity,
        },
      })
      onUpdated(next)
      toast.success(
        next.remaining_qty === 0
          ? 'Reserved. Thank you — this gift is now fully claimed.'
          : 'Reserved. Thank you!',
      )
      setGuestName('')
      setQuantity(1)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to reserve this gift.',
      )
    } finally {
      setIsReserving(false)
    }
  }

  return (
    <article className="border-border space-y-4 border-b py-8 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <h3 className="font-serif text-2xl italic md:text-3xl">{item.title}</h3>
          {item.description ? (
            <p className="text-foreground-secondary mt-3 text-sm leading-relaxed md:text-base">
              {item.description}
            </p>
          ) : null}
          <p className="text-foreground-secondary mt-3 text-xs tracking-[0.14em] uppercase">
            {REGISTRY_ITEM_STATUS_LABELS[item.status]}
            {item.price_label ? ` · ${item.price_label}` : ''}
            {` · ${item.claimed_qty}/${item.desired_qty} claimed`}
          </p>
        </div>
        <a
          href={item.store_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground text-xs tracking-[0.14em] uppercase underline-offset-4 transition hover:underline"
        >
          Open gift link
        </a>
      </div>

      {canReserve ? (
        <div className="flex max-w-lg flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-left text-sm">
            <span className="text-foreground-secondary mb-1.5 block text-xs tracking-[0.12em] uppercase">
              Your name (optional)
            </span>
            <Input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="So we know who reserved it"
            />
          </label>
          <label className="w-24 text-left text-sm">
            <span className="text-foreground-secondary mb-1.5 block text-xs tracking-[0.12em] uppercase">
              Qty
            </span>
            <Input
              type="number"
              min={1}
              max={item.remaining_qty}
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  Math.max(
                    1,
                    Math.min(
                      item.remaining_qty,
                      Number(event.target.value) || 1,
                    ),
                  ),
                )
              }
            />
          </label>
          <Button
            type="button"
            size="sm"
            isLoading={isReserving}
            onClick={() => void onReserve()}
          >
            Reserve
          </Button>
        </div>
      ) : (
        <p className="text-foreground-secondary text-sm">
          This gift is fully reserved or marked purchased. You can still open
          the gift link if the couple shared a store wishlist.
        </p>
      )}
    </article>
  )
}

function AccountCard({ account }: { account: PublicRegistryAccount }) {
  return (
    <article className="border-border space-y-2 border-b py-6 last:border-b-0">
      <p className="public-kicker">{account.label}</p>
      {account.bank_name ? (
        <p className="font-serif text-2xl italic">{account.bank_name}</p>
      ) : null}
      <p className="text-foreground-secondary text-sm">
        {account.currency} · {account.account_name}
      </p>
      <p className="font-mono text-sm tracking-wide">{account.account_number}</p>
      {account.routing_number ? (
        <p className="text-foreground-secondary text-sm">
          Routing / sort code: {account.routing_number}
        </p>
      ) : null}
      {account.notes ? (
        <p className="text-foreground-secondary mt-2 text-sm leading-relaxed">
          {account.notes}
        </p>
      ) : null}
    </article>
  )
}

export function RegistrySection({
  initial,
}: {
  initial: PublicRegistryData
}) {
  const [items, setItems] = useState(initial.items)
  const accounts = initial.accounts

  if (!initial.hasContent) return null

  return (
    <section
      id="registry"
      className="public-section border-border scroll-mt-28 border-t px-6 sm:scroll-mt-24"
    >
      <div className="public-reveal mx-auto max-w-3xl">
        <div className="mb-10 text-center md:mb-14">
          <p className="public-kicker mb-4">Registry</p>
          <h2 className="public-section-title">With love</h2>
          <p className="text-foreground-secondary mx-auto mt-5 max-w-xl text-base leading-relaxed">
            Your presence is the gift. If you would like to contribute, you can
            reserve a gift idea or send a cash gift using the details below.
            Store links should be buy-as-gift or gift-card links whenever
            possible.
          </p>
        </div>

        {items.length > 0 ? (
          <div className={cn(accounts.length > 0 && 'mb-12')}>
            <p className="public-kicker mb-2">Gift ideas</p>
            {items.map((item) => (
              <GiftItemCard
                key={item.id}
                item={item}
                onUpdated={(next) => {
                  setItems((current) =>
                    current.map((row) => (row.id === next.id ? next : row)),
                  )
                }}
              />
            ))}
          </div>
        ) : null}

        {accounts.length > 0 ? (
          <div>
            <p className="public-kicker mb-2">Cash gifts</p>
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
