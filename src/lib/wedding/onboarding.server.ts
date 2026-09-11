import { requireAdminSession } from '@/lib/auth/session.server'
import { createDefaultPageBlocks } from '@/lib/page-blocks/types'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import type { Wedding } from '@/lib/supabase/types'
import { FALLBACK_PUBLIC_THEME } from '@/lib/site-settings'
import { parseOnboardingInput } from '@/lib/wedding/onboarding-validation'
import type { OnboardingInput } from '@/lib/wedding/onboarding-validation'
import { allocateUniquePublicSlug } from '@/lib/wedding/slug.server'

export async function completeOnboardingHandler(
  input: OnboardingInput,
): Promise<Wedding> {
  const session = await requireAdminSession()
  const data = parseOnboardingInput(input)

  if (session.wedding) {
    throw new Error('Wedding is already set up.')
  }

  const admin = createAdminSupabaseClient()

  // Race-safe: if another admin just created it, attach and return.
  const existing = await admin
    .from('weddings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing.error) {
    throw new Error(existing.error.message)
  }

  if (existing.data) {
    await admin
      .from('admin_profiles')
      .update({ wedding_id: existing.data.id })
      .is('wedding_id', null)

    return existing.data
  }

  const publicSlug = await allocateUniquePublicSlug({
    brideName: data.bride_name,
    groomName: data.groom_name,
    weddingDate: data.wedding_date,
  })

  const pageBlocks = createDefaultPageBlocks()
  const now = new Date().toISOString()

  const created = await admin
    .from('weddings')
    .insert({
      groom_name: data.groom_name,
      bride_name: data.bride_name,
      wedding_date: data.wedding_date,
      status: 'planning',
      venue_name: data.venue_name,
      venue_location: data.venue_location,
      dress_code: data.dress_code,
      active_public_theme: data.active_public_theme ?? FALLBACK_PUBLIC_THEME,
      public_slug: publicSlug,
      page_blocks: pageBlocks,
      page_blocks_draft: pageBlocks,
      page_draft_updated_at: now,
      page_published_at: now,
    })
    .select('*')
    .single()

  if (created.error) {
    throw new Error(created.error.message)
  }

  const linked = await admin
    .from('admin_profiles')
    .update({ wedding_id: created.data.id })
    .is('wedding_id', null)

  if (linked.error) {
    throw new Error(linked.error.message)
  }

  const version = await admin.from('page_content_versions').insert({
    wedding_id: created.data.id,
    page_blocks: pageBlocks,
    published_at: now,
  })

  if (version.error) {
    throw new Error(version.error.message)
  }

  return created.data
}
