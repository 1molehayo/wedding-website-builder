import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isSuperAdminProfile } from '@/lib/auth/roles'
import {
  adminFirstName,
  hasCompleteAdminName,
} from '@/lib/auth/types'
import { formatCoupleNames } from '@/lib/constants'
import { PUBLIC_THEME_META } from '@/lib/site-settings'
import type { WeddingStatus } from '@/lib/supabase/types'
import { publicWeddingPath } from '@/lib/wedding/public-settings'
import { WEDDING_STATUS_LABELS } from '@/lib/wedding/validation'
import { Route as AdminRoute } from './route'

function weddingStatusBadgeVariant(
  status: WeddingStatus,
): 'info' | 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'planning':
      return 'info'
    case 'date_confirmed':
      return 'warning'
    case 'invitations_sent':
      return 'success'
    case 'completed':
      return 'neutral'
  }
}

export const Route = createFileRoute('/admin/')({
  component: AdminOverviewPage,
})

function AdminOverviewPage() {
  const { session } = AdminRoute.useRouteContext()

  if (!session) {
    return null
  }

  const { wedding, profile } = session
  const isSuper = isSuperAdminProfile(profile)
  const firstName = adminFirstName(profile)
  const profileIncomplete = !hasCompleteAdminName(profile)

  if (!wedding) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="admin-page-title">Welcome, {firstName}</h1>
          <p className="text-foreground-secondary mt-2 text-sm">
            No wedding is set up yet.
            {isSuper
              ? ' You can invite an admin to complete onboarding, or set it up yourself.'
              : ' Complete onboarding to continue.'}
          </p>
        </div>

        {isSuper && profileIncomplete ? (
          <div className="bg-surface border-border rounded-xl border border-dashed p-4 text-sm">
            Your profile name looks incomplete.{' '}
            <Link to="/admin/profile" className="text-accent underline">
              Update your profile
            </Link>{' '}
            so we know what to call you.
          </div>
        ) : null}

        <div className="bg-surface border-border space-y-4 rounded-xl border border-dashed p-6">
          <p className="font-serif text-2xl italic">Wedding not set up</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="md">
              <Link to="/admin/onboarding">Set up wedding</Link>
            </Button>
            {isSuper ? (
              <Button asChild size="md" variant="outline">
                <Link to="/admin/admins">Invite admin</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  const previewHref = publicWeddingPath(wedding.public_slug)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="admin-page-title">Welcome, {firstName}</h1>
          <p className="text-foreground-secondary mt-2 text-sm">
            Wedding facts and public page blocks are editable from the sidebar.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-foreground-secondary text-xs tracking-[0.14em] uppercase">
              Status
            </span>
            <Badge
              variant={weddingStatusBadgeVariant(wedding.status)}
              size="sm"
            >
              {WEDDING_STATUS_LABELS[wedding.status]}
            </Badge>
          </div>
        </div>
        {previewHref ? (
          <Button asChild size="sm">
            <a href={previewHref} target="_blank" rel="noreferrer">
              <ArrowSquareOutIcon />
              Preview site
            </a>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/settings">Set public URL</Link>
          </Button>
        )}
      </div>

      {isSuper && profileIncomplete ? (
        <div className="bg-surface border-border rounded-xl border border-dashed p-4 text-sm">
          Your profile name looks incomplete.{' '}
          <Link to="/admin/profile" className="text-accent underline">
            Update your profile
          </Link>{' '}
          so we know what to call you.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-surface border-border rounded-xl border p-5">
          <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
            Couple
          </p>
          <p className="font-serif mt-2 text-2xl italic">
            {formatCoupleNames(wedding.groom_name, wedding.bride_name)}
          </p>
        </div>
        <div className="bg-surface border-border rounded-xl border p-5">
          <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
            Wedding date
          </p>
          <p className="font-serif mt-2 text-2xl italic">
            {wedding.wedding_date
              ? new Date(`${wedding.wedding_date}T00:00:00`).toLocaleDateString(
                  undefined,
                  { dateStyle: 'long' },
                )
              : 'To be announced'}
          </p>
          <p className="text-foreground-secondary mt-2 text-sm">
            {wedding.wedding_date
              ? wedding.date_published_at
                ? 'Published on the public site.'
                : 'Draft only — publish from Wedding settings to show guests.'
              : 'Nullable by design. No placeholder date is stored.'}
          </p>
        </div>
        <div className="bg-surface border-border rounded-xl border p-5">
          <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
            Public theme
          </p>
          <p className="mt-2 text-lg">
            {PUBLIC_THEME_META[wedding.active_public_theme].name}
          </p>
        </div>
      </div>
    </div>
  )
}
