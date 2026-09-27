import { useEffect, useRef, useState } from 'react'
import { ColorModeToggle } from '@/components/color-mode-toggle'
import { PublicRevealObserver } from '@/components/public-reveal-observer'
import { PRODUCT_NAME } from '@/lib/constants'
import { FALLBACK_PUBLIC_THEME } from '@/lib/site-settings'
import type { PublicThemeId } from '@/lib/site-settings'
import type { PublicSectionNavItem } from '@/lib/page-blocks/types'
import { formatWeddingDate } from '@/lib/wedding/public-settings'
import { cn } from '@/lib/utils'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollToSection(sectionId: string, behavior?: ScrollBehavior) {
  const el = document.getElementById(sectionId)
  if (!el) return false

  el.scrollIntoView({
    behavior: behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth'),
    block: 'start',
  })

  return true
}

function writeHash(hash: string, mode: 'push' | 'replace') {
  const nextHash = hash.startsWith('#') ? hash : `#${hash}`
  if (mode === 'replace' && window.location.hash === nextHash) return

  const id = decodeURIComponent(nextHash.slice(1))
  const target = document.getElementById(id)
  // Drop the id while the URL fragment changes so the browser does not
  // smooth-scroll to that section. `scroll-behavior: smooth` on <html>
  // turns a hash update into a scroll animation.
  if (target) target.removeAttribute('id')

  const url = `${window.location.pathname}${window.location.search}${nextHash}`
  if (mode === 'push') window.history.pushState(null, '', url)
  else window.history.replaceState(null, '', url)

  if (target) target.id = id
}

function replaceHashWhileScrolling(hash: string) {
  const root = document.documentElement
  const previousBehavior = root.style.scrollBehavior
  const x = window.scrollX
  const y = window.scrollY
  root.style.scrollBehavior = 'auto'
  writeHash(hash, 'replace')
  window.scrollTo(x, y)
  window.requestAnimationFrame(() => {
    const jumped =
      Math.abs(window.scrollY - y) > 48 || Math.abs(window.scrollX - x) > 48
    if (jumped) window.scrollTo(x, y)
    root.style.scrollBehavior = previousBehavior
  })
}

function onSectionNavClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  sectionId: string,
  onSelect: (id: string) => void,
) {
  event.preventDefault()
  if (scrollToSection(sectionId)) onSelect(sectionId)
}

function SectionNav({
  items,
  className,
  ariaLabel,
  activeId,
  onSelect,
}: {
  items: PublicSectionNavItem[]
  className?: string
  ariaLabel: string
  activeId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          data-active={activeId === item.id ? 'true' : 'false'}
          onClick={(event) => onSectionNavClick(event, item.id, onSelect)}
          title={item.fullLabel}
          aria-label={item.fullLabel}
          className="public-section-nav-link text-foreground-secondary hover:text-foreground shrink-0 text-xs tracking-[0.16em] uppercase transition"
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}

export function PublicShell({
  children,
  className,
  theme = FALLBACK_PUBLIC_THEME,
  coupleLabel = 'Wedding',
  weddingDate = null,
  showWeddingDate = true,
  sectionNav = [],
  homePath = '/',
}: {
  children: React.ReactNode
  className?: string
  theme?: PublicThemeId
  coupleLabel?: string
  weddingDate?: string | null
  /** When false, footer omits the date line (e.g. RSVP error). */
  showWeddingDate?: boolean
  sectionNav?: PublicSectionNavItem[]
  /** Couple brand link target (wedding slug path). */
  homePath?: string
}) {
  const showSectionNav = sectionNav.length > 1
  const headerRef = useRef<HTMLElement>(null)
  const urlSyncReady = useRef(false)
  const didApplyHash = useRef(false)
  const pendingScrollId = useRef<string | null>(null)
  const sectionIds = sectionNav.map((item) => item.id).join('|')
  const [activeId, setActiveId] = useState<string | null>(
    sectionNav[0]?.id ?? null,
  )
  const selectSection = (sectionId: string) => {
    pendingScrollId.current = sectionId
    setActiveId(sectionId)
    writeHash(sectionId, 'push')
    window.setTimeout(() => {
      if (pendingScrollId.current === sectionId) pendingScrollId.current = null
    }, 1200)
  }
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty(
        '--public-header-height',
        `${header.offsetHeight}px`,
      )
    }

    syncHeaderHeight()
    const observer = new ResizeObserver(syncHeaderHeight)
    observer.observe(header)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--public-header-height')
    }
  }, [showSectionNav])

  useEffect(() => {
    if (didApplyHash.current) {
      urlSyncReady.current = true
      return
    }

    const hash = window.location.hash.replace(/^#/, '')
    const known = Boolean(hash) && sectionIds.split('|').includes(hash)
    if (!known) {
      didApplyHash.current = true
      urlSyncReady.current = true
      return
    }

    const frame = window.requestAnimationFrame(() => {
      scrollToSection(hash, 'auto')
      setActiveId(hash)
      didApplyHash.current = true
      urlSyncReady.current = true
    })
    return () => window.cancelAnimationFrame(frame)
  }, [sectionIds])

  useEffect(() => {
    if (!urlSyncReady.current || !activeId) return
    const nextHash = `#${activeId}`
    if (window.location.hash === nextHash) return
    replaceHashWhileScrolling(nextHash)
  }, [activeId])

  useEffect(() => {
    if (!showSectionNav) return

    const sections = sectionNav
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el))

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const entry = visible.at(0)
        if (!entry) return
        if (pendingScrollId.current) {
          if (entry.target.id !== pendingScrollId.current) return
          pendingScrollId.current = null
        }
        setActiveId(entry.target.id)
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0.1, 0.35, 0.6] },
    )

    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [sectionNav, showSectionNav])

  return (
    <div
      className={cn(
        'public-shell flex min-h-dvh flex-col bg-background text-foreground',
        className,
      )}
      data-public-theme={theme}
    >
      <PublicRevealObserver />
      <header
        ref={headerRef}
        className={cn(
          'sticky top-0 z-30 transition-[background-color,border-color,backdrop-filter] duration-200',
          scrolled
            ? 'border-b border-border/40 bg-background/95 backdrop-blur-md'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 md:gap-4 md:px-6">
          <a
            href={homePath}
            className="font-serif truncate text-lg italic md:text-xl"
          >
            {coupleLabel}
          </a>
          <div className="flex min-w-0 items-center gap-2 md:gap-4">
            {showSectionNav ? (
              <SectionNav
                items={sectionNav}
                ariaLabel="Page sections"
                className="hidden items-center gap-4 sm:flex"
                activeId={activeId}
                onSelect={selectSection}
              />
            ) : null}
            <ColorModeToggle />
          </div>
        </div>
        {showSectionNav ? (
          <div
            className={cn(
              'px-4 py-2.5 sm:hidden',
              scrolled
                ? 'border-border border-t'
                : 'border-t border-transparent',
            )}
          >
            <SectionNav
              items={sectionNav}
              ariaLabel="Page sections"
              className="public-section-nav-scroll mx-auto flex max-w-5xl items-center gap-4"
              activeId={activeId}
              onSelect={selectSection}
            />
          </div>
        ) : null}
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-border mt-auto border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-10 text-center md:py-12">
          <p className="font-serif text-2xl italic md:text-3xl">
            {coupleLabel}
          </p>
          {showWeddingDate ? (
            <p className="text-foreground-secondary text-sm tracking-[0.12em] uppercase">
              {formatWeddingDate(weddingDate)}
            </p>
          ) : null}
          <p className="text-foreground-secondary mt-4 text-xs tracking-[0.14em] uppercase">
            © {new Date().getFullYear()} {PRODUCT_NAME}
          </p>
          {/* <p className="text-foreground-secondary text-sm">
            <Link
              to="/"
              className="text-foreground underline-offset-4 transition hover:underline"
            >
              {productBuiltWithCredit()}
            </Link>
          </p> */}
        </div>
      </footer>
    </div>
  )
}
