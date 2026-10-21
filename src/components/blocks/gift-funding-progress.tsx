import { Badge } from '@/components/ui/badge'
import { formatNaira, getGiftFunding } from '@/lib/registry/funding'

export function GiftFundingProgress({
  title,
  scenarioLabel,
  targetPrice,
  contributions,
}: {
  title: string
  scenarioLabel?: string
  targetPrice: number
  contributions: readonly number[]
}) {
  const funding = getGiftFunding(targetPrice, contributions)
  const amount = formatNaira(funding.totalContributed)

  return (
    <article className="border-border space-y-4 border-b py-6 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-2xl italic md:text-3xl">{title}</h3>
          {scenarioLabel ? (
            <p className="text-foreground-secondary mt-2 text-xs tracking-[0.14em] uppercase">
              {scenarioLabel}
            </p>
          ) : null}
        </div>
        {funding.fullyFunded ? (
          <Badge variant="success" size="sm">
            Fully Funded
          </Badge>
        ) : null}
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-foreground-secondary text-xs tracking-[0.12em] uppercase">
            Target price
          </dt>
          <dd>{formatNaira(funding.targetPrice)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-foreground-secondary text-xs tracking-[0.12em] uppercase">
            Confirmed contributions
          </dt>
          <dd>{amount}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-foreground-secondary text-xs tracking-[0.12em] uppercase">
            Remaining balance
          </dt>
          <dd>{formatNaira(funding.remaining)}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs tracking-[0.12em] uppercase">
          <span className="text-foreground-secondary">Funding</span>
          <span>{funding.percentage}%</span>
        </div>
        <div
          className="bg-foreground/10 h-2 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={funding.percentage}
          aria-valuetext={
            funding.fullyFunded
              ? `${funding.percentage}%, Fully Funded`
              : `${funding.percentage}%`
          }
          aria-label={`${title} funding progress`}
        >
          <div
            className="bg-accent h-full rounded-full"
            style={{ width: `${funding.percentage}%` }}
          />
        </div>
      </div>
    </article>
  )
}
