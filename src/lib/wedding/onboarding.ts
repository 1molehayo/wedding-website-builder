import { createServerFn } from '@tanstack/react-start'
import type { OnboardingInput } from '@/lib/wedding/onboarding-validation'
import { parseOnboardingInput } from '@/lib/wedding/onboarding-validation'
import type { Wedding } from '@/lib/supabase/types'

export const completeOnboarding = createServerFn({ method: 'POST' })
  .validator((data: OnboardingInput) => parseOnboardingInput(data))
  .handler(async ({ data }): Promise<Wedding> => {
    const { completeOnboardingHandler } = await import('./onboarding.server')
    return completeOnboardingHandler(data)
  })
