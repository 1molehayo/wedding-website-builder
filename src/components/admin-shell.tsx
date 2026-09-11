import { useEffect, useId, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  ArrowSquareOutIcon,
  BellIcon,
  ChatTeardropTextIcon,
  HeartIcon,
  ListIcon,
  SignOutIcon,
  XIcon,
} from '@phosphor-icons/react'
import { DonateModal } from '@/components/admin/donate-modal'
import { FeedbackModal } from '@/components/admin/feedback-modal'
import { NavigationProgress } from '@/components/navigation-progress'
import { Button } from '@/components/ui/button'
import { Toaster, toast } from '@/components/ui/toaster'
import { adminBreadcrumbs } from '@/lib/admin/breadcrumbs'
import { isSuperAdminProfile } from '@/lib/auth/roles'
import type { AdminSession } from '@/lib/auth/types'
import { adminFirstName } from '@/lib/auth/types'
import {
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
  PRODUCT_TAGLINE,
  formatCoupleNames,
  getAdminNavItems,
} from '@/lib/constants'
import { FALLBACK_PUBLIC_THEME } from '@/lib/site-settings'
import { publicWeddingPath } from '@/lib/wedding/public-settings'
import { cn } from '@/lib/utils'

function SidebarBrand() {
  return (
    <div className="shrink-0">
      <p className="font-serif text-xl italic">{PRODUCT_SHORT_NAME}</p>
      <p className="text-sidebar-foreground/60 mt-1 text-[0.65rem] tracking-[0.2em] uppercase">
        {PRODUCT_TAGLINE}
      </p>
      <p className="sr-only">{PRODUCT_NAME}</p>
    </div>
  )
}

function SidebarNav({
  navItems,
  onNavigate,
}: {
  navItems: ReturnType<typeof getAdminNavItems>
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto text-sm">
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="rounded-lg px-3 py-2 transition"
          activeOptions={{ exact: item.exact }}
          activeProps={{
            className: 'bg-accent/25 text-sidebar-foreground',
          }}
          inactiveProps={{
            className: 'text-sidebar-foreground/70 hover:bg-white/5',
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

function SidebarFooter({
  session,
  onDonate,
}: {
  session: AdminSession
  onDonate: () => void
}) {
  const wedding = session.wedding
  const previewHref = publicWeddingPath(wedding?.public_slug)
  const dateLabel = !wedding
    ? 'Wedding not set up'
    : wedding.wedding_date
      ? `${new Date(`${wedding.wedding_date}T00:00:00`).toLocaleDateString(
          undefined,
          { dateStyle: 'long' },
        )}${wedding.date_published_at ? '' : ' · draft'}`
      : 'Date to be announced'

  return (
    <div className="shrink-0 space-y-3 border-t border-white/10 pt-4">
      <div className="text-sm">
        <p className="font-serif italic">
          {wedding
            ? formatCoupleNames(wedding.groom_name, wedding.bride_name)
            : 'No wedding yet'}
        </p>
        <p className="text-sidebar-foreground/60 mt-1 text-xs">{dateLabel}</p>
        <p className="text-sidebar-foreground/60 mt-1 text-xs">
          {session.user.email}
        </p>
        <p className="text-sidebar-foreground/60 mt-1 text-xs">
          {adminFirstName(session.profile)}
        </p>
        {isSuperAdminProfile(session.profile) ? (
          <p className="text-sidebar-foreground/60 mt-1 text-xs tracking-wide uppercase">
            Super admin
          </p>
        ) : null}
      </div>
      {wedding ? (
        previewHref ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/20 bg-transparent text-sidebar-foreground hover:bg-white/10"
          >
            <a href={previewHref} target="_blank" rel="noreferrer">
              <ArrowSquareOutIcon />
              Preview site
            </a>
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/20 bg-transparent text-sidebar-foreground hover:bg-white/10"
          >
            <Link to="/admin/settings">Set public URL</Link>
          </Button>
        )
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-white/20 bg-transparent text-sidebar-foreground hover:bg-white/10"
        onClick={onDonate}
      >
        <HeartIcon />
        Donate
      </Button>
    </div>
  )
}

function AdminTopbar({
  onOpenNav,
  navOpen,
  onLogout,
  isLoggingOut,
  onFeedback,
}: {
  onOpenNav: () => void
  navOpen: boolean
  onLogout: () => void
  isLoggingOut?: boolean
  onFeedback: () => void
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const crumbs = adminBreadcrumbs(pathname)

  return (
    <header className="admin-topbar border-border bg-surface/95 sticky top-0 z-30 border-b">
      <div className="flex items-center gap-3 px-4 py-3 md:px-8">
        <Button
          type="button"
          size="sm"
          variant="outline"
          square
          className="md:hidden"
          aria-expanded={navOpen}
          aria-controls="admin-mobile-nav"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          onClick={onOpenNav}
        >
          {navOpen ? <XIcon /> : <ListIcon />}
        </Button>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1
              return (
                <li
                  key={`${crumb.label}-${index}`}
                  className="flex items-center gap-1.5"
                >
                  {index > 0 ? (
                    <span className="text-foreground-secondary" aria-hidden>
                      /
                    </span>
                  ) : null}
                  {crumb.to && !isLast ? (
                    <Link
                      to={crumb.to}
                      className="text-foreground-secondary hover:text-foreground truncate transition"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        'truncate',
                        isLast ? 'font-medium' : 'text-foreground-secondary',
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onFeedback}
          >
            <ChatTeardropTextIcon />
            <span className="hidden sm:inline">Feedback</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            square
            aria-label="Notifications"
            onClick={() => toast.message('Notifications are coming soon.')}
          >
            <BellIcon />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onLogout}
            isLoading={isLoggingOut}
          >
            <SignOutIcon />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

export function AdminShell({
  session,
  children,
  onLogout,
  isLoggingOut,
}: {
  session: AdminSession
  children: React.ReactNode
  onLogout: () => void
  isLoggingOut?: boolean
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [donateOpen, setDonateOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const titleId = useId()
  const navItems = getAdminNavItems(isSuperAdminProfile(session.profile), {
    hasWedding: Boolean(session.wedding),
  })

  useEffect(() => {
    const html = document.documentElement
    const previousTheme = html.dataset.theme
    const previousMode = html.dataset.mode
    const previousColorScheme = html.style.colorScheme
    html.dataset.theme = FALLBACK_PUBLIC_THEME
    html.dataset.mode = 'light'
    html.style.colorScheme = 'light'
    return () => {
      if (previousTheme) html.dataset.theme = previousTheme
      else delete html.dataset.theme
      if (previousMode) html.dataset.mode = previousMode
      else delete html.dataset.mode
      html.style.colorScheme = previousColorScheme
    }
  }, [])

  useEffect(() => {
    if (!mobileNavOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [mobileNavOpen])

  const closeMobileNav = () => setMobileNavOpen(false)
  const isContentLoading = useRouterState({
    select: (state) => state.isLoading,
  })

  useEffect(() => {
    if (isContentLoading) setMobileNavOpen(false)
  }, [isContentLoading])

  return (
    <div
      data-surface="admin"
      className="bg-background text-foreground min-h-dvh"
    >
      <NavigationProgress />
      <Toaster />
      <DonateModal open={donateOpen} onOpenChange={setDonateOpen} />
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        id="admin-mobile-nav"
        aria-labelledby={titleId}
        className={cn(
          'bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col gap-6 p-4 transition-transform duration-200 md:hidden',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          isContentLoading && 'pointer-events-none',
        )}
        inert={isContentLoading || undefined}
        aria-disabled={isContentLoading}
      >
        <span id={titleId} className="sr-only">
          Admin navigation
        </span>
        <SidebarBrand />
        <SidebarNav navItems={navItems} onNavigate={closeMobileNav} />
        <SidebarFooter
          session={session}
          onDonate={() => {
            closeMobileNav()
            setDonateOpen(true)
          }}
        />
      </aside>

      <div className="md:grid md:min-h-dvh md:grid-cols-[15rem_1fr]">
        <aside
          className={cn(
            'bg-sidebar text-sidebar-foreground sticky top-0 hidden h-dvh flex-col gap-6 p-4 md:flex',
            isContentLoading && 'pointer-events-none',
          )}
          inert={isContentLoading || undefined}
          aria-disabled={isContentLoading}
        >
          <SidebarBrand />
          <SidebarNav navItems={navItems} />
          <SidebarFooter
            session={session}
            onDonate={() => setDonateOpen(true)}
          />
        </aside>

        <div className="bg-background flex min-h-dvh min-w-0 flex-col md:min-h-full">
          <AdminTopbar
            onOpenNav={() => setMobileNavOpen((open) => !open)}
            navOpen={mobileNavOpen}
            onLogout={onLogout}
            isLoggingOut={isLoggingOut}
            onFeedback={() => setFeedbackOpen(true)}
          />
          <div
            className={cn(
              'flex min-h-0 min-w-0 flex-1 flex-col p-6 md:p-8',
              isContentLoading && 'pointer-events-none',
            )}
            aria-busy={isContentLoading}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
