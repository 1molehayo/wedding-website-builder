import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { AppRouteError, NotFoundPage } from '@/components/app-error-page'
import { formatCoupleNames, PRODUCT_NAME } from '@/lib/constants'
import { COLOR_MODE_INIT_SCRIPT } from '@/lib/color-mode'
import { internalError, raiseRouteError } from '@/lib/errors/route-error'
import { FALLBACK_PUBLIC_THEME } from '@/lib/site-settings'
import { getPublicWeddingSettings } from '@/lib/wedding/settings'
import { isReservedPublicSlug } from '@/lib/wedding/slug'

import appCss from '../styles/app.css?url'

function isPlatformPath(pathname: string): boolean {
  if (pathname === '/') return true
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/design' ||
    pathname.startsWith('/design/') ||
    pathname === '/rsvp' ||
    pathname.startsWith('/rsvp/') ||
    pathname === '/photos' ||
    pathname.startsWith('/photos/')
  ) {
    return true
  }
  return false
}

export const Route = createRootRoute({
  loader: async ({ location }) => {
    try {
      if (isPlatformPath(location.pathname)) {
        return {
          publicTheme: FALLBACK_PUBLIC_THEME,
          coupleLabel: PRODUCT_NAME,
        }
      }

      const slug = location.pathname.replace(/^\//, '').split('/')[0] ?? ''
      if (!slug || isReservedPublicSlug(slug)) {
        return {
          publicTheme: FALLBACK_PUBLIC_THEME,
          coupleLabel: PRODUCT_NAME,
        }
      }

      const wedding = await getPublicWeddingSettings({ data: { slug } })
      if (!wedding.public_slug) {
        return {
          publicTheme: FALLBACK_PUBLIC_THEME,
          coupleLabel: PRODUCT_NAME,
        }
      }

      return {
        publicTheme: wedding.active_public_theme,
        coupleLabel: formatCoupleNames(wedding.groom_name, wedding.bride_name),
      }
    } catch (cause) {
      throw raiseRouteError(
        internalError({
          message: 'Failed to load root public wedding settings',
          cause,
        }),
        { source: 'ssr', pathname: location.pathname },
      )
    }
  },
  notFoundComponent: NotFoundPage,
  errorComponent: AppRouteError,
  head: ({ loaderData }) => {
    const title = loaderData?.coupleLabel ?? PRODUCT_NAME
    return {
      meta: [
        { charSet: 'utf-8' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        { title },
        {
          name: 'description',
          content: `${PRODUCT_NAME} wedding websites.`,
        },
        { name: 'theme-color', content: '#faf8f4' },
      ],
      links: [{ rel: 'stylesheet', href: appCss }],
    }
  },
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { publicTheme } = Route.useLoaderData()

  return (
    <html lang="en" data-theme={publicTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_MODE_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
