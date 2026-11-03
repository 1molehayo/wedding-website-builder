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
import { CaretDownIcon } from '@phosphor-icons/react'
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
  const placeholder = useMemo(
    () => exampleNationalNumber(country),
    [country],
  )

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(320, availableHeight)}px`,
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
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="border-border bg-background z-50 min-w-64 overflow-y-auto rounded-xl border py-1 shadow-md outline-none"
              {...getFloatingProps()}
            >
              {countries.map((item) => {
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
                      setOpen(false)
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
              })}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </Field>
  )
}
