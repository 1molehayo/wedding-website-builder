import { useMemo } from 'react'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { listPhoneCountries, sanitizeNationalNumber } from '@/lib/auth/phone'
import type { CountryCode } from '@/lib/auth/phone'

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

  return (
    <Field invalid={invalid}>
      <Field.Label required={required}>{label}</Field.Label>
      <div className="grid grid-cols-[minmax(9.5rem,12.5rem)_minmax(0,1fr)] gap-2">
        <Select
          aria-label="Country"
          value={country}
          invalid={invalid}
          onChange={(event) => {
            onChange({
              country: event.target.value as CountryCode,
              nationalNumber,
            })
          }}
        >
          {countries.map((item) => (
            <option key={item.code} value={item.code}>
              {item.flag} {item.name} (+{item.callingCode})
            </option>
          ))}
        </Select>
        <Field.Control>
          <Input
            aria-label="Phone number"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="Phone number"
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
      </div>
      <Field.Error>{error || null}</Field.Error>
      {!error && hint ? <Field.Description>{hint}</Field.Description> : null}
    </Field>
  )
}
