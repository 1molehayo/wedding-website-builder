import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { AddressSearchField } from '@/components/address-search-field'
import { PageActionBar } from '@/components/admin/page-action-bar'
import { ThemePicker } from '@/components/admin/theme-picker'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { isSuperAdminProfile } from '@/lib/auth/roles'
import type { PublicThemeId } from '@/lib/site-settings'
import { completeOnboarding } from '@/lib/wedding/onboarding'
import { formatWeddingDate } from '@/lib/wedding/public-settings'
import { Route as AdminRoute } from './route'

export const Route = createFileRoute('/admin/onboarding')({
  component: AdminOnboardingPage,
})

function AdminOnboardingPage() {
  const { session } = AdminRoute.useRouteContext()
  const navigate = useNavigate()
  const router = useRouter()

  const [groomName, setGroomName] = useState('')
  const [brideName, setBrideName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [venueName, setVenueName] = useState('')
  const [venueLocation, setVenueLocation] = useState('')
  const [dressCode, setDressCode] = useState('')
  const [theme, setTheme] = useState<PublicThemeId>('celeste')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!session) {
    return null
  }

  const isSuper = isSuperAdminProfile(session.profile)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await completeOnboarding({
        data: {
          groom_name: groomName,
          bride_name: brideName,
          wedding_date: weddingDate || null,
          venue_name: venueName || null,
          venue_location: venueLocation || null,
          dress_code: dressCode || null,
          active_public_theme: theme,
        },
      })
      toast.success(
        'Wedding created. You can refine details anytime in settings.',
      )
      await router.invalidate()
      await navigate({ to: '/admin' })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to complete onboarding.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="admin-page-title">Set up your wedding</h1>
        <p className="text-foreground-secondary mt-2 text-sm">
          {isSuper
            ? 'Required before settings and page content. You can invite an admin to complete this, or fill it in yourself.'
            : 'Complete this form to create the wedding record. Groom and bride names are required; everything else is optional for now.'}
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="bg-surface border-border space-y-4 rounded-xl border p-5">
          <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
            Required
          </p>
          <div className="grid items-start gap-4 md:grid-cols-2">
            <Field>
              <Field.Label>Groom</Field.Label>
              <Field.Control>
                <Input
                  value={groomName}
                  onChange={(event) => setGroomName(event.target.value)}
                  required
                />
              </Field.Control>
            </Field>
            <Field>
              <Field.Label>Bride</Field.Label>
              <Field.Control>
                <Input
                  value={brideName}
                  onChange={(event) => setBrideName(event.target.value)}
                  required
                />
              </Field.Control>
            </Field>
          </div>
        </div>

        <div className="bg-surface border-border space-y-4 rounded-xl border p-5">
          <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
            Optional
          </p>
          <Field>
            <Field.Label>Wedding date</Field.Label>
            <Field.Control>
              <Input
                type="date"
                value={weddingDate}
                onChange={(event) => setWeddingDate(event.target.value)}
              />
            </Field.Control>
            <Field.Description>
              Leave empty for “date to be announced”.
            </Field.Description>
          </Field>
          <Field>
            <Field.Label>Venue name</Field.Label>
            <Field.Control>
              <Input
                value={venueName}
                onChange={(event) => setVenueName(event.target.value)}
              />
            </Field.Control>
          </Field>
          <AddressSearchField
            value={venueLocation}
            onChange={setVenueLocation}
          />
          <Field>
            <Field.Label>Dress code</Field.Label>
            <Field.Control>
              <Textarea
                rows={3}
                value={dressCode}
                onChange={(event) => setDressCode(event.target.value)}
              />
            </Field.Control>
          </Field>
          <ThemePicker
            value={theme}
            onChange={setTheme}
            groomName={groomName || 'Groom'}
            brideName={brideName || 'Bride'}
            weddingDateLabel={formatWeddingDate(weddingDate || null)}
          />
        </div>

        <PageActionBar>
          <Button type="submit" size="md" isLoading={isSubmitting}>
            Create wedding
          </Button>
          {isSuper ? (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => navigate({ to: '/admin' })}
            >
              Skip for now
            </Button>
          ) : null}
        </PageActionBar>
      </form>
    </div>
  )
}
