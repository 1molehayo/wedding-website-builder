import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AdminShellPreview } from '@/components/admin-shell-preview'
import { PublicShell } from '@/components/public-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { applyColorMode, persistColorMode } from '@/lib/color-mode'
import { PUBLIC_THEME_META, PUBLIC_THEMES } from '@/lib/site-settings'
import type { ColorMode, PublicThemeId } from '@/lib/site-settings'
import { COLOR_MODES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Route as RootRoute } from './__root'

export const Route = createFileRoute('/design')({
  component: DesignShowcasePage,
})

function DesignShowcasePage() {
  const { publicTheme: activeTheme } = RootRoute.useLoaderData()
  const [previewTheme, setPreviewTheme] = useState<PublicThemeId>(activeTheme)
  const [previewMode, setPreviewMode] = useState<ColorMode>('light')

  useEffect(() => {
    document.documentElement.dataset.theme = previewTheme
    applyColorMode(previewMode)
  }, [previewTheme, previewMode])

  useEffect(() => {
    return () => {
      document.documentElement.dataset.theme = activeTheme
    }
  }, [activeTheme])

  return (
    <PublicShell theme={activeTheme}>
      <main className="mx-auto max-w-5xl space-y-16 px-4 py-12 md:px-6 md:py-16">
        <header className="space-y-4">
          <p className="public-kicker">Phase 2</p>
          <h1 className="public-section-title">Design foundation</h1>
          <p className="text-foreground-secondary max-w-2xl text-base leading-relaxed">
            Public themes are chosen in admin Wedding settings. Visitors only
            toggle light/dark. Preview below does not persist theme selection.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="public-section-title text-3xl!">Public themes</h2>
          <div className="flex flex-wrap gap-2">
            {PUBLIC_THEMES.map((themeId) => (
              <Button
                key={themeId}
                size="sm"
                variant={previewTheme === themeId ? 'primary' : 'outline'}
                onClick={() => setPreviewTheme(themeId)}
              >
                {PUBLIC_THEME_META[themeId].name}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {COLOR_MODES.map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={previewMode === mode ? 'primary' : 'outline'}
                onClick={() => {
                  setPreviewMode(mode)
                  persistColorMode(mode)
                }}
              >
                {mode}
              </Button>
            ))}
          </div>
          <div className="border-border bg-background-secondary rounded-2xl border p-8 text-center">
            <p className="public-kicker mb-6">We&apos;re getting married</p>
            <h3 className="public-display text-[clamp(3rem,10vw,5.5rem)]">
              Marvelous
              <br />
              <span className="text-highlight">&amp;</span>
              <br />
              Lillian
            </h3>
            <div className="bg-highlight mx-auto my-8 h-px w-20" />
            <p className="font-serif text-2xl">Date to be announced</p>
            <p className="text-foreground-secondary mt-2 text-sm tracking-[0.2em] uppercase">
              {PUBLIC_THEME_META[previewTheme].description}
            </p>
            <p className="text-foreground-secondary mt-4 text-xs">
              Suggested for: {PUBLIC_THEME_META[previewTheme].suggestedFor}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="public-section-title text-3xl!">
            Foundations primitives
          </h2>
          <div className="border-border bg-surface space-y-6 rounded-2xl border p-6">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button isLoading>Loading</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <Field.Label>Guest name</Field.Label>
                <Field.Control>
                  <Input placeholder="First and last name" />
                </Field.Control>
                <Field.Description>
                  Used later for invitations and RSVP.
                </Field.Description>
              </Field>
              <Field>
                <Field.Label>Note</Field.Label>
                <Field.Control>
                  <Textarea rows={3} placeholder="Optional message" />
                </Field.Control>
              </Field>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="public-section-title text-3xl!">Admin surface</h2>
          <p className="text-foreground-secondary max-w-2xl text-sm">
            Single admin appearance (no light/dark modes). Sidebar + cream
            content, Foundations components, Ournuptials-inspired structure.
          </p>
          <AdminShellPreview />
        </section>

        <section
          className={cn(
            'border-border text-foreground-secondary rounded-xl border border-dashed p-4 text-sm',
          )}
        >
          Active public theme from wedding settings:{' '}
          <strong className="text-foreground">
            {PUBLIC_THEME_META[activeTheme].name}
          </strong>
          . Change it under Admin → Wedding settings.
        </section>
      </main>
    </PublicShell>
  )
}
