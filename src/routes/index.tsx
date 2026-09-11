import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowUpRightIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/lib/constants'
import { getAdminSession } from '@/lib/auth/session'

export const Route = createFileRoute('/')({
  loader: async () => {
    const session = await getAdminSession()
    return {
      signedIn: Boolean(session),
    }
  },
  head: () => ({
    meta: [
      { title: `${PRODUCT_NAME} · ${PRODUCT_TAGLINE}` },
      {
        name: 'description',
        content:
          'Create a beautiful wedding website for your celebration. Invitations, details, and RSVPs in one place.',
      },
    ],
  }),
  component: LandingPage,
})

function LandingPage() {
  const { signedIn } = Route.useLoaderData()

  return (
    <div className="public-shell public-hero-atmosphere relative flex min-h-dvh flex-col text-foreground">
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <p className="font-serif text-xl tracking-tight text-foreground italic md:text-2xl">
          {PRODUCT_NAME}
        </p>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-full"
        >
          <Link to={signedIn ? '/admin' : '/admin/login'}>
            {signedIn ? 'Dashboard' : 'Get started'}
            <ArrowUpRightIcon data-icon="inline-end" className="size-4" />
          </Link>
        </Button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-foreground-secondary text-xs font-medium tracking-[0.22em] uppercase">
          {PRODUCT_TAGLINE}
        </p>
        <h1 className="font-serif mt-5 text-5xl leading-tight tracking-tight text-foreground sm:text-6xl">
          {PRODUCT_NAME}
        </h1>
        <p className="text-foreground-secondary mt-5 max-w-xl text-base leading-relaxed sm:text-lg">
          A calm, beautiful home for your wedding story. Share details, welcome
          guests, and celebrate together.
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link to={signedIn ? '/admin' : '/admin/login'}>
              {signedIn ? 'Open your dashboard' : 'Create your wedding'}
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-border/40 relative z-10 border-t px-6 py-8 text-center text-sm text-foreground-secondary">
        <p>
          © {new Date().getFullYear()} {PRODUCT_NAME}
        </p>
        <p className="mt-1 text-xs">Built with {PRODUCT_NAME}</p>
      </footer>
    </div>
  )
}
