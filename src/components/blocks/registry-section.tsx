import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useForm, useStore } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { PhoneField } from '@/components/phone-field'
import { Button } from '@/components/ui/button'
import { CurrencyAmountField } from '@/components/ui/currency-amount-field'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SideDrawer } from '@/components/ui/side-drawer'
import { toast } from '@/components/ui/toaster'
import { Tooltip } from '@/components/ui/tooltip'
import { defaultPhoneCountry } from '@/lib/auth/phone'
import { pickContributionDefaultCurrency } from '@/lib/currency/currencies'
import {
  isUsableCrossCurrencyRate,
  isUsableSuggestedAmountQuote,
  payAmountToBase,
} from '@/lib/fx/money'
import { fieldErrorMessage } from '@/lib/forms/field-error'
import { zodFormFieldErrors } from '@/lib/forms/zod-form-errors'
import { contributionFxQuoteQueryOptions } from '@/lib/query/fx-queries'
import {
  emptyStartContributionForm,
  startContributionFormSchema,
} from '@/lib/registry/contribution-schema'
import { startBankContribution } from '@/lib/registry/registry'
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

function giftPhotoUrl(path: string) {
  return `/api/photo?path=${encodeURIComponent(path)}`
}

function GiftItemActions({
  item,
  canContribute,
  onContribute,
}: {
  item: PublicRegistryItem
  canContribute: boolean
  onContribute: () => void
}) {
  return (
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
  )
}

function GiftItemCard({
  item,
  onContribute,
  onViewDetails,
}: {
  item: PublicRegistryItem
  onContribute: () => void
  onViewDetails: () => void
}) {
  const canContribute = item.is_open && item.prices.length > 0
  const line = priceLine(item.prices, item.price_label)

  return (
    <article className="flex h-full flex-col gap-3">
      {item.photo_path ? (
        <button
          type="button"
          className="block w-full overflow-hidden rounded-md text-left"
          onClick={onViewDetails}
          aria-label={`View details for ${item.title}`}
        >
          <img
            src={giftPhotoUrl(item.photo_path)}
            alt=""
            className="aspect-[4/3] w-full object-cover transition hover:opacity-95"
          />
        </button>
      ) : null}

      <div className="min-w-0 space-y-2">
        <button
          type="button"
          className="w-full text-left"
          onClick={onViewDetails}
        >
          <h3 className="font-serif line-clamp-2 text-xl italic md:text-2xl">
            {item.title}
          </h3>
        </button>
        {item.description ? (
          <p className="text-foreground-secondary line-clamp-3 text-sm leading-relaxed">
            {item.description}
          </p>
        ) : null}
        {line ? (
          <p className="text-foreground text-sm font-semibold tracking-[0.08em] uppercase md:text-base">
            {line}
          </p>
        ) : null}
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
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        <GiftItemActions
          item={item}
          canContribute={canContribute}
          onContribute={onContribute}
        />
        <button
          type="button"
          className="text-foreground text-xs tracking-[0.14em] uppercase underline-offset-4 transition hover:underline"
          onClick={onViewDetails}
        >
          View details
        </button>
      </div>
    </article>
  )
}

function GiftDetailsDrawer({
  open,
  onOpenChange,
  item,
  onContribute,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: PublicRegistryItem | null
  onContribute: () => void
}) {
  if (!item) return null

  const canContribute = item.is_open && item.prices.length > 0
  const line = priceLine(item.prices, item.price_label)
  const hasAmazon = item.listings.some(
    (listing) => listing.provider === 'amazon',
  )

  return (
    <SideDrawer open={open} onOpenChange={onOpenChange}>
      <SideDrawer.Header
        title="Gift details"
        drawerDescription={item.title}
      />
      <SideDrawer.Content className="space-y-5">
        {item.photo_path ? (
          <img
            src={giftPhotoUrl(item.photo_path)}
            alt=""
            className="aspect-[4/3] w-full rounded-md object-cover"
          />
        ) : null}
        <div className="space-y-3">
          <h3 className="font-serif text-2xl italic md:text-3xl">
            {item.title}
          </h3>
          {item.description ? (
            <p className="text-foreground-secondary text-sm leading-relaxed md:text-base">
              {item.description}
            </p>
          ) : null}
          {line ? (
            <p className="text-foreground text-sm font-semibold tracking-[0.08em] uppercase md:text-base">
              {line}
            </p>
          ) : null}
          {item.store_url ? (
            <a
              href={item.store_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground inline-block text-xs tracking-[0.14em] uppercase underline-offset-4 transition hover:underline"
            >
              View product
            </a>
          ) : null}
        </div>

        <GiftItemActions
          item={item}
          canContribute={canContribute}
          onContribute={() => {
            onOpenChange(false)
            onContribute()
          }}
        />

        {hasAmazon ? (
          <p className="text-foreground-secondary text-sm leading-relaxed">
            Amazon opens the wedding list. Find this gift: {item.title}.
          </p>
        ) : null}

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
      </SideDrawer.Content>
    </SideDrawer>
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
  visitorCountry,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  weddingSlug: string
  target: ContributeTarget | null
  accounts: PublicRegistryAccount[]
  visitorCountry: string | null
}) {
  const [started, setStarted] = useState<StartedContribution | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const latestFxRef = useRef<{
    usable: ContributionFxQuote | null
    error: string | null
  }>({ usable: null, error: null })

  const currencies = useMemo(() => {
    return [
      ...new Set(accounts.map((account) => account.currency.toUpperCase())),
    ]
  }, [accounts])

  const giftId = target?.kind === 'gift' ? target.item.id : null
  const basePrice =
    target?.kind === 'gift' ? (target.item.prices[0] ?? null) : null
  const giftBaseCurrency = basePrice?.currency.toUpperCase() ?? null
  const defaultCurrency = pickContributionDefaultCurrency({
    availableCurrencies: currencies,
    visitorCountry,
    giftCurrency: giftBaseCurrency,
  })
  const detectedPhoneCountry = defaultPhoneCountry(visitorCountry)
  const accountsForDefaultCurrency = accounts.filter(
    (account) => account.currency.toUpperCase() === defaultCurrency,
  )
  const defaultAccountId = accountsForDefaultCurrency[0]?.id ?? ''

  const form = useForm({
    defaultValues: {
      ...emptyStartContributionForm(defaultCurrency, detectedPhoneCountry),
      accountId: defaultAccountId,
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
      const pay = value.currency.toUpperCase()
      const { usable: quote, error: blockedMessage } = latestFxRef.current
      if (
        giftBaseCurrency &&
        giftBaseCurrency !== pay &&
        !(
          quote &&
          isUsableCrossCurrencyRate(giftBaseCurrency, pay, quote.fxRate)
        )
      ) {
        toast.error(
          blockedMessage ??
            `Live exchange rates are unavailable. Pay in ${giftBaseCurrency}, or try again in a moment.`,
        )
        return
      }

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

  const payCurrency = useStore(
    form.store,
    (state) => state.values.currency || defaultCurrency,
  )

  const fxQueryEnabled = Boolean(open && target && !started && payCurrency)
  const {
    data: fxQuoteData,
    isFetching: fxLoading,
    isError: fxIsError,
    error: fxQueryError,
  } = useQuery({
    ...contributionFxQuoteQueryOptions({
      weddingSlug,
      giftId,
      currency: payCurrency,
    }),
    enabled: fxQueryEnabled,
  })

  const needsCrossCurrency = Boolean(
    giftBaseCurrency && giftBaseCurrency !== payCurrency.toUpperCase(),
  )
  const usableFxQuote =
    fxQuoteData &&
    isUsableCrossCurrencyRate(
      fxQuoteData.baseCurrency,
      fxQuoteData.payCurrency,
      fxQuoteData.fxRate,
    )
      ? fxQuoteData
      : null
  const amountQuote =
    fxQuoteData &&
    isUsableSuggestedAmountQuote(fxQuoteData, payCurrency)
      ? fxQuoteData
      : null
  const fxError = !needsCrossCurrency
    ? null
    : fxIsError
      ? fxQueryError instanceof Error
        ? fxQueryError.message
        : 'Live exchange rates are unavailable right now. Pay in the gift currency, or try again in a moment.'
      : !fxLoading && !usableFxQuote
        ? 'Live exchange rates are unavailable right now. Pay in the gift currency, or try again in a moment.'
        : null
  const fxBlocked = needsCrossCurrency && !fxLoading && !usableFxQuote

  latestFxRef.current = { usable: usableFxQuote, error: fxError }

  const syncAccountForCurrency = useEffectEvent((currency: string) => {
    const matches = accounts.filter(
      (account) => account.currency.toUpperCase() === currency.toUpperCase(),
    )
    const current = form.state.values.accountId
    if (matches.some((account) => account.id === current)) return
    form.setFieldValue('accountId', matches[0]?.id ?? '')
  })

  const applySuggestedAmount = useEffectEvent((quote: ContributionFxQuote) => {
    if (quote.suggestedAmount != null && quote.suggestedAmount > 0) {
      form.setFieldValue('amount', String(quote.suggestedAmount))
    }
  })

  const initializeForm = useEffectEvent(() => {
    form.setFieldValue('currency', defaultCurrency)
    form.setFieldValue('accountId', defaultAccountId)
    form.setFieldValue('phoneCountry', detectedPhoneCountry)
    form.setFieldValue('amount', '')
  })

  useEffect(() => {
    if (!open || !target || started) return
    initializeForm()
  }, [
    open,
    target,
    started,
    defaultCurrency,
    defaultAccountId,
    detectedPhoneCountry,
  ])

  useEffect(() => {
    if (!open || !target || started || !payCurrency) return
    syncAccountForCurrency(payCurrency)
  }, [open, target, started, payCurrency])

  useEffect(() => {
    if (!amountQuote) return
    applySuggestedAmount(amountQuote)
  }, [amountQuote])

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
                      . Pick the currency you will send
                      {needsCrossCurrency
                        ? '; a live rate is required before you continue'
                        : ''}
                      .
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
                  ) : usableFxQuote ? (
                    <form.Subscribe
                      selector={(state) => state.values.amount}
                    >
                      {(amount) => {
                        const pay = Number(amount)
                        const baseEquivalent =
                          Number.isFinite(pay) && pay > 0
                            ? payAmountToBase(pay, usableFxQuote.fxRate)
                            : null
                        return (
                          <div className="text-foreground-secondary flex items-center gap-2 text-sm">
                            <span>
                              {baseEquivalent != null
                                ? `≈ ${baseEquivalent} ${usableFxQuote.baseCurrency}`
                                : `≈ — ${usableFxQuote.baseCurrency}`}
                            </span>
                            <Tooltip delayIn={200}>
                              <Tooltip.Trigger
                                type="button"
                                className="hover:text-foreground inline-flex items-center gap-1"
                                aria-label="FX rates"
                              >
                                <InfoIcon className="size-3.5" />
                                <span className="text-xs">FX rates</span>
                              </Tooltip.Trigger>
                              <Tooltip.Content>
                                1 {usableFxQuote.baseCurrency} ={' '}
                                {usableFxQuote.fxRate}{' '}
                                {usableFxQuote.payCurrency}
                              </Tooltip.Content>
                            </Tooltip>
                          </div>
                        )
                      }}
                    </form.Subscribe>
                  ) : fxBlocked ? (
                    <div
                      role="alert"
                      className="border-error/30 bg-error/5 text-error flex gap-2 rounded-xl border px-3 py-2.5 text-sm leading-relaxed"
                    >
                      <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium">
                          Live exchange rates unavailable
                        </p>
                        <p>
                          {fxError ??
                            `We could not convert to ${payCurrency.toUpperCase()} right now. Choose ${giftBaseCurrency} to continue, or try again in a moment.`}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <form.Subscribe
                    selector={(state) => state.values.currency}
                  >
                    {(currency) => {
                      const matches = accounts.filter(
                        (account) =>
                          account.currency.toUpperCase() ===
                          currency.toUpperCase(),
                      )
                      if (matches.length === 0) return null
                      return (
                        <form.Field name="accountId">
                          {(field) => {
                            const error = fieldErrorMessage(
                              field.state.meta.errors,
                            )
                            const invalid =
                              !!error &&
                              (field.state.meta.isTouched || submitted)
                            return (
                              <Field invalid={invalid}>
                                <Field.Label required={matches.length > 1}>
                                  {matches.length > 1
                                    ? 'Bank account'
                                    : 'Bank account for this currency'}
                                </Field.Label>
                                {matches.length === 1 ? (
                                  <div className="border-border space-y-1 rounded-xl border p-3 text-sm">
                                    <p className="font-medium">
                                      {matches[0].label}
                                    </p>
                                    <p className="text-foreground-secondary">
                                      {matches[0].bank_name
                                        ? `${matches[0].bank_name} · `
                                        : ''}
                                      {matches[0].account_name}
                                    </p>
                                    <p className="font-mono tracking-wide">
                                      {matches[0].account_number}
                                    </p>
                                  </div>
                                ) : (
                                  <Field.Control>
                                    <div
                                      role="radiogroup"
                                      aria-label="Bank account"
                                      className="flex flex-col gap-2"
                                    >
                                      {matches.map((account) => {
                                        const selected =
                                          field.state.value === account.id
                                        return (
                                          <button
                                            key={account.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={selected}
                                            className={cn(
                                              'border-border rounded-xl border p-3 text-left text-sm transition',
                                              selected
                                                ? 'border-foreground bg-background-secondary'
                                                : 'hover:border-foreground/40',
                                            )}
                                            onClick={() =>
                                              field.handleChange(account.id)
                                            }
                                          >
                                            <p className="font-medium">
                                              {account.label}
                                            </p>
                                            <p className="text-foreground-secondary mt-1">
                                              {account.bank_name
                                                ? `${account.bank_name} · `
                                                : ''}
                                              {account.account_name}
                                            </p>
                                            <p className="mt-1 font-mono tracking-wide">
                                              {account.account_number}
                                            </p>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </Field.Control>
                                )}
                                <Field.Error>
                                  {invalid ? error : null}
                                </Field.Error>
                              </Field>
                            )
                          }}
                        </form.Field>
                      )
                    }}
                  </form.Subscribe>

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
            <Button
              type="submit"
              size="sm"
              isLoading={isSaving}
              disabled={fxLoading || fxBlocked}
            >
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
  visitorCountry,
}: {
  initial: PublicRegistryData
  weddingSlug: string
  visitorCountry: string | null
}) {
  const [items] = useState(initial.items)
  const accounts = initial.accounts
  const [target, setTarget] = useState<ContributeTarget | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailsItem, setDetailsItem] = useState<PublicRegistryItem | null>(
    null,
  )
  const [detailsOpen, setDetailsOpen] = useState(false)

  if (!initial.hasContent) return null

  const openContribute = (next: ContributeTarget) => {
    setTarget(next)
    setDrawerOpen(true)
  }

  const openDetails = (item: PublicRegistryItem) => {
    setDetailsItem(item)
    setDetailsOpen(true)
  }

  return (
    <section
      id="registry"
      className="public-section border-border scroll-mt-28 border-t px-6 sm:scroll-mt-24"
    >
      <div className="public-reveal mx-auto max-w-6xl">
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
            <p className="public-kicker mb-4">Gift ideas</p>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10 lg:gap-x-10">
              {items.map((item) => (
                <GiftItemCard
                  key={item.id}
                  item={item}
                  onViewDetails={() => openDetails(item)}
                  onContribute={() => openContribute({ kind: 'gift', item })}
                />
              ))}
            </div>
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

      <GiftDetailsDrawer
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open)
          if (!open) setDetailsItem(null)
        }}
        item={detailsItem}
        onContribute={() => {
          if (!detailsItem) return
          openContribute({ kind: 'gift', item: detailsItem })
        }}
      />

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
        visitorCountry={visitorCountry}
      />
    </section>
  )
}
