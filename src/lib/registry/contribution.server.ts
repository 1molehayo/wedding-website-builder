import { recordActivity } from '@/lib/activity/activity.server'
import { getAppUrl } from '@/lib/app-url'
import { requireWeddingSession } from '@/lib/auth/session.server'
import { formatCoupleNames } from '@/lib/constants'
import {
  sendRegistryContributionConfirmEmail,
  sendRegistryContributionThanksEmail,
} from '@/lib/email/resend.server'
import { lockFxRate } from '@/lib/fx/fx.server'
import { baseAmountToPay, payAmountToBase } from '@/lib/fx/money'
import type { StartContributionInput } from '@/lib/registry/contribution-schema'
import { CONTRIBUTION_STATUS_LABELS } from '@/lib/registry/contribution-schema'
import {
  giftStillOpen,
  pickBasePrice,
  remainingPrices,
} from '@/lib/registry/remaining'
import type { AppliedPayment } from '@/lib/registry/remaining'
import { createAdminSupabaseClient } from '@/lib/supabase/admin.server'
import type {
  PublicThemeId,
  RegistryContributionStatus,
} from '@/lib/supabase/types'

export type StartedContribution = {
  contributionId: string
  reference: string
  amount: number
  currency: string
  amountBase: number
  baseCurrency: string
  fxRate: number
  giftTitle: string | null
  account: {
    label: string
    bank_name: string | null
    currency: string
    account_name: string
    account_number: string
    routing_number: string | null
    notes: string | null
  }
  confirmUrl: string
}

export type ContributionFxQuote = {
  giftId: string | null
  giftTitle: string | null
  baseCurrency: string
  remainingBase: number | null
  payCurrency: string
  fxRate: number
  suggestedAmount: number | null
  fxSource: string
}

export type ConfirmedContribution = {
  alreadyConfirmed: boolean
  amount: number
  currency: string
  giftTitle: string | null
  coupleLabel: string
  websitePath: string
}

export type AdminContribution = {
  id: string
  gift_id: string | null
  gift_title: string | null
  channel: 'bank_transfer' | 'external_store'
  provider: string | null
  amount: number
  currency: string
  amount_base: number
  base_currency: string
  fx_rate: number
  fx_locked_at: string
  fx_source: string
  payer_name: string
  payer_email: string
  payer_phone: string | null
  status: RegistryContributionStatus
  applied_at: string | null
  created_at: string
  updated_at: string
  bank: {
    reference: string
    reminder_count: number
    last_reminder_at: string | null
    account_id: string
  } | null
}

const CONTRIBUTION_ADMIN_SELECT =
  'id, wedding_id, gift_id, channel, provider, amount, currency, amount_base, base_currency, fx_rate, fx_locked_at, fx_source, payer_name, payer_email, payer_phone, status, applied_at, created_at, updated_at'

function amountLabel(amount: number, currency: string): string {
  return `${amount} ${currency}`
}

function newBankReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  for (const byte of bytes) {
    suffix += alphabet[byte % alphabet.length]
  }
  return `GFT-${suffix}`
}

function newConfirmToken(): string {
  return (
    crypto.randomUUID().replaceAll('-', '') +
    crypto.randomUUID().replaceAll('-', '')
  )
}

async function loadAppliedPayments(
  weddingId: string,
  giftId: string,
): Promise<AppliedPayment[]> {
  const admin = createAdminSupabaseClient()
  const result = await admin
    .from('registry_contributions')
    .select('amount_base, status, applied_at')
    .eq('wedding_id', weddingId)
    .eq('gift_id', giftId)

  if (result.error) throw new Error(result.error.message)

  return result.data.map((row) => ({
    amountBase: Number(row.amount_base),
    status: row.status,
    appliedAt: row.applied_at,
  }))
}

async function loadGiftBasePrice(
  weddingId: string,
  giftId: string,
): Promise<{ currency: string; amount: number }> {
  const admin = createAdminSupabaseClient()
  const pricesResult = await admin
    .from('registry_item_prices')
    .select('currency, amount')
    .eq('item_id', giftId)
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: true })

  if (pricesResult.error) throw new Error(pricesResult.error.message)
  const listed = pricesResult.data.map((row) => ({
    currency: row.currency,
    amount: Number(row.amount),
  }))
  const base = pickBasePrice(listed)
  if (!base) throw new Error('This gift does not have a price yet.')
  return base
}

export async function remainingForGift(
  weddingId: string,
  giftId: string,
  listed: Array<{ currency: string; amount: number }>,
) {
  const payments = await loadAppliedPayments(weddingId, giftId)
  return remainingPrices(listed, payments)
}

export async function quoteContributionFxHandler(input: {
  weddingSlug: string
  giftId: string | null
  currency: string
}): Promise<ContributionFxQuote> {
  const admin = createAdminSupabaseClient()
  const weddingResult = await admin
    .from('weddings')
    .select('id')
    .eq('public_slug', input.weddingSlug)
    .maybeSingle()

  if (weddingResult.error) throw new Error(weddingResult.error.message)
  if (!weddingResult.data) throw new Error('Wedding not found.')

  const weddingId = weddingResult.data.id
  const payCurrency = input.currency.toUpperCase()

  const accountResult = await admin
    .from('registry_accounts')
    .select('id')
    .eq('wedding_id', weddingId)
    .eq('currency', payCurrency)
    .eq('is_enabled', true)
    .limit(1)
    .maybeSingle()

  if (accountResult.error) throw new Error(accountResult.error.message)
  if (!accountResult.data) {
    throw new Error(
      `No bank account is set up for ${payCurrency}. Choose another currency.`,
    )
  }

  if (!input.giftId) {
    const locked = await lockFxRate({
      baseCurrency: payCurrency,
      payCurrency,
    })
    return {
      giftId: null,
      giftTitle: null,
      baseCurrency: payCurrency,
      remainingBase: null,
      payCurrency,
      fxRate: locked.rate,
      suggestedAmount: null,
      fxSource: locked.source,
    }
  }

  const giftResult = await admin
    .from('registry_items')
    .select('id, title, is_visible')
    .eq('id', input.giftId)
    .eq('wedding_id', weddingId)
    .maybeSingle()

  if (giftResult.error) throw new Error(giftResult.error.message)
  if (!giftResult.data || !giftResult.data.is_visible) {
    throw new Error('Gift not found.')
  }

  const base = await loadGiftBasePrice(weddingId, input.giftId)
  const remaining = await remainingForGift(weddingId, input.giftId, [base])
  const remainingBase = remaining[0]?.remaining ?? 0
  const locked = await lockFxRate({
    baseCurrency: base.currency,
    payCurrency,
  })

  return {
    giftId: input.giftId,
    giftTitle: giftResult.data.title,
    baseCurrency: base.currency,
    remainingBase,
    payCurrency,
    fxRate: locked.rate,
    suggestedAmount:
      remainingBase > 0 ? baseAmountToPay(remainingBase, locked.rate) : 0,
    fxSource: locked.source,
  }
}

export async function startBankContributionHandler(
  input: StartContributionInput,
): Promise<StartedContribution> {
  const admin = createAdminSupabaseClient()
  const weddingResult = await admin
    .from('weddings')
    .select('id, groom_name, bride_name, public_slug, active_public_theme')
    .eq('public_slug', input.weddingSlug)
    .maybeSingle()

  if (weddingResult.error) throw new Error(weddingResult.error.message)
  if (!weddingResult.data) throw new Error('Wedding not found.')

  const wedding = weddingResult.data
  const currency = input.currency.toUpperCase()

  let giftTitle: string | null = null
  let baseCurrency = currency
  let amountBase = input.amount
  let fxRate = 1
  let fxSource = 'same_currency'
  let fxLockedAt = new Date().toISOString()

  if (input.giftId) {
    const giftResult = await admin
      .from('registry_items')
      .select('id, title, is_visible')
      .eq('id', input.giftId)
      .eq('wedding_id', wedding.id)
      .maybeSingle()

    if (giftResult.error) throw new Error(giftResult.error.message)
    if (!giftResult.data || !giftResult.data.is_visible) {
      throw new Error('Gift not found.')
    }

    const base = await loadGiftBasePrice(wedding.id, input.giftId)
    const remaining = await remainingForGift(wedding.id, input.giftId, [base])
    if (!giftStillOpen(remaining)) {
      throw new Error('This gift is already fully funded.')
    }

    const locked = await lockFxRate({
      baseCurrency: base.currency,
      payCurrency: currency,
    })
    baseCurrency = locked.baseCurrency
    fxRate = locked.rate
    fxSource = locked.source
    fxLockedAt = locked.lockedAt
    amountBase = payAmountToBase(input.amount, locked.rate)
    if (amountBase <= 0) {
      throw new Error(
        'Amount is too small after conversion. Enter a larger amount.',
      )
    }

    giftTitle = giftResult.data.title
  }

  const accountResult = await admin
    .from('registry_accounts')
    .select(
      'id, label, bank_name, currency, account_name, account_number, routing_number, notes',
    )
    .eq('wedding_id', wedding.id)
    .eq('currency', currency)
    .eq('is_enabled', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (accountResult.error) throw new Error(accountResult.error.message)
  if (!accountResult.data) {
    throw new Error(
      `No bank account is set up for ${currency}. Choose another currency, or ask the couple to add one.`,
    )
  }

  const reference = newBankReference()
  const confirmToken = newConfirmToken()

  const contribution = await admin
    .from('registry_contributions')
    .insert({
      wedding_id: wedding.id,
      gift_id: input.giftId,
      channel: 'bank_transfer',
      provider: null,
      amount: input.amount,
      currency,
      amount_base: amountBase,
      base_currency: baseCurrency,
      fx_rate: fxRate,
      fx_locked_at: fxLockedAt,
      fx_source: fxSource,
      payer_name: input.payerName,
      payer_email: input.payerEmail,
      payer_phone: input.payerPhone,
      status: 'pending',
      applied_at: null,
    })
    .select('id')
    .single()

  if (contribution.error) throw new Error(contribution.error.message)

  const bank = await admin.from('registry_contribution_bank').insert({
    contribution_id: contribution.data.id,
    account_id: accountResult.data.id,
    reference,
    confirm_token: confirmToken,
  })

  if (bank.error) {
    await admin
      .from('registry_contributions')
      .delete()
      .eq('id', contribution.data.id)
    throw new Error(bank.error.message)
  }

  const coupleLabel = formatCoupleNames(wedding.groom_name, wedding.bride_name)
  const confirmUrl = `${getAppUrl()}/registry/confirm/${encodeURIComponent(confirmToken)}`

  try {
    await sendRegistryContributionConfirmEmail({
      to: input.payerEmail,
      payerName: input.payerName,
      coupleLabel,
      amountLabel: amountLabel(input.amount, currency),
      giftTitle,
      reference,
      confirmUrl,
      theme: wedding.active_public_theme as PublicThemeId,
    })
  } catch (error) {
    console.error('[registry] confirm email failed', error)
  }

  await recordActivity({
    weddingId: wedding.id,
    actorId: null,
    actorEmail: input.payerEmail,
    actorRole: 'guest',
    action: 'registry.contribution_started',
    entityType: 'registry_contribution',
    entityId: contribution.data.id,
    summary: input.giftId
      ? `Started a ${currency} contribution toward “${giftTitle}”.`
      : `Started a direct ${currency} donation.`,
    metadata: {
      amount: input.amount,
      currency,
      amountBase,
      baseCurrency,
      fxRate,
      fxSource,
      giftId: input.giftId,
      reference,
    },
  })

  return {
    contributionId: contribution.data.id,
    reference,
    amount: input.amount,
    currency,
    amountBase,
    baseCurrency,
    fxRate,
    giftTitle,
    account: {
      label: accountResult.data.label,
      bank_name: accountResult.data.bank_name,
      currency: accountResult.data.currency,
      account_name: accountResult.data.account_name,
      account_number: accountResult.data.account_number,
      routing_number: accountResult.data.routing_number,
      notes: accountResult.data.notes,
    },
    confirmUrl,
  }
}

export async function confirmBankContributionHandler(
  token: string,
): Promise<ConfirmedContribution> {
  const confirmToken = token.trim()
  if (!confirmToken) throw new Error('Confirm link is missing.')

  const admin = createAdminSupabaseClient()
  const bankResult = await admin
    .from('registry_contribution_bank')
    .select('contribution_id, reference')
    .eq('confirm_token', confirmToken)
    .maybeSingle()

  if (bankResult.error) throw new Error(bankResult.error.message)
  if (!bankResult.data) throw new Error('This confirm link is invalid.')

  const contributionResult = await admin
    .from('registry_contributions')
    .select(
      'id, wedding_id, gift_id, amount, currency, payer_name, payer_email, status, applied_at',
    )
    .eq('id', bankResult.data.contribution_id)
    .maybeSingle()

  if (contributionResult.error)
    throw new Error(contributionResult.error.message)
  if (!contributionResult.data) throw new Error('Contribution not found.')

  const contribution = contributionResult.data
  const weddingResult = await admin
    .from('weddings')
    .select('id, groom_name, bride_name, public_slug, active_public_theme')
    .eq('id', contribution.wedding_id)
    .maybeSingle()

  if (weddingResult.error) throw new Error(weddingResult.error.message)
  if (!weddingResult.data) throw new Error('Wedding not found.')

  const wedding = weddingResult.data
  const coupleLabel = formatCoupleNames(wedding.groom_name, wedding.bride_name)

  let giftTitle: string | null = null
  if (contribution.gift_id) {
    const gift = await admin
      .from('registry_items')
      .select('title')
      .eq('id', contribution.gift_id)
      .maybeSingle()
    if (gift.error) throw new Error(gift.error.message)
    giftTitle = gift.data?.title ?? null
  }

  const alreadyConfirmed = contribution.applied_at != null
  if (!alreadyConfirmed) {
    const updated = await admin
      .from('registry_contributions')
      .update({ applied_at: new Date().toISOString() })
      .eq('id', contribution.id)
      .is('applied_at', null)
      .select('id')
      .maybeSingle()

    if (updated.error) throw new Error(updated.error.message)

    try {
      await sendRegistryContributionThanksEmail({
        to: contribution.payer_email,
        payerName: contribution.payer_name,
        coupleLabel,
        amountLabel: amountLabel(
          Number(contribution.amount),
          contribution.currency,
        ),
        giftTitle,
        theme: wedding.active_public_theme as PublicThemeId,
      })
      await recordActivity({
        weddingId: wedding.id,
        actorId: null,
        actorEmail: null,
        actorRole: 'system',
        action: 'system.thank_you_sent',
        entityType: 'registry_contribution',
        entityId: contribution.id,
        summary: `Sent thank-you email for a ${contribution.currency} contribution.`,
        metadata: {
          amount: Number(contribution.amount),
          currency: contribution.currency,
          giftId: contribution.gift_id,
        },
      })
    } catch (error) {
      console.error('[registry] thank-you email failed', error)
    }

    await recordActivity({
      weddingId: wedding.id,
      actorId: null,
      actorEmail: contribution.payer_email,
      actorRole: 'guest',
      action: 'registry.contribution_confirmed',
      entityType: 'registry_contribution',
      entityId: contribution.id,
      summary: giftTitle
        ? `Confirmed a ${contribution.currency} contribution toward “${giftTitle}”.`
        : `Confirmed a direct ${contribution.currency} donation.`,
      metadata: {
        amount: Number(contribution.amount),
        currency: contribution.currency,
        giftId: contribution.gift_id,
        reference: bankResult.data.reference,
      },
    })
  }

  return {
    alreadyConfirmed,
    amount: Number(contribution.amount),
    currency: contribution.currency,
    giftTitle,
    coupleLabel,
    websitePath: `/${wedding.public_slug}`,
  }
}

export async function listAdminContributionsHandler(
  weddingId: string,
): Promise<AdminContribution[]> {
  const admin = createAdminSupabaseClient()

  const [contributionsResult, giftsResult] = await Promise.all([
    admin
      .from('registry_contributions')
      .select(CONTRIBUTION_ADMIN_SELECT)
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false }),
    admin
      .from('registry_items')
      .select('id, title')
      .eq('wedding_id', weddingId),
  ])

  if (contributionsResult.error)
    throw new Error(contributionsResult.error.message)
  if (giftsResult.error) throw new Error(giftsResult.error.message)

  const contributionIds = contributionsResult.data.map((row) => row.id)
  const bankByContribution = new Map<
    string,
    {
      contribution_id: string
      account_id: string
      reference: string
      reminder_count: number
      last_reminder_at: string | null
    }
  >()

  if (contributionIds.length > 0) {
    const bankResult = await admin
      .from('registry_contribution_bank')
      .select(
        'contribution_id, account_id, reference, reminder_count, last_reminder_at',
      )
      .in('contribution_id', contributionIds)

    if (bankResult.error) throw new Error(bankResult.error.message)
    for (const row of bankResult.data) {
      bankByContribution.set(row.contribution_id, row)
    }
  }

  const giftTitleById = new Map(
    giftsResult.data.map((row) => [row.id, row.title]),
  )

  return contributionsResult.data.map((row) => {
    const bank = bankByContribution.get(row.id)
    return {
      id: row.id,
      gift_id: row.gift_id,
      gift_title: row.gift_id ? (giftTitleById.get(row.gift_id) ?? null) : null,
      channel: row.channel,
      provider: row.provider,
      amount: Number(row.amount),
      currency: row.currency,
      amount_base: Number(row.amount_base),
      base_currency: row.base_currency,
      fx_rate: Number(row.fx_rate),
      fx_locked_at: row.fx_locked_at,
      fx_source: row.fx_source,
      payer_name: row.payer_name,
      payer_email: row.payer_email,
      payer_phone: row.payer_phone,
      status: row.status,
      applied_at: row.applied_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      bank: bank
        ? {
            reference: bank.reference,
            reminder_count: bank.reminder_count,
            last_reminder_at: bank.last_reminder_at,
            account_id: bank.account_id,
          }
        : null,
    }
  })
}

async function loadAdminContribution(
  weddingId: string,
  contributionId: string,
): Promise<AdminContribution> {
  const rows = await listAdminContributionsHandler(weddingId)
  const row = rows.find((item) => item.id === contributionId)
  if (!row) throw new Error('Contribution not found.')
  return row
}

export async function updateContributionAmountHandler(input: {
  contributionId: string
  amount: number
}): Promise<AdminContribution> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const weddingId = session.wedding.id

  const existing = await admin
    .from('registry_contributions')
    .select(
      'id, amount, currency, amount_base, base_currency, fx_rate, gift_id, payer_name',
    )
    .eq('id', input.contributionId)
    .eq('wedding_id', weddingId)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Contribution not found.')

  const previousAmount = Number(existing.data.amount)
  if (previousAmount === input.amount) {
    return loadAdminContribution(weddingId, input.contributionId)
  }

  const fxRate = Number(existing.data.fx_rate)
  const amountBase = payAmountToBase(input.amount, fxRate)
  if (amountBase <= 0) {
    throw new Error('Amount is too small after conversion.')
  }

  const updated = await admin
    .from('registry_contributions')
    .update({ amount: input.amount, amount_base: amountBase })
    .eq('id', input.contributionId)
    .eq('wedding_id', weddingId)
    .select('id')
    .maybeSingle()

  if (updated.error) throw new Error(updated.error.message)
  if (!updated.data) throw new Error('Contribution not found.')

  await recordActivity({
    weddingId,
    actorId: session.user.id,
    actorEmail: session.profile.email ?? session.user.email ?? null,
    actorRole: session.profile.role,
    action: 'registry.contribution_amount_edited',
    entityType: 'registry_contribution',
    entityId: input.contributionId,
    summary: `Changed contribution amount from ${previousAmount} to ${input.amount} ${existing.data.currency}.`,
    metadata: {
      previousAmount,
      amount: input.amount,
      currency: existing.data.currency,
      previousAmountBase: Number(existing.data.amount_base),
      amountBase,
      baseCurrency: existing.data.base_currency,
      fxRate,
      giftId: existing.data.gift_id,
      payerName: existing.data.payer_name,
    },
  })

  return loadAdminContribution(weddingId, input.contributionId)
}

export async function recordExternalContributionHandler(input: {
  giftId: string
  provider: string
  amount: number
  currency: string
  payerName: string
  payerEmail: string
  payerPhone: string | null
  externalRef: string | null
}): Promise<AdminContribution> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const weddingId = session.wedding.id
  const currency = input.currency.toUpperCase()

  const giftResult = await admin
    .from('registry_items')
    .select('id, title')
    .eq('id', input.giftId)
    .eq('wedding_id', weddingId)
    .maybeSingle()

  if (giftResult.error) throw new Error(giftResult.error.message)
  if (!giftResult.data) throw new Error('Gift not found.')

  const listingResult = await admin
    .from('registry_item_listings')
    .select('url')
    .eq('item_id', input.giftId)
    .eq('wedding_id', weddingId)
    .eq('provider', input.provider)
    .maybeSingle()

  if (listingResult.error) throw new Error(listingResult.error.message)

  const base = await loadGiftBasePrice(weddingId, input.giftId)
  const locked = await lockFxRate({
    baseCurrency: base.currency,
    payCurrency: currency,
  })
  const amountBase = payAmountToBase(input.amount, locked.rate)
  if (amountBase <= 0) {
    throw new Error('Amount is too small after conversion.')
  }

  const now = new Date().toISOString()
  const inserted = await admin
    .from('registry_contributions')
    .insert({
      wedding_id: weddingId,
      gift_id: input.giftId,
      channel: 'external_store',
      provider: input.provider,
      amount: input.amount,
      currency,
      amount_base: amountBase,
      base_currency: locked.baseCurrency,
      fx_rate: locked.rate,
      fx_locked_at: locked.lockedAt,
      fx_source: locked.source,
      payer_name: input.payerName,
      payer_email: input.payerEmail,
      payer_phone: input.payerPhone,
      status: 'received',
      applied_at: now,
      external_ref: input.externalRef,
      listing_url: listingResult.data?.url ?? null,
    })
    .select('id')
    .single()

  if (inserted.error) throw new Error(inserted.error.message)

  await recordActivity({
    weddingId,
    actorId: session.user.id,
    actorEmail: session.profile.email ?? session.user.email ?? null,
    actorRole: session.profile.role,
    action: 'registry.contribution_received',
    entityType: 'registry_contribution',
    entityId: inserted.data.id,
    summary: `Recorded an Amazon purchase of ${input.amount} ${currency} toward “${giftResult.data.title}”.`,
    metadata: {
      amount: input.amount,
      currency,
      amountBase,
      baseCurrency: locked.baseCurrency,
      fxRate: locked.rate,
      giftId: input.giftId,
      provider: input.provider,
      externalRef: input.externalRef,
    },
  })

  return loadAdminContribution(weddingId, inserted.data.id)
}

export async function setContributionStatusHandler(input: {
  contributionId: string
  status: RegistryContributionStatus
}): Promise<AdminContribution> {
  const session = await requireWeddingSession()
  const admin = createAdminSupabaseClient()
  const weddingId = session.wedding.id

  const existing = await admin
    .from('registry_contributions')
    .select('id, status, amount, currency, gift_id, payer_name')
    .eq('id', input.contributionId)
    .eq('wedding_id', weddingId)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) throw new Error('Contribution not found.')

  const previousStatus = existing.data.status as RegistryContributionStatus
  if (previousStatus === input.status) {
    return loadAdminContribution(weddingId, input.contributionId)
  }

  const updated = await admin
    .from('registry_contributions')
    .update({ status: input.status })
    .eq('id', input.contributionId)
    .eq('wedding_id', weddingId)
    .select('id')
    .maybeSingle()

  if (updated.error) throw new Error(updated.error.message)
  if (!updated.data) throw new Error('Contribution not found.')

  const action =
    input.status === 'received'
      ? 'registry.contribution_received'
      : input.status === 'not_received'
        ? 'registry.contribution_not_received'
        : 'registry.contribution_status_updated'

  await recordActivity({
    weddingId,
    actorId: session.user.id,
    actorEmail: session.profile.email ?? session.user.email ?? null,
    actorRole: session.profile.role,
    action,
    entityType: 'registry_contribution',
    entityId: input.contributionId,
    summary: `Marked contribution as ${CONTRIBUTION_STATUS_LABELS[input.status].toLowerCase()} (was ${CONTRIBUTION_STATUS_LABELS[previousStatus].toLowerCase()}).`,
    metadata: {
      previousStatus,
      status: input.status,
      amount: Number(existing.data.amount),
      currency: existing.data.currency,
      giftId: existing.data.gift_id,
      payerName: existing.data.payer_name,
    },
  })

  return loadAdminContribution(weddingId, input.contributionId)
}
