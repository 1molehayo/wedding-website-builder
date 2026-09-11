import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PublicShell } from '@/components/public-shell'
import { getPhotoShareViewer } from '@/lib/photo-shares/photo-shares'
import type { PhotoShareViewerData } from '@/lib/photo-shares/photo-shares'

type ViewerResult =
  | { ok: true; data: PhotoShareViewerData }
  | { ok: false; message: string }

type PhotoShareSearch = {
  g?: string
}

export const Route = createFileRoute('/photos/$token')({
  validateSearch: (search: Record<string, unknown>): PhotoShareSearch => {
    const g = typeof search.g === 'string' ? search.g.trim() : undefined
    return g ? { g } : {}
  },
  loaderDeps: ({ search }: { search: PhotoShareSearch }) => ({
    guestRsvpToken: search.g,
  }),
  loader: async ({ params, deps }): Promise<ViewerResult> => {
    try {
      const data = await getPhotoShareViewer({
        data: {
          token: params.token,
          guestRsvpToken: deps.guestRsvpToken,
        },
      })
      return { ok: true, data }
    } catch (cause) {
      return {
        ok: false,
        message:
          cause instanceof Error
            ? cause.message
            : 'This photo share link is invalid or has expired.',
      }
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData || !loaderData.ok) {
      return {
        meta: [
          { title: 'Private photos' },
          { name: 'robots', content: 'noindex,nofollow' },
        ],
      }
    }
    return {
      meta: [
        {
          title: `${loaderData.data.groupName}: ${loaderData.data.coupleLabel}`,
        },
        {
          name: 'description',
          content: `Private photos shared by ${loaderData.data.coupleLabel}.`,
        },
        { name: 'robots', content: 'noindex,nofollow' },
      ],
    }
  },
  component: PhotoShareViewerPage,
})

function PhotoShareViewerPage() {
  const result = Route.useLoaderData()
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  if (!result.ok) {
    return (
      <PublicShell
        coupleLabel="Private photos"
        showWeddingDate={false}
        sectionNav={[]}
        homePath="/"
      >
        <main className="public-section mx-auto max-w-xl px-6 py-16 text-center md:py-24">
          <p className="public-kicker mb-4">Photos</p>
          <h1 className="public-section-title">Link unavailable</h1>
          <p className="text-foreground-secondary mt-4 text-sm leading-relaxed">
            {result.message}
          </p>
        </main>
      </PublicShell>
    )
  }

  const { data } = result

  return (
    <PublicShell
      theme={data.theme}
      coupleLabel={data.coupleLabel}
      weddingDate={data.weddingDate}
      sectionNav={[]}
      homePath="/"
    >
      <main className="public-section mx-auto max-w-5xl px-6">
        <div className="public-reveal mx-auto max-w-2xl text-center">
          <p className="public-kicker mb-4">Private photos</p>
          <h1 className="public-section-title">{data.groupName}</h1>
          <p className="text-foreground-secondary mt-4 text-sm leading-relaxed md:text-base">
            {data.guestFirstName ? `Hello, ${data.guestFirstName}. ` : null}
            Shared by {data.coupleLabel}
            {data.weddingDateLabel !== 'Date to be announced'
              ? ` · ${data.weddingDateLabel}`
              : null}
            .
          </p>
        </div>

        {data.photos.length === 0 ? (
          <p className="text-foreground-secondary mt-12 text-center text-sm">
            No photos in this share yet.
          </p>
        ) : (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxUrl(photo.url)}
                className="border-border bg-background-secondary public-reveal aspect-[4/5] overflow-hidden rounded-sm border text-left"
              >
                <img
                  src={photo.url}
                  alt={photo.filename}
                  loading="lazy"
                  decoding="async"
                  className="public-image h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </main>

      {lightboxUrl ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
          aria-label="Close photo preview"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90dvh] max-w-full object-contain"
          />
        </button>
      ) : null}
    </PublicShell>
  )
}
