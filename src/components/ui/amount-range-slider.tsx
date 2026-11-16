import { cn } from '@/lib/utils'

type AmountRangeSliderProps = {
  min: number
  max: number
  valueMin: number
  valueMax: number
  step?: number
  currencyLabel?: string
  onChange: (next: { min: number; max: number }) => void
  className?: string
}

function formatAmount(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

export function AmountRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  step = 1,
  currencyLabel,
  onChange,
  className,
}: AmountRangeSliderProps) {
  const span = Math.max(max - min, 0)
  const leftPct = span === 0 ? 0 : ((valueMin - min) / span) * 100
  const rightPct = span === 0 ? 100 : ((valueMax - min) / span) * 100

  return (
    <div className={cn('space-y-3', className)}>
      <div className="text-foreground-secondary flex items-center justify-between gap-2 text-xs tabular-nums">
        <span>
          {formatAmount(valueMin)}
          {currencyLabel ? ` ${currencyLabel}` : ''}
        </span>
        <span>
          {formatAmount(valueMax)}
          {currencyLabel ? ` ${currencyLabel}` : ''}
        </span>
      </div>
      <div className="relative h-6">
        <div className="bg-border absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full" />
        <div
          className="bg-foreground absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <input
          type="range"
          aria-label="Minimum amount"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          disabled={span === 0}
          onChange={(event) => {
            const nextMin = Number(event.target.value)
            onChange({
              min: Math.min(nextMin, valueMax),
              max: valueMax,
            })
          }}
          className="pointer-events-none absolute inset-0 z-10 m-0 h-6 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"
        />
        <input
          type="range"
          aria-label="Maximum amount"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          disabled={span === 0}
          onChange={(event) => {
            const nextMax = Number(event.target.value)
            onChange({
              min: valueMin,
              max: Math.max(nextMax, valueMin),
            })
          }}
          className="pointer-events-none absolute inset-0 z-20 m-0 h-6 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-30 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"
        />
      </div>
    </div>
  )
}
