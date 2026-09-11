import { createFileRoute } from '@tanstack/react-router'
import { createProxiedPhotoSignedUrl } from '@/lib/page-blocks/storage.server'

/**
 * Durable public photo URL for OG/social crawlers.
 * Redirects to a freshly signed Supabase URL so shares don't expire with page TTL.
 */
export const Route = createFileRoute('/api/photo')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const path = url.searchParams.get('path')?.trim() ?? ''

        if (!path) {
          return new Response('Missing path.', { status: 400 })
        }

        const signedUrl = await createProxiedPhotoSignedUrl(path)
        if (!signedUrl) {
          return new Response('Photo not found.', { status: 404 })
        }

        return Response.redirect(signedUrl, 302)
      },
    },
  },
})
