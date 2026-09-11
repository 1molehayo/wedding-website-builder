import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
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

export const Route = createFileRoute('/$weddingSlug')({
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
  loader: async ({ params }) => {
    try {
      return await getPublicHomeData({ data: { slug: params.weddingSlug } })
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

    return {
      meta: [
        { title: coupleLabel },
        { name: 'description', content: description },
        ...(isPlanning
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
  )
}
