import { CaretDownIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  exampleNationalNumber,
  listPhoneCountries,
  sanitizeNationalNumber,
} from '@/lib/auth/phone'
import type { CountryCode } from '@/lib/auth/phone'
import { cn } from '@/lib/utils'

const PANEL_MAX_HEIGHT = 320
const PANEL_MIN_HEIGHT = 180
const PANEL_WIDTH = 288

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

type PanelCoords = { top: number; left: number; maxHeight: number }

function computePanelCoords(anchor: HTMLElement): PanelCoords {
  const rect = anchor.getBoundingClientRect()
  const gap = 4
  const spaceBelow = window.innerHeight - rect.bottom - gap - 8
  const spaceAbove = rect.top - gap - 8
  const placeBelow = spaceBelow >= PANEL_MIN_HEIGHT || spaceBelow >= spaceAbove
  const maxHeight = Math.max(
    PANEL_MIN_HEIGHT,
    Math.min(PANEL_MAX_HEIGHT, placeBelow ? spaceBelow : spaceAbove),
  )
  const left = Math.min(
    Math.max(8, rect.left),
    window.innerWidth - PANEL_WIDTH - 8,
  )
  const top = placeBelow
    ? rect.bottom + gap
    : Math.max(8, rect.top - gap - maxHeight)

  return { top, left, maxHeight }
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
  const [coords, setCoords] = useState<PanelCoords | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
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
    setCoords(null)
  }

  const openMenu = () => {
    if (!triggerRef.current) return
    setCoords(computePanelCoords(triggerRef.current))
    setOpen(true)
  }

  const toggleMenu = () => {
    if (open) close()
    else openMenu()
  }

  // Keep panel aligned while open (drawer scroll / resize / keyboard).
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    const update = () => {
      if (!triggerRef.current) return
      setCoords(computePanelCoords(triggerRef.current))
    }

    update()
    window.addEventListener('resize', update)
    // Capture scroll from drawer (and nested scrollers).
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  // Outside click / escape — ignore presses inside the panel or trigger.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      close()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
        triggerRef.current?.focus()
      }
    }

    // Defer so the opening click does not immediately close.
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown, true)
      document.addEventListener('keydown', onKeyDown, true)
    }, 0)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  // Focus search when opened.
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  // Contain wheel scroll inside the country list (do not scroll the drawer).
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
      if (atTop || atBottom) event.preventDefault()
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [open, filtered.length])

  const panel =
    open && coords
      ? createPortal(
          <div
            ref={panelRef}
            data-phone-country-picker=""
            role="dialog"
            aria-label="Select country"
            className="border-border bg-background flex flex-col overflow-hidden rounded-xl border shadow-md outline-none"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: PANEL_WIDTH,
              maxHeight: coords.maxHeight,
              zIndex: 200,
            }}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
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
                  aria-controls={listId}
                  className="pl-8"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    // Keep typing from bubbling into drawer shortcuts.
                    event.stopPropagation()
                  }}
                />
              </div>
            </div>
            <div
              id={listId}
              ref={listRef}
              role="listbox"
              aria-label="Countries"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 [-webkit-overflow-scrolling:touch]"
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
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <span className="text-foreground-secondary shrink-0 text-sm">
                        +{item.callingCode}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <Field invalid={invalid}>
      <Field.Label required={required}>{label}</Field.Label>
      <Input.Group invalid={invalid}>
        <Input.Addon asChild>
          <button
            ref={triggerRef}
            type="button"
            aria-label={`Country: ${selected.name}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="text-foreground flex cursor-pointer items-center gap-1"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              toggleMenu()
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
      {panel}
    </Field>
  )
}
