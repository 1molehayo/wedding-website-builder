import { createServerFn } from '@tanstack/react-start'
import type { PublicRsvpPageData } from '@/lib/rsvp/schema'
import type { Guest } from '@/lib/supabase/types'

export type { PublicRsvpPageData }

export const getRsvpByToken = createServerFn({ method: 'GET' })
  .validator((data: { token: string }) => {
    const token = String(data.token).trim()
    if (!token) throw new Error('RSVP token is required.')
    return { token }
  })
  .handler(async ({ data }): Promise<PublicRsvpPageData> => {
    const { getRsvpByTokenHandler } = await import('./rsvp.server')
    return getRsvpByTokenHandler(data.token)
  })

export const submitRsvp = createServerFn({ method: 'POST' })
  .validator((data: { token: string } & Record<string, unknown>) => {
    const token = String(data.token).trim()
    if (!token) throw new Error('RSVP token is required.')
    return { token, payload: data }
  })
  .handler(async ({ data }): Promise<PublicRsvpPageData> => {
    const { submitRsvpHandler } = await import('./rsvp.server')
    return submitRsvpHandler(data.token, data.payload)
  })

export const updateGuestRsvp = createServerFn({ method: 'POST' })
  .validator((data: { guestId: string } & Record<string, unknown>) => {
    const guestId = String(data.guestId).trim()
    if (!guestId) throw new Error('Guest id is required.')
    return { guestId, payload: data }
  })
  .handler(async ({ data }): Promise<Guest> => {
    const { updateGuestRsvpHandler } = await import('./rsvp.server')
    return updateGuestRsvpHandler(data.guestId, data.payload)
  })
