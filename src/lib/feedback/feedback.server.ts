import { requireAdminSession } from '@/lib/auth/session.server'
import { isSuperAdminProfile } from '@/lib/auth/roles'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
} from '@/lib/feedback/categories'
import type {
  FeedbackCategoryId,
  FeedbackStatus,
} from '@/lib/feedback/categories'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'

export type ProductFeedbackRow = {
  id: string
  admin_profile_id: string
  wedding_id: string | null
  category: FeedbackCategoryId
  message: string
  page_path: string | null
  status: FeedbackStatus
  created_at: string
  updated_at: string
  admin_email: string | null
  admin_name: string | null
}

function parseCategory(value: unknown): FeedbackCategoryId {
  const id = String(value ?? '')
  if (FEEDBACK_CATEGORIES.some((item) => item.id === id)) {
    return id as FeedbackCategoryId
  }
  throw new Error('Choose a feedback category.')
}

function parseStatus(value: unknown): FeedbackStatus {
  const id = String(value ?? '')
  if ((FEEDBACK_STATUSES as readonly string[]).includes(id)) {
    return id as FeedbackStatus
  }
  throw new Error('Invalid feedback status.')
}

export async function submitProductFeedbackHandler(input: {
  category: unknown
  message: unknown
  pagePath?: unknown
}): Promise<{ ok: true }> {
  const session = await requireAdminSession()
  const category = parseCategory(input.category)
  const message = String(input.message ?? '').trim()
  if (message.length < 3) {
    throw new Error('Please write a little more detail.')
  }
  if (message.length > 4000) {
    throw new Error('Feedback must be 4000 characters or fewer.')
  }
  const pagePath =
    typeof input.pagePath === 'string' ? input.pagePath.trim().slice(0, 200) : null

  const admin = createAdminSupabaseClient()
  const result = await admin.from('product_feedback').insert({
    admin_profile_id: session.profile.id,
    wedding_id: session.wedding?.id ?? null,
    category,
    message,
    page_path: pagePath || null,
  })

  if (result.error) {
    throw new Error(result.error.message)
  }

  return { ok: true as const }
}

export async function listProductFeedbackHandler(): Promise<{
  items: ProductFeedbackRow[]
  counts: Record<FeedbackCategoryId, number>
}> {
  const session = await requireAdminSession()
  if (!isSuperAdminProfile(session.profile)) {
    throw new Error('Only the super admin can review feedback.')
  }

  const admin = createAdminSupabaseClient()
  const result = await admin
    .from('product_feedback')
    .select(
      'id, admin_profile_id, wedding_id, category, message, page_path, status, created_at, updated_at',
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (result.error) {
    throw new Error(result.error.message)
  }

  const rows = result.data
  const profileIds = [...new Set(rows.map((row) => row.admin_profile_id))]
  let profiles: Array<{
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
    display_name: string | null
  }> = []
  if (profileIds.length > 0) {
    const profileResult = await admin
      .from('admin_profiles')
      .select('id, email, first_name, last_name, display_name')
      .in('id', profileIds)
    if (profileResult.error) {
      throw new Error(profileResult.error.message)
    }
    profiles = profileResult.data
  }

  const byId = new Map(profiles.map((profile) => [profile.id, profile]))

  const items: ProductFeedbackRow[] = rows.map((row) => {
    const profile = byId.get(row.admin_profile_id)
    const name = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim()
    return {
      id: row.id,
      admin_profile_id: row.admin_profile_id,
      wedding_id: row.wedding_id,
      category: row.category as FeedbackCategoryId,
      message: row.message,
      page_path: row.page_path,
      status: row.status as FeedbackStatus,
      created_at: row.created_at,
      updated_at: row.updated_at,
      admin_email: profile?.email ?? null,
      admin_name: name || profile?.display_name || null,
    }
  })

  const counts = {
    general: 0,
    bug: 0,
    idea: 0,
    praise: 0,
  } satisfies Record<FeedbackCategoryId, number>

  for (const item of items) {
    if (item.status === 'new' || item.status === 'planned') {
      counts[item.category] += 1
    }
  }

  return { items, counts }
}

export async function updateProductFeedbackStatusHandler(input: {
  feedbackId: unknown
  status: unknown
}): Promise<{ ok: true }> {
  const session = await requireAdminSession()
  if (!isSuperAdminProfile(session.profile)) {
    throw new Error('Only the super admin can update feedback.')
  }

  const feedbackId = String(input.feedbackId ?? '').trim()
  if (!feedbackId) throw new Error('Feedback id is required.')
  const status = parseStatus(input.status)

  const admin = createAdminSupabaseClient()
  const result = await admin
    .from('product_feedback')
    .update({ status })
    .eq('id', feedbackId)

  if (result.error) {
    throw new Error(result.error.message)
  }

  return { ok: true as const }
}
