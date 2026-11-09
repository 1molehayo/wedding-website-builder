import { createFileRoute } from '@tanstack/react-router'
import { runContributionRemindersHandler } from '@/lib/registry/contribution-reminders.server'

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const header = request.headers.get('authorization')?.trim() ?? ''
  return header === `Bearer ${secret}`
}

async function handleCron(request: Request): Promise<Response> {
  if (!cronAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runContributionRemindersHandler()
    return Response.json({ ok: true, ...result })
  } catch (error) {
    console.error('[cron] registry reminders failed', error)
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Reminder run failed.',
      },
      { status: 500 },
    )
  }
}

/**
 * Daily cron: email confirm reminders for unconfirmed bank transfers.
 * Protect with Authorization: Bearer $CRON_SECRET.
 * Vercel Cron sends that header when CRON_SECRET is set.
 */
export const Route = createFileRoute('/api/cron/registry-reminders')({
  server: {
    handlers: {
      GET: async ({ request }) => handleCron(request),
      POST: async ({ request }) => handleCron(request),
    },
  },
})
