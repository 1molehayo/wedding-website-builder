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
import { useMemo, useState } from 'react'
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
            maxHeight: `${Math.max(160, Math.min(320, availableHeight))}px`,
          })
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  })
  const click = useClick(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'listbox' })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ])

  return (
    <Field invalid={invalid}>
      <Field.Label required={required}>{label}</Field.Label>
      <Input.Group invalid={invalid}>
        <Input.Addon asChild>
          <button
            ref={refs.setReference}
            type="button"
            aria-label={`Country: ${selected.name}`}
            aria-haspopup="listbox"
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
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="border-border bg-background z-100 flex min-w-72 max-w-[min(100vw-1rem,20rem)] flex-col overflow-hidden rounded-xl border shadow-md outline-none"
              {...getFloatingProps()}
            >
              <div className="border-border bg-background sticky top-0 z-10 shrink-0 border-b p-2">
                <div className="relative">
                  <MagnifyingGlassIcon
                    className="text-foreground-secondary pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    size="sm"
                    value={query}
                    placeholder="Search country or code"
                    autoComplete="off"
                    aria-label="Search countries"
                    className="pl-8"
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.stopPropagation()
                        handleOpenChange(false)
                      }
                    }}
                  />
                </div>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
                role="presentation"
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
                          event.preventDefault()
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
