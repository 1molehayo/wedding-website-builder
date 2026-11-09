import { Select } from '@/components/ui/select'
import type { SelectProps } from '@/components/ui/select'
import {
  CURATED_CURRENCIES,
  currencyDetailLabel,
  isCuratedCurrencyCode,
} from '@/lib/currency/currencies'
import { useOpenFeedback } from '@/lib/feedback/feedback-context'
import { cn } from '@/lib/utils'

type CurrencySelectProps = Omit<
  SelectProps,
  'children' | 'value' | 'onChange'
> & {
  value: string
  onChange: (value: string) => void
  /** Keep a non-curated value visible while editing legacy rows. */
  includeCodes?: string[]
  showRequestLink?: boolean
}

export function CurrencySelect({
  value,
  onChange,
  onBlur,
  invalid,
  includeCodes = [],
  showRequestLink = true,
  className,
  ...props
}: CurrencySelectProps) {
  const openFeedback = useOpenFeedback()
  const extras = includeCodes
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.length > 0 && !isCuratedCurrencyCode(code))
  const uniqueExtras = [...new Set(extras)]

  return (
    <div className="space-y-1.5">
      <Select
        value={value}
        invalid={invalid}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className={cn(className)}
        {...props}
      >
        {CURATED_CURRENCIES.map((item) => (
          <option key={item.code} value={item.code}>
            {currencyDetailLabel(item.code)}
          </option>
        ))}
        {uniqueExtras.map((code) => (
          <option key={code} value={code}>
            {code} (not in list — pick a supported currency)
          </option>
        ))}
      </Select>
      {showRequestLink ? (
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
