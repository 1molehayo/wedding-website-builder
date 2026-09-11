import {
  Link,
  createFileRoute,
  notFound,
  redirect,
} from '@tanstack/react-router'
import { DynamicBlock } from '@/components/blocks/dynamic-block'
import { RegistrySection } from '@/components/blocks/registry-section'
import { PublicShell } from '@/components/public-shell'
import { getAppUrl } from '@/lib/app-url'
import { formatCoupleNames } from '@/lib/constants'
import { getPublicHomeData } from '@/lib/page-blocks/settings'
import { getPublicSectionNav } from '@/lib/page-blocks/types'
import { isReservedPublicSlug } from '@/lib/wedding/slug'
import { formatWeddingDate } from '@/lib/wedding/public-settings'

function buildPublicDescription(input: {
  coupleLabel: string
  weddingDate: string | null
  venueName: string | null
  venueLocation: string | null
}) {
  const dateLabel = formatWeddingDate(input.weddingDate)
  const venue =
    [input.venueName, input.venueLocation].filter(Boolean).join(' · ') || null

  const parts = [input.coupleLabel]
  if (dateLabel !== 'Date to be announced') {
    parts.push(dateLabel)
  }
  if (venue) {
    parts.push(venue)
  }

  if (parts.length === 1) {
    return `${input.coupleLabel} wedding website.`
  }
  return `${parts.join(' · ')}.`
}

type PublicHomeSearch = {
  preview?: boolean
}

function parsePreviewFlag(value: unknown) {
  return value === true || value === '1' || value === 'true'
}

export const Route = createFileRoute('/$weddingSlug')({
  validateSearch: (search: Record<string, unknown>): PublicHomeSearch => {
    return parsePreviewFlag(search.preview) ? { preview: true } : {}
  },
  loaderDeps: ({ search }: { search: PublicHomeSearch }) => ({
    preview: Boolean(search.preview),
  }),
  beforeLoad: ({ params }) => {
    // Prefer redirects for platform paths so a match race never flashes 404
    // while navigating into /admin (same rule as FCP: notFound = missing resource only).
    if (params.weddingSlug === 'admin') {
      throw redirect({ to: '/admin' })
    }
    if (params.weddingSlug === 'design') {
      throw redirect({ to: '/design' })
    }
    if (isReservedPublicSlug(params.weddingSlug)) {
      throw notFound()
    }
  },
  loader: async ({ params, deps }) => {
    try {
      return await getPublicHomeData({
        data: { slug: params.weddingSlug, preview: deps.preview },
      })
    } catch {
      throw notFound()
    }
  },
  head: ({ loaderData, params }) => {
    const coupleLabel = loaderData
      ? formatCoupleNames(loaderData.groom_name, loaderData.bride_name)
      : 'Wedding'
    const description = loaderData
      ? buildPublicDescription({
          coupleLabel,
          weddingDate: loaderData.wedding_date,
          venueName: loaderData.venue_name,
          venueLocation: loaderData.venue_location,
        })
      : `${coupleLabel} wedding website.`

    const origin = getAppUrl()
    const canonicalPath = `/${params.weddingSlug}`
    const canonicalUrl = `${origin}${canonicalPath}`
    const ogImage = loaderData?.ogImagePath
      ? `${origin}/api/photo?path=${encodeURIComponent(loaderData.ogImagePath)}`
      : undefined
    const isPlanning = loaderData?.status === 'planning'
    const hideFromIndex = isPlanning || Boolean(loaderData?.isPreview)

    return {
      meta: [
        { title: coupleLabel },
        { name: 'description', content: description },
        ...(hideFromIndex
          ? [{ name: 'robots', content: 'noindex,nofollow' }]
          : []),
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:title', content: coupleLabel },
        { property: 'og:description', content: description },
        ...(ogImage
          ? [
              { property: 'og:image', content: ogImage },
              { name: 'twitter:card', content: 'summary_large_image' },
              { name: 'twitter:image', content: ogImage },
            ]
          : [{ name: 'twitter:card', content: 'summary' }]),
        { name: 'twitter:title', content: coupleLabel },
        { name: 'twitter:description', content: description },
      ],
      links: [{ rel: 'canonical', href: canonicalUrl }],
    }
  },
  component: WeddingPublicPage,
})

function WeddingPublicPage() {
  const home = Route.useLoaderData()
  const { weddingSlug } = Route.useParams()
  const sectionNav = [
    ...getPublicSectionNav(home.page_blocks),
    ...(home.registry.hasContent
      ? [{ id: 'registry', label: 'Registry' }]
      : []),
  ]

  return (
    <>
      {home.isPreview ? (
        <div className="bg-foreground text-background relative z-50 px-4 py-2 text-center text-sm">
          Draft preview — not live.{' '}
          <Link to="/admin/pages" className="underline underline-offset-2">
            Back to editor
          </Link>
        </div>
      ) : null}
      <PublicShell
        theme={home.active_public_theme}
        coupleLabel={formatCoupleNames(home.groom_name, home.bride_name)}
        weddingDate={home.wedding_date}
        sectionNav={sectionNav}
        homePath={`/${weddingSlug}`}
      >
        <main>
          {home.page_blocks.map((block) => (
            <DynamicBlock
              key={block.id}
              block={block}
              wedding={home}
              imageUrl={home.imageUrls[block.id]}
            />
          ))}
          <RegistrySection initial={home.registry} />
        </main>
      </PublicShell>
    </>
  )
}
