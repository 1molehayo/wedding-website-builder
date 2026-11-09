import { createFileRoute } from '@tanstack/react-router'
import confetti from 'canvas-confetti'
import { useEffect, useRef } from 'react'
import { PublicShell } from '@/components/public-shell'
import { Button } from '@/components/ui/button'
import { confirmBankContribution } from '@/lib/registry/registry'
import type { ConfirmedContribution } from '@/lib/registry/registry'

type ConfirmLoaderResult =
  | { ok: true; data: ConfirmedContribution }
  | { ok: false; message: string }

function playThankYouConfetti() {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const end = Date.now() + 1800
  const frame = () => {
    void confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      disableForReducedMotion: true,
    })
    void confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      disableForReducedMotion: true,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

export const Route = createFileRoute('/registry/confirm/$token')({
  loader: async ({ params }): Promise<ConfirmLoaderResult> => {
    try {
      const data = await confirmBankContribution({
        data: { token: params.token },
      })
      return { ok: true, data }
    } catch (cause) {
      return {
        ok: false,
        message:
          cause instanceof Error
            ? cause.message
            : 'This confirm link is invalid or has already been used.',
      }
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData || !loaderData.ok) {
      return { meta: [{ title: 'Thank you' }, { name: 'robots', content: 'noindex,nofollow' }] }
    }
    return {
      meta: [
        { title: `Thank you · ${loaderData.data.coupleLabel}` },
        { name: 'robots', content: 'noindex,nofollow' },
      ],
    }
  },
  component: RegistryConfirmPage,
})

function RegistryConfirmPage() {
  const result = Route.useLoaderData()
  const played = useRef(false)

  useEffect(() => {
    if (!result.ok || played.current) return
    played.current = true
    playThankYouConfetti()
  }, [result])

  if (!result.ok) {
    return (
      <PublicShell
        coupleLabel="Registry"
        showWeddingDate={false}
        sectionNav={[]}
        homePath="/"
      >
        <main className="public-section mx-auto max-w-xl px-6 py-16 text-center md:py-24">
          <p className="public-kicker mb-4">Registry</p>
          <h1 className="public-section-title">Link unavailable</h1>
          <p className="text-foreground-secondary mt-4 text-sm leading-relaxed">
            {result.message}
          </p>
        </main>
      </PublicShell>
    )
  }

  const { data } = result
  const giftLine = data.giftTitle ? ` toward ${data.giftTitle}` : ''

  return (
    <PublicShell
      coupleLabel={data.coupleLabel}
      showWeddingDate={false}
      sectionNav={[]}
      homePath={data.websitePath}
    >
      <main className="public-section mx-auto max-w-xl px-6 py-16 text-center md:py-24">
        <p className="public-kicker mb-4">Thank you</p>
        <h1 className="public-section-title">{data.coupleLabel}</h1>
        <p className="text-foreground-secondary mx-auto mt-5 max-w-md text-base leading-relaxed">
          {data.alreadyConfirmed
            ? `This gift was already confirmed. Thank you again for sending ${data.amount} ${data.currency}${giftLine}.`
            : `Thank you for sending ${data.amount} ${data.currency}${giftLine}. It means so much.`}
        </p>
        <div className="mt-8">
          <Button type="button" size="sm" asChild>
            <a href={data.websitePath}>Back to the wedding site</a>
          </Button>
        </div>
      </main>
    </PublicShell>
  )
}
