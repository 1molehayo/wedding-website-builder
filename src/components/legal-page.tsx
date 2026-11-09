import { Link } from '@tanstack/react-router'
import { ColorModeToggle } from '@/components/color-mode-toggle'
import { PRODUCT_NAME } from '@/lib/constants'

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="font-serif text-xl italic underline-offset-4 hover:underline"
          >
            {PRODUCT_NAME}
          </Link>
          <ColorModeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
        <p className="text-foreground-secondary text-xs tracking-[0.14em] uppercase">
          Legal
        </p>
        <h1 className="font-serif mt-3 text-4xl italic md:text-5xl">{title}</h1>
        <p className="text-foreground-secondary mt-3 text-sm">
          Last updated {updated}
        </p>
        <div className="legal-prose mt-10 space-y-6 text-sm leading-relaxed md:text-base">
          {children}
        </div>
      </main>

      <footer className="border-border border-t px-6 py-8 text-center text-sm">
        <p className="text-foreground-secondary">
          <Link to="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
          <span className="mx-2" aria-hidden>
            ·
          </span>
          <Link to="/cookies" className="underline-offset-4 hover:underline">
            Cookies
          </Link>
          <span className="mx-2" aria-hidden>
            ·
          </span>
          <Link to="/" className="underline-offset-4 hover:underline">
            Home
          </Link>
        </p>
        <p className="text-foreground-secondary mt-2 text-xs tracking-[0.14em] uppercase">
          © {new Date().getFullYear()} {PRODUCT_NAME}
        </p>
      </footer>
    </div>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl italic">{title}</h2>
      {children}
    </section>
  )
}
