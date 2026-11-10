import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
} from 'libphonenumber-js'
import examples from 'libphonenumber-js/mobile/examples'
import type { CountryCode } from 'libphonenumber-js'

export type { CountryCode }

const regionNames =
  typeof Intl !== 'undefined'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null

export type CountryOption = {
  code: CountryCode
  callingCode: string
  name: string
  flag: string
  label: string
}

/** Regional-indicator flag for an ISO country code. */
export function countryFlagEmoji(code: CountryCode): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

let cachedCountries: CountryOption[] | null = null

export function listPhoneCountries(): CountryOption[] {
  if (cachedCountries) return cachedCountries

  cachedCountries = getCountries()
    .map((code) => {
      const callingCode = getCountryCallingCode(code)
      const name = regionNames?.of(code) ?? code
      const flag = countryFlagEmoji(code)
      return {
        code,
        callingCode,
        name,
        flag,
        label: `${flag} ${name} (+${callingCode})`,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))

  return cachedCountries
}

function isSupportedCountry(code: string): code is CountryCode {
  return getCountries().includes(code as CountryCode)
}

/** Region from a BCP 47 tag like `en-GB` → `GB`. */
function regionFromLocaleTag(tag: string): string | null {
  try {
    const region = new Intl.Locale(tag).maximize().region
    return region ? region.toUpperCase() : null
  } catch {
    const match = tag.trim().match(/[-_]([A-Za-z]{2})$/)
    return match?.[1] ? match[1].toUpperCase() : null
  }
}

/**
 * Best-effort default from the browser locale (no geolocation permission).
 * Falls back to NG when nothing valid can be inferred (SSR / unknown locale).
 */
export function defaultPhoneCountry(): CountryCode {
  if (typeof navigator !== 'undefined') {
    const tags = [...navigator.languages, navigator.language].filter(Boolean)

    for (const tag of tags) {
      const region = regionFromLocaleTag(tag)
      if (region && isSupportedCountry(region)) return region
    }
  }

  return 'NG'
}

/** Digits only for the national-number input. */
export function sanitizeNationalNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15)
}

/** Sample national number for the selected country (placeholder). */
export function exampleNationalNumber(country: CountryCode): string {
  const example = getExampleNumber(country, examples)
  if (!example) return 'Phone number'
  return (
    example.formatNational().replace(/^0/, '').trim() || example.nationalNumber
  )
}

export function toE164Phone(
  country: CountryCode,
  nationalNumber: string,
): string | null {
  const digits = sanitizeNationalNumber(nationalNumber)
  if (!digits) return null

  const callingCode = getCountryCallingCode(country)
  if (digits.startsWith(callingCode)) {
    throw new Error('Enter the number without the country code.')
  }

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
    return {
      country: defaultPhoneCountry(),
      nationalNumber: sanitizeNationalNumber(phone),
    }
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

export function formatStoredPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const parsed = parsePhoneNumberFromString(phone)
  return parsed?.formatInternational() ?? phone
}

export function toStoredPhone(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed =
    parsePhoneNumberFromString(trimmed) ??
    parsePhoneNumberFromString(trimmed, defaultPhoneCountry())
  return parsed?.isValid() ? parsed.format('E.164') : null
}
