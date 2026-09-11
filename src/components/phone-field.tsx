import { useMemo } from 'react'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  listPhoneCountries,
  sanitizeNationalNumber,
} from '@/lib/auth/phone'
import type { CountryCode } from '@/lib/auth/phone'

export function PhoneField({
  country,
  nationalNumber,
  onChange,
  invalid,
  error,
}: {
  country: CountryCode
  nationalNumber: string
  onChange: (next: { country: CountryCode; nationalNumber: string }) => void
  invalid?: boolean
  error?: string
}) {
  const countries = useMemo(() => listPhoneCountries(), [])

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
      <Field>
        <Field.Label>Country</Field.Label>
        <Field.Control>
          <Select
            value={country}
            onChange={(event) => {
              onChange({
                country: event.target.value as CountryCode,
                nationalNumber,
              })
            }}
          >
            {countries.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field.Control>
      </Field>
      <Field invalid={invalid}>
        <Field.Label>Phone number</Field.Label>
        <Field.Control>
          <Input
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
        {error ? (
          <Field.Error>{error}</Field.Error>
        ) : (
          <Field.Description>
            Optional. Digits only; country code comes from the dropdown.
          </Field.Description>
        )}
      </Field>
    </div>
  )
}
