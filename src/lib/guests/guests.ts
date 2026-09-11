import { createServerFn } from '@tanstack/react-start'
import { parseGuestInput } from '@/lib/guests/schema'
import type {
  CreateGuestResult,
  GuestConflictResolution,
  UpdateGuestResult,
} from '@/lib/guests/guests.server'
import type { Guest } from '@/lib/supabase/types'

export type { CreateGuestResult, GuestConflictResolution, UpdateGuestResult }
export type { GuestConflictMatch } from '@/lib/guests/guests.server'

function parseConflictResolution(
  data: Record<string, unknown>,
): GuestConflictResolution | undefined {
  const raw = data.conflictResolution
  if (!raw || typeof raw !== 'object') return undefined
  const resolution = raw as {
    newAdminLabel?: string
    existingLabels?: Array<{ guestId?: string; adminLabel?: string }>
  }
  const newAdminLabel = String(resolution.newAdminLabel ?? '').trim()
  const existingLabels = Array.isArray(resolution.existingLabels)
    ? resolution.existingLabels.map((item) => ({
        guestId: String(item.guestId ?? '').trim(),
        adminLabel: String(item.adminLabel ?? '').trim(),
      }))
    : []
  if (!newAdminLabel) throw new Error('Add a label for the new guest.')
  if (existingLabels.some((item) => !item.guestId || !item.adminLabel)) {
    throw new Error('Add a label for each existing matching guest.')
  }
  return { newAdminLabel, existingLabels }
}

export const listGuests = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Guest[]> => {
    const { listGuestsHandler } = await import('./guests.server')
    return listGuestsHandler()
  },
)

export const createGuest = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const record =
      typeof data === 'object' && data !== null
        ? (data as Record<string, unknown>)
        : {}
    const adminLabelRaw = record.admin_label ?? record.adminLabel
    const admin_label =
      adminLabelRaw === undefined || adminLabelRaw === null
        ? null
        : String(adminLabelRaw).trim() || null
    return {
      input: {
        ...parseGuestInput(record),
        admin_label,
      },
      conflictResolution: parseConflictResolution(record),
    }
  })
  .handler(async ({ data }): Promise<CreateGuestResult> => {
    const { createGuestHandler } = await import('./guests.server')
    return createGuestHandler(data.input, data.conflictResolution)
  })

export const updateGuest = createServerFn({ method: 'POST' })
  .validator((data: { guestId: string } & Record<string, unknown>) => {
    const guestId = String(data.guestId).trim()
    if (!guestId) throw new Error('Guest id is required.')
    const adminLabelRaw = data.admin_label ?? data.adminLabel
    const admin_label =
      adminLabelRaw === undefined || adminLabelRaw === null
        ? undefined
        : String(adminLabelRaw).trim() || null
    return {
      guestId,
      input: {
        ...parseGuestInput(data),
        admin_label,
      },
      conflictResolution: parseConflictResolution(data),
    }
  })
  .handler(async ({ data }): Promise<UpdateGuestResult> => {
    const { updateGuestHandler } = await import('./guests.server')
    return updateGuestHandler(
      data.guestId,
      data.input,
      data.conflictResolution,
    )
  })

export const deleteGuest = createServerFn({ method: 'POST' })
  .validator((data: { guestId: string }) => {
    const guestId = data.guestId.trim()
    if (!guestId) throw new Error('Guest id is required.')
    return { guestId }
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { deleteGuestHandler } = await import('./guests.server')
    return deleteGuestHandler(data.guestId)
  })

export const unlockGuestRsvp = createServerFn({ method: 'POST' })
  .validator((data: { guestId: string }) => {
    const guestId = String(data.guestId).trim()
    if (!guestId) throw new Error('Guest id is required.')
    return { guestId }
  })
  .handler(async ({ data }): Promise<Guest> => {
    const { unlockGuestRsvpHandler } = await import('./guests.server')
    return unlockGuestRsvpHandler(data.guestId)
  })

export const sendGuestInvite = createServerFn({ method: 'POST' })
  .validator((data: { guestId: string }) => {
    const guestId = String(data.guestId).trim()
    if (!guestId) throw new Error('Guest id is required.')
    return { guestId }
  })
  .handler(async ({ data }) => {
    const { sendGuestInviteHandler } = await import('./guests.server')
    return sendGuestInviteHandler(data.guestId)
  })

export const sendGuestInvitesBulk = createServerFn({ method: 'POST' })
  .validator((data: { onlyPending?: boolean }) => ({
    onlyPending: Boolean(data.onlyPending),
  }))
  .handler(async ({ data }) => {
    const { sendGuestInvitesBulkHandler } = await import('./guests.server')
    return sendGuestInvitesBulkHandler(data)
  })
