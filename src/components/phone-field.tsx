import { CaretDownIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  exampleNationalNumber,
  listPhoneCountries,
  sanitizeNationalNumber,
} from '@/lib/auth/phone'
import type { CountryCode } from '@/lib/auth/phone'
import { cn } from '@/lib/utils'

function matchesCountryQuery(
  item: { code: string; name: string; callingCode: string },
  query: string,
) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const dial = q.replace(/^\+/, '')
  return (
    item.name.toLowerCase().includes(q) ||
    item.code.toLowerCase().includes(q) ||
    item.callingCode.includes(dial) ||
    `+${item.callingCode}`.includes(q)
  )
}

export function PhoneField({
  country,
  nationalNumber,
  onChange,
  invalid,
  error,
  label = 'Phone number',
  required = false,
  hint,
}: {
  country: CountryCode
  nationalNumber: string
  onChange: (next: { country: CountryCode; nationalNumber: string }) => void
  invalid?: boolean
  error?: string
  label?: string
  required?: boolean
  hint?: string
}) {
  const listId = useId()
  const countries = useMemo(() => listPhoneCountries(), [])
  const selected = countries.find((item) => item.code === country) ?? {
    code: country,
    callingCode: '',
    name: country,
    flag: '🏳️',
    label: country,
  }

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const placeholder = useMemo(() => exampleNationalNumber(country), [country])
  const filtered = useMemo(
    () => countries.filter((item) => matchesCountryQuery(item, query)),
    [countries, query],
  )

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  // Close when clicking outside this field (still inside the drawer is fine).
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

  // Focus search when the list opens (safe now — panel is inside the drawer).
  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
  }, [open])

  // Wheel over the list must not scroll the parent drawer.
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

      // Always stop the drawer from receiving the wheel.
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
              aria-label={`Country: ${selected.name}`}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listId}
              className="text-foreground flex cursor-pointer items-center gap-1"
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
              <CaretDownIcon className="text-foreground-secondary size-3" />
            </button>
          </Input.Addon>
          <Field.Control>
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={placeholder}
              value={nationalNumber}
              invalid={invalid}
              onChange={(event) => {
                onChange({
                  country,
                  nationalNumber: sanitizeNationalNumber(event.target.value),
                })
              }}
            />
          </Field.Control>
        </Input.Group>
        {error ? <Field.Error>{error}</Field.Error> : null}
        {!error && hint ? <Field.Description>{hint}</Field.Description> : null}

        {open ? (
          <div
            className="border-border bg-background mt-2 flex h-72 flex-col overflow-hidden rounded-xl border shadow-sm"
            data-phone-country-picker=""
          >
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
                  placeholder="Search country or code"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Search countries"
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
              aria-label="Countries"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
            >
              {filtered.length === 0 ? (
                <p className="text-foreground-secondary px-3 py-2 text-sm">
                  No countries match “{query.trim()}”.
                </p>
              ) : (
                filtered.map((item) => {
                  const isActive = item.code === country
                  return (
                    <button
                      key={item.code}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={cn(
                        'hover:bg-foreground/5 flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                        isActive && 'bg-foreground/5',
                      )}
                      onClick={() => {
                        onChange({ country: item.code, nationalNumber })
                        close()
                      }}
                    >
                      <span className="text-base leading-none" aria-hidden>
                        {item.flag}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {item.name}
                      </span>
                      <span className="text-foreground-secondary shrink-0 text-sm">
                        +{item.callingCode}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        ) : null}
      </Field>
    </div>
  )
}
