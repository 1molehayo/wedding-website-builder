import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { acceptAdminInvite } from '@/lib/auth/admins'

export const Route = createFileRoute('/admin/invite/$token')({
  component: AcceptInvitePage,
})

function AcceptInvitePage() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setIsAccepting(true)
      setError(null)
      try {
        const result = await acceptAdminInvite({ data: { token } })
        if (cancelled) return
        await navigate({ to: result.redirectTo })
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to accept this invitation.',
        )
        setIsAccepting(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [token, navigate])

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
        Admin invite
      </p>
      <h1 className="admin-page-title mt-2">
        {error ? 'Invite unavailable' : 'Accepting invitation…'}
      </h1>
      {error ? (
        <div className="mt-6 space-y-4">
          <p className="text-foreground-secondary text-sm leading-relaxed">
            {error}
          </p>
          <Button
            type="button"
            size="md"
            onClick={() => void navigate({ to: '/admin/login' })}
          >
            Go to sign in
          </Button>
        </div>
      ) : (
        <p className="text-foreground-secondary mt-4 text-sm">
          {isAccepting
            ? 'Verifying your invite and signing you in.'
            : null}
        </p>
      )}
    </div>
  )
}
