import { useMemo, useState } from 'react'
import { CheckIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { formatCoupleNames } from '@/lib/constants'
import { guestRsvpInviteEmailHtml } from '@/lib/email/templates'
import { PUBLIC_THEME_META, PUBLIC_THEMES } from '@/lib/site-settings'
import type { ColorMode, PublicThemeId } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

export function ThemePicker({
  value,
  onChange,
  groomName,
  brideName,
  weddingDateLabel,
}: {
  value: PublicThemeId
  onChange: (theme: PublicThemeId) => void
  groomName: string
  brideName: string
  weddingDateLabel: string
}) {
  const [previewMode, setPreviewMode] = useState<ColorMode>('light')
  const couple = formatCoupleNames(groomName, brideName)
  const meta = PUBLIC_THEME_META[value]

  const emailPreviewHtml = useMemo(
    () =>
      guestRsvpInviteEmailHtml({
        guestName: 'Guest',
        coupleLabel: couple,
        weddingDateLabel,
        websiteUrl: null,
        rsvpUrl: 'https://example.com/rsvp/preview',
        photosUrl: null,
        theme: value,
        mode: previewMode,
      }),
    [couple, previewMode, value, weddingDateLabel],
  )

  return (
    <div className="space-y-5">
      <div>
        <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
          Colour theme
        </p>
        <p className="text-foreground-secondary mt-1 text-sm">
          Applies to your public wedding site and guest invitation emails. The
          admin console stays on its own look.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PUBLIC_THEMES.map((themeId) => {
          const item = PUBLIC_THEME_META[themeId]
          const selected = value === themeId
          return (
            <button
              key={themeId}
              type="button"
              onClick={() => onChange(themeId)}
              className={cn(
                'border-border bg-surface rounded-xl border p-4 text-left transition',
                selected
                  ? 'border-accent ring-ring ring-2'
                  : 'hover:border-foreground/20',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-foreground-secondary mt-1 text-xs leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {selected ? (
                  <span className="bg-accent text-accent-foreground inline-flex size-6 items-center justify-center rounded-full">
                    <CheckIcon className="size-3.5" weight="bold" />
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex gap-1.5">
                {item.swatches.map((color) => (
                  <span
                    key={color}
                    className="border-border size-6 rounded-full border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>

      <div className="border-border bg-background-secondary/40 space-y-3 rounded-xl border border-dashed p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
              Preview: {meta.name}
            </p>
            <p className="text-foreground-secondary mt-1 text-xs">
              Not live. Hero and RSVP email use this theme. Sent invites use the
              light email palette.
            </p>
          </div>
          <div className="flex gap-1">
            {(['light', 'dark'] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={previewMode === mode ? 'primary' : 'outline'}
                onClick={() => setPreviewMode(mode)}
              >
                {mode === 'light' ? 'Light' : 'Dark'}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-foreground-secondary text-xs font-medium tracking-[0.14em] uppercase">
              Hero
            </p>
            <div
              data-theme={value}
              data-mode={previewMode}
              className="bg-background text-foreground w-full overflow-hidden rounded-xl border border-black/10 shadow-sm"
            >
              <div className="public-hero-atmosphere relative flex min-h-80 w-full flex-col items-center justify-center px-6 py-12 text-center sm:min-h-96">
                <p className="text-foreground-secondary text-[0.65rem] tracking-[0.18em] uppercase">
                  We&apos;re getting married
                </p>
                <p className="font-serif mt-3 text-4xl italic leading-tight sm:text-5xl">
                  {groomName}
                  <br />
                  <span className="text-highlight">&amp;</span>
                  <br />
                  {brideName}
                </p>
                <p className="font-serif mt-4 text-base">{weddingDateLabel}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-foreground-secondary text-xs font-medium tracking-[0.14em] uppercase">
              RSVP email
            </p>
            <div className="w-full overflow-hidden rounded-xl border border-black/10 shadow-sm">
              <iframe
                title={`RSVP email preview · ${meta.name} · ${previewMode}`}
                srcDoc={emailPreviewHtml}
                className="block h-112 w-full border-0"
                sandbox=""
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
