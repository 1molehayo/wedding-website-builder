import { recordActivity } from '@/lib/activity/activity.server'
import { getAppUrl } from '@/lib/app-url'
import { formatCoupleNames } from '@/lib/constants'
import { sendRegistryContributionReminderEmail } from '@/lib/email/resend.server'
import {
  MAX_CONTRIBUTION_REMINDERS,
  isContributionReminderDue,
  nextReminderNumber,
} from '@/lib/registry/contribution-reminders'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import type { PublicThemeId } from '@/lib/supabase/types'

const BATCH_LIMIT = 50

export type ContributionReminderRunResult = {
  scanned: number
  due: number
  sent: number
  skipped: number
  failed: number
}

function amountLabel(amount: number, currency: string): string {
  return `${amount} ${currency}`
}

/**
 * Send up to three bank-transfer confirm reminders for unconfirmed gifts.
 * Safe to call from a daily cron. Idempotent across runs via reminder_count
 * and last_reminder_at.
 */
export async function runContributionRemindersHandler(
  now: Date = new Date(),
): Promise<ContributionReminderRunResult> {
  const admin = createAdminSupabaseClient()

  const bankResult = await admin
    .from('registry_contribution_bank')
    .select(
      'contribution_id, reference, confirm_token, reminder_count, last_reminder_at',
    )
    .lt('reminder_count', MAX_CONTRIBUTION_REMINDERS)
    .order('last_reminder_at', { ascending: true, nullsFirst: true })
    .limit(200)

  if (bankResult.error) throw new Error(bankResult.error.message)

  const bankRows = bankResult.data
  if (bankRows.length === 0) {
    return { scanned: 0, due: 0, sent: 0, skipped: 0, failed: 0 }
  }

  const contributionIds = bankRows.map((row) => row.contribution_id)
  const contributionsResult = await admin
    .from('registry_contributions')
    .select(
      'id, wedding_id, gift_id, amount, currency, payer_name, payer_email, applied_at, created_at, channel',
    )
    .in('id', contributionIds)
    .is('applied_at', null)
    .eq('channel', 'bank_transfer')

  if (contributionsResult.error)
    throw new Error(contributionsResult.error.message)

  const contributionById = new Map(
    contributionsResult.data.map((row) => [row.id, row]),
  )

  const due = bankRows.filter((bank) => {
    const contribution = contributionById.get(bank.contribution_id)
    if (!contribution) return false
    return isContributionReminderDue(
      {
        contributionId: bank.contribution_id,
        reminderCount: bank.reminder_count,
        lastReminderAt: bank.last_reminder_at,
        contributionCreatedAt: contribution.created_at,
        appliedAt: contribution.applied_at,
      },
      now,
    )
  })

  const batch = due.slice(0, BATCH_LIMIT)
  let sent = 0
  let skipped = 0
  let failed = 0

  const weddingIds = [
    ...new Set(
      batch
        .map((bank) => contributionById.get(bank.contribution_id)?.wedding_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const giftIds = [
    ...new Set(
      batch
        .map((bank) => contributionById.get(bank.contribution_id)?.gift_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const [weddingsResult, giftsResult] = await Promise.all([
    weddingIds.length > 0
      ? admin
          .from('weddings')
          .select('id, groom_name, bride_name, active_public_theme')
          .in('id', weddingIds)
      : Promise.resolve({ data: [], error: null }),
    giftIds.length > 0
      ? admin.from('registry_items').select('id, title').in('id', giftIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (weddingsResult.error) throw new Error(weddingsResult.error.message)
  if (giftsResult.error) throw new Error(giftsResult.error.message)

  const weddingById = new Map(weddingsResult.data.map((row) => [row.id, row]))
  const giftTitleById = new Map(
    giftsResult.data.map((row) => [row.id, row.title]),
  )

  for (const bank of batch) {
    const contribution = contributionById.get(bank.contribution_id)
    if (!contribution) {
      skipped += 1
      continue
    }

    const wedding = weddingById.get(contribution.wedding_id)
    if (!wedding) {
      skipped += 1
      continue
    }

    const reminderNumber = nextReminderNumber(bank.reminder_count)
    const claimedAt = now.toISOString()
    let claimQuery = admin
      .from('registry_contribution_bank')
      .update({
        reminder_count: reminderNumber,
        last_reminder_at: claimedAt,
      })
      .eq('contribution_id', bank.contribution_id)
      .eq('reminder_count', bank.reminder_count)

    claimQuery =
      bank.last_reminder_at == null
        ? claimQuery.is('last_reminder_at', null)
        : claimQuery.eq('last_reminder_at', bank.last_reminder_at)

    const claimed = await claimQuery.select('contribution_id').maybeSingle()

    if (claimed.error) {
      console.error('[registry] reminder claim failed', claimed.error)
      failed += 1
      continue
    }
    if (!claimed.data) {
      skipped += 1
      continue
    }

    const coupleLabel = formatCoupleNames(
      wedding.groom_name,
      wedding.bride_name,
    )
    const giftTitle = contribution.gift_id
      ? (giftTitleById.get(contribution.gift_id) ?? null)
      : null
    const confirmUrl = `${getAppUrl()}/registry/confirm/${encodeURIComponent(bank.confirm_token)}`

    try {
      await sendRegistryContributionReminderEmail({
        to: contribution.payer_email,
        payerName: contribution.payer_name,
        coupleLabel,
        amountLabel: amountLabel(
          Number(contribution.amount),
          contribution.currency,
        ),
        giftTitle,
        reference: bank.reference,
        confirmUrl,
        reminderNumber,
        theme: wedding.active_public_theme as PublicThemeId,
      })
    } catch (error) {
      console.error('[registry] reminder email failed', error)
      failed += 1
      continue
    }

    try {
      await recordActivity({
        weddingId: contribution.wedding_id,
        actorId: null,
        actorEmail: null,
        actorRole: 'system',
        action: 'system.reminder_sent',
        entityType: 'registry_contribution',
        entityId: contribution.id,
        summary: `Sent reminder ${reminderNumber} of ${MAX_CONTRIBUTION_REMINDERS} for a ${contribution.currency} contribution.`,
        metadata: {
          reminderNumber,
          amount: Number(contribution.amount),
          currency: contribution.currency,
          giftId: contribution.gift_id,
          reference: bank.reference,
        },
      })
    } catch (error) {
      console.error('[registry] reminder activity failed', error)
    }

    sent += 1
  }

  return {
    scanned: bankRows.length,
    due: due.length,
    sent,
    skipped,
    failed,
  }
}
