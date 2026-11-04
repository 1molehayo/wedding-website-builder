import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react'
import { CaretDownIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
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

/** Keep wheel/touch scroll inside the country list (do not scroll the drawer). */
function stopScrollChain(event: React.UIEvent) {
  event.stopPropagation()
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
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const placeholder = useMemo(() => exampleNationalNumber(country), [country])

  const filtered = useMemo(
    () => countries.filter((item) => matchesCountryQuery(item, query)),
    [countries, query],
  )

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setQuery('')
  }

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: handleOpenChange,
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(180, Math.min(320, availableHeight))}px`,
          })
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  })

  const click = useClick(context, { toggle: true })
  // ancestorScroll would close the menu when the parent drawer scrolls.
  const dismiss = useDismiss(context, {
    ancestorScroll: false,
    outsidePressEvent: 'mousedown',
    outsidePress: (event) => {
      const target = event.target
      if (!(target instanceof Element)) return true
      // Portaled picker sits outside the Vaul drawer DOM; still treat as inside.
      if (target.closest('[data-phone-country-picker]')) return false
      return true
    },
  })
  const role = useRole(context, { role: 'dialog' })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ])

  // Non-passive wheel listener so we can contain scroll inside the list.
  useEffect(() => {
    if (!open) return
    const node = listRef.current
    if (!node) return

    const onWheel = (event: WheelEvent) => {
      event.stopPropagation()
      const { scrollTop, scrollHeight, clientHeight } = node
      const atTop = scrollTop <= 0 && event.deltaY < 0
      const atBottom =
        scrollTop + clientHeight >= scrollHeight - 1 && event.deltaY > 0
      if (atTop || atBottom) {
        event.preventDefault()
      }
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [open, filtered.length])

  return (
    <Field invalid={invalid}>
      <Field.Label required={required}>{label}</Field.Label>
      <Input.Group invalid={invalid}>
        <Input.Addon asChild>
          <button
            ref={refs.setReference}
            type="button"
            aria-label={`Country: ${selected.name}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="text-foreground flex cursor-pointer items-center gap-1"
            {...getReferenceProps()}
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
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            initialFocus={searchRef}
            returnFocus={false}
          >
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="border-border bg-background z-100 flex min-w-72 max-w-[min(100vw-1rem,20rem)] flex-col overflow-hidden rounded-xl border shadow-md outline-none"
              data-phone-country-picker=""
              {...getFloatingProps({
                // Portaled outside Vaul drawer content — stop outside-dismiss / drag handlers.
                onPointerDown: (event) => event.stopPropagation(),
                onMouseDown: (event) => event.stopPropagation(),
                onTouchStart: (event) => event.stopPropagation(),
                onWheel: stopScrollChain,
                onTouchMove: stopScrollChain,
              })}
            >
              <div className="border-border bg-background shrink-0 border-b p-2">
                <div className="relative">
                  <MagnifyingGlassIcon
                    className="text-foreground-secondary pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                    aria-hidden
                  />
                  <Input
                    ref={searchRef}
                    type="search"
                    size="sm"
                    value={query}
                    placeholder="Search country or code"
                    autoComplete="off"
                    aria-label="Search countries"
                    aria-controls="phone-country-list"
                    className="pl-8"
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.stopPropagation()
                        handleOpenChange(false)
                      }
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                  />
                </div>
              </div>
              <div
                id="phone-country-list"
                ref={listRef}
                role="listbox"
                aria-label="Countries"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 [-webkit-overflow-scrolling:touch]"
                onTouchMove={stopScrollChain}
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
                        onPointerDown={(event) => {
                          // Prevent focus steal / outside handlers; select on press.
                          event.preventDefault()
                          event.stopPropagation()
                          onChange({ country: item.code, nationalNumber })
                          handleOpenChange(false)
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
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </Field>
  )
}
