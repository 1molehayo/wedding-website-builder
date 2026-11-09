import { useForm } from '@tanstack/react-form'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { PhoneField } from '@/components/phone-field'
import { Button } from '@/components/ui/button'
import { CurrencyAmountField } from '@/components/ui/currency-amount-field'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SideDrawer } from '@/components/ui/side-drawer'
import { toast } from '@/components/ui/toaster'
import { fieldErrorMessage } from '@/lib/forms/field-error'
import { zodFormFieldErrors } from '@/lib/forms/zod-form-errors'
import {
  emptyStartContributionForm,
  startContributionFormSchema,
} from '@/lib/registry/contribution-schema'
import {
  quoteContributionFx,
  startBankContribution,
} from '@/lib/registry/registry'
import type {
  ContributionFxQuote,
  PublicRegistryAccount,
  PublicRegistryData,
  PublicRegistryItem,
  StartedContribution,
} from '@/lib/registry/registry'
import { cn } from '@/lib/utils'

type ContributeTarget =
  { kind: 'gift'; item: PublicRegistryItem } | { kind: 'direct' }

function priceLine(
  prices: PublicRegistryItem['prices'],
  priceLabel: string | null,
) {
  if (prices.length > 0) {
    return prices
      .map((price) => {
        if (price.remaining < price.original) {
          return `${price.remaining} ${price.currency} left of ${price.original}`
        }
        return `${price.original} ${price.currency}`
      })
      .join(' · ')
  }
  return priceLabel
}

function GiftItemCard({
  item,
  onContribute,
}: {
  item: PublicRegistryItem
  onContribute: () => void
}) {
  const canContribute = item.is_open && item.prices.length > 0
  const line = priceLine(item.prices, item.price_label)

  return (
    <article className="border-border space-y-4 border-b py-8 last:border-b-0">
      {item.photo_path ? (
        <img
          src={`/api/photo?path=${encodeURIComponent(item.photo_path)}`}
          alt={item.title}
          className="h-48 w-full max-w-md rounded-md object-cover"
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <h3 className="font-serif text-2xl italic md:text-3xl">
            {item.title}
          </h3>
          {item.description ? (
            <p className="text-foreground-secondary mt-3 text-sm leading-relaxed md:text-base">
              {item.description}
            </p>
          ) : null}
          {line ? (
            <p className="text-foreground-secondary mt-3 text-xs tracking-[0.14em] uppercase">
              {line}
            </p>
          ) : null}
        </div>
        {item.store_url ? (
          <a
            href={item.store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground text-xs tracking-[0.14em] uppercase underline-offset-4 transition hover:underline"
          >
            View product
          </a>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {item.listings.map((listing) => (
          <Button key={listing.provider} type="button" size="sm" asChild>
            <a href={listing.url} target="_blank" rel="noopener noreferrer">
              {listing.provider === 'amazon' ? 'Buy on Amazon' : listing.label}
            </a>
          </Button>
        ))}
        {canContribute ? (
          <Button
            type="button"
            size="sm"
            variant={item.listings.length > 0 ? 'outline' : undefined}
            onClick={onContribute}
          >
            Send money
          </Button>
        ) : null}
      </div>
      {!canContribute && item.prices.length > 0 ? (
        <p className="text-foreground-secondary text-sm">
          This gift is fully funded. Thank you.
        </p>
      ) : null}
      {!canContribute &&
      item.prices.length === 0 &&
      item.listings.length === 0 ? (
        <p className="text-foreground-secondary text-sm">
          This gift is not open for contributions yet.
        </p>
      ) : null}
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
      <p className="font-mono text-sm tracking-wide">
        {account.account_number}
      </p>
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

function ContributeDrawer({
  open,
  onOpenChange,
  weddingSlug,
  target,
  accounts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  weddingSlug: string
  target: ContributeTarget | null
  accounts: PublicRegistryAccount[]
}) {
  const [started, setStarted] = useState<StartedContribution | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [fxQuote, setFxQuote] = useState<ContributionFxQuote | null>(null)
  const [fxLoading, setFxLoading] = useState(false)

  const currencies = useMemo(() => {
    return [
      ...new Set(accounts.map((account) => account.currency.toUpperCase())),
    ]
  }, [accounts])

  const defaultCurrency = currencies[0] ?? 'USD'
  const giftId = target?.kind === 'gift' ? target.item.id : null
  const basePrice =
    target?.kind === 'gift' ? (target.item.prices[0] ?? null) : null

  const form = useForm({
    defaultValues: {
      ...emptyStartContributionForm(defaultCurrency),
      weddingSlug,
      giftId: giftId ?? '',
    },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = startContributionFormSchema.safeParse({
          ...value,
          weddingSlug,
          giftId,
        })
        if (parsed.success) return undefined
        return zodFormFieldErrors(parsed.error)
      },
    },
    onSubmit: async ({ value }) => {
      setIsSaving(true)
      try {
        const result = await startBankContribution({
          data: {
            ...value,
            weddingSlug,
            giftId,
          },
        })
        setStarted(result)
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Unable to start this contribution.',
        )
      } finally {
        setIsSaving(false)
      }
    },
  })

  const applyFxQuote = useEffectEvent((quote: ContributionFxQuote) => {
    setFxQuote(quote)
    if (quote.suggestedAmount != null && quote.suggestedAmount > 0) {
      form.setFieldValue('amount', String(quote.suggestedAmount))
    }
  })

  useEffect(() => {
    if (!open || !target || started) return
    const currency = form.state.values.currency || defaultCurrency
    if (!currency) return

    let cancelled = false
    setFxLoading(true)
    void quoteContributionFx({
      data: {
        weddingSlug,
        giftId,
        currency,
      },
    })
      .then((quote) => {
        if (cancelled) return
        applyFxQuote(quote)
      })
      .catch((error) => {
        if (cancelled) return
        setFxQuote(null)
        toast.error(
          error instanceof Error
            ? error.message
            : 'Unable to load the exchange rate.',
        )
      })
      .finally(() => {
        if (!cancelled) setFxLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    open,
    target,
    started,
    weddingSlug,
    giftId,
    defaultCurrency,
    form.state.values.currency,
  ])

  const title =
    target?.kind === 'gift'
      ? `Contribute to ${target.item.title}`
      : 'Send a cash gift'

  return (
    <SideDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setStarted(null)
          setFxQuote(null)
          form.reset()
        }
        onOpenChange(next)
      }}
    >
      <SideDrawer.Header
        title={started ? 'Bank details' : title}
        drawerDescription="Registry contribution"
      />
      {started ? (
        <>
          <SideDrawer.Content>
            <div className="flex flex-col gap-4">
              <p className="text-foreground-secondary text-sm leading-relaxed">
                Send{' '}
                <strong className="text-foreground">
                  {started.amount} {started.currency}
                </strong>
                {started.giftTitle ? (
                  <>
                    {' '}
                    toward{' '}
                    <strong className="text-foreground">
                      {started.giftTitle}
                    </strong>
                  </>
                ) : null}
                {started.currency !== started.baseCurrency ? (
                  <>
                    {' '}
                    (counts as {started.amountBase} {started.baseCurrency} at
                    the locked rate)
                  </>
                ) : null}
                . Use this reference so the couple can match it:
              </p>
              <p className="font-mono text-lg tracking-wide">
                {started.reference}
              </p>
              <div className="border-border space-y-2 rounded-xl border p-4">
                <p className="public-kicker">{started.account.label}</p>
                {started.account.bank_name ? (
                  <p className="font-serif text-xl italic">
                    {started.account.bank_name}
                  </p>
                ) : null}
                <p className="text-foreground-secondary text-sm">
                  {started.account.currency} · {started.account.account_name}
                </p>
                <p className="font-mono text-sm tracking-wide">
                  {started.account.account_number}
                </p>
                {started.account.routing_number ? (
                  <p className="text-foreground-secondary text-sm">
                    Routing / sort code: {started.account.routing_number}
                  </p>
                ) : null}
                {started.account.notes ? (
                  <p className="text-foreground-secondary text-sm leading-relaxed">
                    {started.account.notes}
                  </p>
                ) : null}
              </div>
              <p className="text-foreground-secondary text-sm leading-relaxed">
                We emailed you a confirm link. After you send the money, open
                that email and confirm so the gift amount updates.
              </p>
              <Button type="button" size="sm" asChild>
                <a href={started.confirmUrl}>I’ve sent the money</a>
              </Button>
            </div>
          </SideDrawer.Content>
          <SideDrawer.Footer>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </SideDrawer.Footer>
        </>
      ) : (
        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <SideDrawer.Content>
            <form.Subscribe selector={(state) => state.submissionAttempts > 0}>
              {(submitted) => (
                <div className="flex flex-col gap-4">
                  {basePrice ? (
                    <p className="text-foreground-secondary text-sm leading-relaxed">
                      Gift price {basePrice.original} {basePrice.currency}
                      {basePrice.remaining < basePrice.original
                        ? ` · ${basePrice.remaining} left`
                        : null}
                      . Pick the currency you will send; we convert with a live
                      rate and lock it when you continue.
                    </p>
                  ) : null}

                  <form.Field name="currency">
                    {(currencyField) => (
                      <form.Field name="amount">
                        {(amountField) => {
                          const currencyError = fieldErrorMessage(
                            currencyField.state.meta.errors,
                          )
                          const amountError = fieldErrorMessage(
                            amountField.state.meta.errors,
                          )
                          const invalid =
                            (!!currencyError &&
                              (currencyField.state.meta.isTouched ||
                                submitted)) ||
                            (!!amountError &&
                              (amountField.state.meta.isTouched || submitted))
                          const error = amountError || currencyError
                          return (
                            <CurrencyAmountField
                              currency={currencyField.state.value}
                              amount={String(amountField.state.value)}
                              invalid={invalid}
                              error={invalid ? error : undefined}
                              required
                              allowedCodes={currencies}
                              showRequestLink={false}
                              onBlur={() => {
                                currencyField.handleBlur()
                                amountField.handleBlur()
                              }}
                              onCurrencyChange={(next) =>
                                currencyField.handleChange(next)
                              }
                              onAmountChange={(next) =>
                                amountField.handleChange(next)
                              }
                            />
                          )
                        }}
                      </form.Field>
                    )}
                  </form.Field>

                  {fxLoading ? (
                    <p className="text-foreground-secondary text-sm">
                      Loading exchange rate…
                    </p>
                  ) : fxQuote &&
                    fxQuote.baseCurrency !== fxQuote.payCurrency ? (
                    <p className="text-foreground-secondary text-sm leading-relaxed">
                      About 1 {fxQuote.baseCurrency} = {fxQuote.fxRate}{' '}
                      {fxQuote.payCurrency}
                      {fxQuote.suggestedAmount != null
                        ? ` · suggested ${fxQuote.suggestedAmount} ${fxQuote.payCurrency} to cover what is left`
                        : null}
                      . Exact rate locks when you continue.
                    </p>
                  ) : null}

                  <form.Field name="payerName">
                    {(field) => {
                      const error = fieldErrorMessage(field.state.meta.errors)
                      const invalid =
                        !!error && (field.state.meta.isTouched || submitted)
                      return (
                        <Field invalid={invalid}>
                          <Field.Label required>Your name</Field.Label>
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

                  <form.Field name="payerEmail">
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

                  <form.Field name="phoneCountry">
                    {(countryField) => (
                      <form.Field name="phoneNational">
                        {(phoneField) => {
                          const error = fieldErrorMessage(
                            phoneField.state.meta.errors,
                          )
                          const invalid =
                            !!error &&
                            (phoneField.state.meta.isTouched || submitted)
                          return (
                            <PhoneField
                              label="Phone"
                              country={countryField.state.value}
                              nationalNumber={phoneField.state.value}
                              invalid={invalid}
                              error={invalid ? error : undefined}
                              onChange={({ country, nationalNumber }) => {
                                countryField.handleChange(country)
                                phoneField.handleChange(nationalNumber)
                              }}
                            />
                          )
                        }}
                      </form.Field>
                    )}
                  </form.Field>
                </div>
              )}
            </form.Subscribe>
          </SideDrawer.Content>
          <SideDrawer.Footer>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSaving}>
              Continue
            </Button>
          </SideDrawer.Footer>
        </form>
      )}
    </SideDrawer>
  )
}

export function RegistrySection({
  initial,
  weddingSlug,
}: {
  initial: PublicRegistryData
  weddingSlug: string
}) {
  const [items] = useState(initial.items)
  const accounts = initial.accounts
  const [target, setTarget] = useState<ContributeTarget | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!initial.hasContent) return null

  const openContribute = (next: ContributeTarget) => {
    setTarget(next)
    setDrawerOpen(true)
  }

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
            chip in toward a gift or send a cash gift by bank transfer.
          </p>
        </div>

        {items.length > 0 ? (
          <div className={cn(accounts.length > 0 && 'mb-12')}>
            <p className="public-kicker mb-2">Gift ideas</p>
            {items.map((item) => (
              <GiftItemCard
                key={item.id}
                item={item}
                onContribute={() => openContribute({ kind: 'gift', item })}
              />
            ))}
          </div>
        ) : null}

        {accounts.length > 0 ? (
          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <p className="public-kicker mb-0">Cash gifts</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openContribute({ kind: 'direct' })}
              >
                Send a cash gift
              </Button>
            </div>
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        ) : null}
      </div>

      <ContributeDrawer
        key={
          target
            ? target.kind === 'gift'
              ? target.item.id
              : 'direct'
            : 'closed'
        }
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        weddingSlug={weddingSlug}
        target={target}
        accounts={accounts}
      />
    </section>
  )
}
