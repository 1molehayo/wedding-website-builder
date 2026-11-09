import { CaretDownIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  CURATED_CURRENCIES,
  getCurrencyMeta,
  isCuratedCurrencyCode,
} from '@/lib/currency/currencies'
import { useOpenFeedback } from '@/lib/feedback/feedback-context'
import { cn } from '@/lib/utils'

type CurrencyOption = {
  code: string
  name: string
  country: string
  flag: string
}

function matchesCurrencyQuery(item: CurrencyOption, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    item.code.toLowerCase().includes(q) ||
    item.name.toLowerCase().includes(q) ||
    item.country.toLowerCase().includes(q)
  )
}

function buildOptions(
  includeCodes: string[],
  allowedCodes?: string[],
): CurrencyOption[] {
  const curated: CurrencyOption[] = CURATED_CURRENCIES.map((item) => ({
    code: item.code,
    name: item.name,
    country: item.country,
    flag: item.flag,
  }))
  const extras = includeCodes
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.length > 0 && !isCuratedCurrencyCode(code))
  const uniqueExtras = [...new Set(extras)].map((code) => ({
    code,
    name: code,
    country: 'Not in list',
    flag: '🏳️',
  }))
  const all = [...curated, ...uniqueExtras]
  if (!allowedCodes || allowedCodes.length === 0) return all
  const allowed = new Set(
    allowedCodes.map((code) => code.trim().toUpperCase()).filter(Boolean),
  )
  return all.filter((item) => allowed.has(item.code))
}

/**
 * Phone-field style money input: currency prefix (flag + code) inside the
 * amount field, with a searchable Flutterwave-style currency list.
 */
export function CurrencyAmountField({
  currency,
  amount,
  onCurrencyChange,
  onAmountChange,
  onBlur,
  invalid,
  error,
  label = 'Amount',
  required = false,
  includeCodes = [],
  allowedCodes,
  showRequestLink = true,
  amountPlaceholder = '0.00',
}: {
  currency: string
  amount: string
  onCurrencyChange: (currency: string) => void
  onAmountChange: (amount: string) => void
  onBlur?: () => void
  invalid?: boolean
  error?: string
  label?: string
  required?: boolean
  includeCodes?: string[]
  /** When set, only these currency codes appear in the picker. */
  allowedCodes?: string[]
  showRequestLink?: boolean
  amountPlaceholder?: string
}) {
  const listId = useId()
  const openFeedback = useOpenFeedback()
  const options = useMemo(
    () => buildOptions(includeCodes, allowedCodes),
    [includeCodes, allowedCodes],
  )
  const selected = getCurrencyMeta(currency) ?? {
    code: currency.trim().toUpperCase() || 'USD',
    name: currency.trim().toUpperCase() || 'USD',
    country: 'Unknown',
    flag: '🏳️',
  }

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () => options.filter((item) => matchesCurrencyQuery(item, query)),
    [options, query],
  )

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      close()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const node = listRef.current
    if (!node) return

    const onWheel = (event: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = node
      const canScroll = scrollHeight > clientHeight
      if (!canScroll) {
        event.preventDefault()
        return
      }
      const atTop = scrollTop <= 0 && event.deltaY < 0
      const atBottom =
        scrollTop + clientHeight >= scrollHeight - 1 && event.deltaY > 0
      event.stopPropagation()
      if (atTop || atBottom) event.preventDefault()
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [open, filtered.length])

  return (
    <div ref={rootRef}>
      <Field invalid={invalid}>
        <Field.Label required={required}>{label}</Field.Label>
        <Input.Group invalid={invalid}>
          <Input.Addon asChild>
            <button
              type="button"
              aria-label={`Currency: ${selected.code}`}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listId}
              className="text-foreground flex cursor-pointer items-center gap-1.5"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setOpen((prev) => {
                  if (prev) setQuery('')
                  return !prev
                })
              }}
            >
              <span className="text-base leading-none" aria-hidden>
                {selected.flag}
              </span>
              <span className="text-sm font-semibold tracking-wide">
                {selected.code}
              </span>
              <CaretDownIcon className="text-foreground-secondary size-3" />
            </button>
          </Input.Addon>
          <Field.Control>
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder={amountPlaceholder}
              value={amount}
              invalid={invalid}
              onBlur={onBlur}
              onChange={(event) => onAmountChange(event.target.value)}
            />
          </Field.Control>
        </Input.Group>
        {error ? <Field.Error>{error}</Field.Error> : null}

        {open ? (
          <div className="border-border bg-background mt-2 flex h-72 flex-col overflow-hidden rounded-xl border shadow-sm">
            <div className="border-border bg-background shrink-0 border-b p-2">
              <div className="relative">
                <MagnifyingGlassIcon
                  className="text-foreground-secondary pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  ref={searchRef}
                  type="text"
                  inputMode="search"
                  size="sm"
                  value={query}
                  placeholder="Search currency or country"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Search currencies"
                  aria-controls={listId}
                  className="pl-8"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </div>
            </div>

            <div
              id={listId}
              ref={listRef}
              role="listbox"
              aria-label="Currencies"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
            >
              {filtered.length === 0 ? (
                <p className="text-foreground-secondary px-3 py-2 text-sm">
                  No currencies match “{query.trim()}”.
                </p>
              ) : (
                filtered.map((item) => {
                  const isActive = item.code === selected.code
                  return (
                    <button
                      key={item.code}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={cn(
                        'hover:bg-foreground/5 flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm',
                        isActive && 'bg-foreground/5',
                      )}
                      onClick={() => {
                        onCurrencyChange(item.code)
                        close()
                      }}
                    >
                      <span className="text-base leading-none" aria-hidden>
                        {item.flag}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {item.country}
                      </span>
                      <span className="text-foreground-secondary shrink-0 text-sm font-semibold tracking-wide">
                        {item.code}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {showRequestLink ? (
              <div className="border-border shrink-0 border-t px-3 py-2">
                <button
                  type="button"
                  className="text-foreground-secondary hover:text-foreground text-xs underline underline-offset-2"
                  onClick={() => {
                    close()
                    openFeedback({
                      category: 'currency',
                      message:
                        'Please add support for this currency:\nCode: \nCountry: \n',
                    })
                  }}
                >
                  Currency not listed? Request to add it
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Field>
    </div>
  )
}
