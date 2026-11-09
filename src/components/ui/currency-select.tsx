import { CaretDownIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
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

function buildOptions(includeCodes: string[]): CurrencyOption[] {
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
  return [...curated, ...uniqueExtras]
}

/** Compact currency picker (flag + code), same list UX as CurrencyAmountField. */
export function CurrencySelect({
  value,
  onChange,
  onBlur,
  invalid,
  includeCodes = [],
  showRequestLink = true,
  className,
}: {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  invalid?: boolean
  includeCodes?: string[]
  showRequestLink?: boolean
  className?: string
}) {
  const listId = useId()
  const openFeedback = useOpenFeedback()
  const options = useMemo(() => buildOptions(includeCodes), [includeCodes])
  const selected = getCurrencyMeta(value) ?? {
    code: value.trim().toUpperCase() || 'USD',
    name: value.trim().toUpperCase() || 'USD',
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
    <div ref={rootRef} className={cn('space-y-1.5', className)}>
      <button
        type="button"
        data-invalid={invalid || undefined}
        aria-invalid={invalid || undefined}
        aria-label={`Currency: ${selected.code}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          'border-border bg-background text-foreground hover:border-[color-mix(in_oklab,var(--color-border),var(--color-foreground)_8%)] flex h-10 w-full cursor-pointer items-center gap-2 rounded-xl border px-4 text-left shadow-xs transition',
          '[:focus-visible]:ring-ring [:focus-visible]:border-accent [:focus-visible]:ring-(length:--ring-width)',
          invalid && 'border-error!',
        )}
        onBlur={onBlur}
        onClick={(event) => {
          event.preventDefault()
          setOpen((prev) => {
            if (prev) setQuery('')
            return !prev
          })
        }}
      >
        <span className="text-base leading-none" aria-hidden>
          {selected.flag}
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold tracking-wide">
          {selected.code}
        </span>
        <CaretDownIcon className="text-foreground-secondary size-4" />
      </button>

      {open ? (
        <div className="border-border bg-background flex h-72 flex-col overflow-hidden rounded-xl border shadow-sm">
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
                      onChange(item.code)
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
      ) : showRequestLink ? (
        <p className="text-foreground-secondary text-xs">
          Currency not listed?{' '}
          <button
            type="button"
            className="text-foreground underline underline-offset-2"
            onClick={() =>
              openFeedback({
                category: 'currency',
                message:
                  'Please add support for this currency:\nCode: \nCountry: \n',
              })
            }
          >
            Request to add it
          </button>
        </p>
      ) : null}
    </div>
  )
}
