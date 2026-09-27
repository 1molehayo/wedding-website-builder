import { useEffect, useRef, useState } from 'react'
import { CheckIcon } from '@phosphor-icons/react'
import { InvitationCard } from '@/components/invitation/invitation-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  INVITATION_CATEGORIES,
  INVITATION_DESIGNS,
  categoryLabel,
  compositionLabel,
  filterInvitationDesigns,
} from '@/lib/invitation/designs'
import type {
  InvitationCategoryFilter,
  InvitationDesignId,
} from '@/lib/invitation/designs'
import type { ColorMode, PublicThemeId } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

const CARD_WIDTH_REM = 24

function DesignThumbnail({
  design,
  theme,
  mode,
  content,
}: {
  design: InvitationDesignId
  theme: PublicThemeId
  mode: ColorMode
  content: {
    groomName: string
    brideName: string
    weddingDate: string | null
    venueName: string | null
    venueLocation: string | null
  }
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.22)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const update = () => {
      const rootSize = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      )
      const cardWidth =
        CARD_WIDTH_REM * (Number.isFinite(rootSize) ? rootSize : 16)
      setScale(frame.clientWidth / cardWidth)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={frameRef}
      aria-hidden
      className="relative aspect-3/5 w-full overflow-hidden rounded-md"
    >
      <div
        data-theme={theme}
        data-mode={mode}
        className="bg-background text-foreground pointer-events-none absolute top-0 left-0 h-160 w-96 origin-top-left"
        style={{ transform: `scale(${scale})` }}
      >
        <InvitationCard design={design} content={content} />
      </div>
    </div>
  )
}

const CATEGORY_TABS: { id: InvitationCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...INVITATION_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
  })),
]

export function InvitationDesignPicker({
  theme,
  groomName,
  brideName,
  weddingDate,
  venueName,
  venueLocation,
}: {
  theme: PublicThemeId
  groomName: string
  brideName: string
  weddingDate: string | null
  venueName: string
  venueLocation: string
}) {
  const [mode, setMode] = useState<ColorMode>('light')
  const [category, setCategory] = useState<InvitationCategoryFilter>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<InvitationDesignId>(
    INVITATION_DESIGNS[0].id,
  )
  const previewRef = useRef<HTMLDivElement>(null)
  const skipPreviewScroll = useRef(true)

  useEffect(() => {
    if (skipPreviewScroll.current) {
      skipPreviewScroll.current = false
      return
    }

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    previewRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [selected])
  const selectedDesign =
    INVITATION_DESIGNS.find((design) => design.id === selected) ??
    INVITATION_DESIGNS[0]
  const visible = filterInvitationDesigns(category, query)
  const content = {
    groomName: groomName.trim() || 'Groom',
    brideName: brideName.trim() || 'Bride',
    weddingDate,
    venueName: venueName.trim() || null,
    venueLocation: venueLocation.trim() || null,
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
          Invitation design
        </p>
        <p className="text-foreground-secondary mt-1 max-w-xl text-sm">
          Filter by category, or search by name and tag. Preview uses the colour
          theme above. The guest email does not include this card yet.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          role="tablist"
          aria-label="Invitation categories"
          className="flex gap-1 overflow-x-auto"
        >
          {CATEGORY_TABS.map((tab) => {
            const isSelected = category === tab.id
            return (
              <Button
                key={tab.id}
                type="button"
                role="tab"
                size="sm"
                aria-selected={isSelected}
                variant={isSelected ? 'primary' : 'outline'}
                onClick={() => setCategory(tab.id)}
              >
                {tab.label}
              </Button>
            )
          })}
        </div>
        <Input
          size="sm"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or tag"
          aria-label="Search invitation designs"
          className="sm:max-w-xs"
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {visible.length} designs
      </p>

      {visible.length === 0 ? (
        <p className="text-foreground-secondary text-sm">
          No designs match that search.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((design) => {
            const isSelected = selected === design.id
            const tags = design.compositions.map((id) => compositionLabel(id))
            return (
              <button
                key={design.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelected(design.id)}
                className={cn(
                  'border-border bg-surface flex items-start gap-3 rounded-xl border p-3 text-left transition',
                  isSelected
                    ? 'border-accent ring-ring ring-2'
                    : 'hover:border-foreground/20',
                )}
              >
                <div className="w-21 shrink-0">
                  <DesignThumbnail
                    design={design.id}
                    theme={theme}
                    mode={mode}
                    content={content}
                  />
                </div>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{design.name}</p>
                    <p className="text-foreground-secondary mt-1 text-xs leading-relaxed">
                      {design.description}
                    </p>
                    <p className="text-foreground-secondary mt-2 text-[0.65rem] tracking-wide">
                      {tags.join(' · ')}
                      <span className="sr-only">
                        {' '}
                        Categories{' '}
                        {design.categories
                          .map((id) => categoryLabel(id))
                          .join(', ')}
                      </span>
                    </p>
                  </div>
                  {isSelected ? (
                    <span className="bg-accent text-accent-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full">
                      <CheckIcon className="size-3.5" weight="bold" />
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div
        ref={previewRef}
        className="border-border bg-background-secondary/40 scroll-mt-24 space-y-3 rounded-xl border border-dashed p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
              Preview: {selectedDesign.name}
            </p>
            <p className="text-foreground-secondary mt-1 text-xs">
              Names, date, and venue. The website and RSVP link stay in the
              email.
            </p>
          </div>
          <div className="flex gap-1">
            {(['light', 'dark'] as const).map((next) => (
              <Button
                key={next}
                type="button"
                size="sm"
                variant={mode === next ? 'primary' : 'outline'}
                onClick={() => setMode(next)}
              >
                {next === 'light' ? 'Light' : 'Dark'}
              </Button>
            ))}
          </div>
        </div>

        <div
          data-theme={theme}
          data-mode={mode}
          className="bg-background text-foreground mx-auto h-160 w-full max-w-sm overflow-hidden rounded-sm shadow-sm"
        >
          <InvitationCard design={selected} content={content} />
        </div>
      </div>
    </div>
  )
}
