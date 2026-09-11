import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js'
import type { CountryCode } from 'libphonenumber-js'

export type { CountryCode }

const regionNames =
  typeof Intl !== 'undefined'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null

export type CountryOption = {
  code: CountryCode
  callingCode: string
  label: string
}

let cachedCountries: CountryOption[] | null = null

export function listPhoneCountries(): CountryOption[] {
  if (cachedCountries) return cachedCountries

  cachedCountries = getCountries()
    .map((code) => {
      const callingCode = getCountryCallingCode(code)
      const name = regionNames?.of(code) ?? code
      return {
        code,
        callingCode,
        label: `${name} (+${callingCode})`,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))

  return cachedCountries
}

export function defaultPhoneCountry(): CountryCode {
  return 'NG'
}

/** Digits only for the national-number input. */
export function sanitizeNationalNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15)
}

export function toE164Phone(
  country: CountryCode,
  nationalNumber: string,
): string | null {
  const digits = sanitizeNationalNumber(nationalNumber)
  if (!digits) return null

  const parsed = parsePhoneNumberFromString(digits, country)
  if (!parsed || !parsed.isValid()) {
    throw new Error('Enter a valid phone number for the selected country.')
  }
  return parsed.format('E.164')
}

export function parseStoredPhone(phone: string | null | undefined): {
  country: CountryCode
  nationalNumber: string
} {
  if (!phone) {
    return { country: defaultPhoneCountry(), nationalNumber: '' }
  }

  const parsed = parsePhoneNumberFromString(phone)
  if (!parsed) {
    return { country: defaultPhoneCountry(), nationalNumber: sanitizeNationalNumber(phone) }
  }

  return {
    country: parsed.country ?? defaultPhoneCountry(),
    nationalNumber: parsed.nationalNumber,
  }
}

export function isValidOptionalPhone(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  const parsed =
    parsePhoneNumberFromString(trimmed) ??
    parsePhoneNumberFromString(trimmed, defaultPhoneCountry())
  return Boolean(parsed?.isValid())
}

export function toStoredPhone(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed =
    parsePhoneNumberFromString(trimmed) ??
    parsePhoneNumberFromString(trimmed, defaultPhoneCountry())
  return parsed?.isValid() ? parsed.format('E.164') : null
}
