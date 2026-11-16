import { createFileRoute } from '@tanstack/react-router'

/**
 * Missing hashed assets must 404. If the SPA shell answered these with 200,
 * Nitro/Vercel could cache that shell as an immutable /assets/* response and
 * poison the edge after a deploy.
 */
export const Route = createFileRoute('/assets/$')({
  server: {
    handlers: {
      GET: () => new Response('Not found', { status: 404 }),
      HEAD: () => new Response(null, { status: 404 }),
    },
  },
})
