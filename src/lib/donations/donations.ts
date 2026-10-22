import { createServerFn } from '@tanstack/react-start'

export const submitDonationThanks = createServerFn({ method: 'POST' })
  .validator(
    (data: { donorName: string; donorEmail: string; message?: string }) => ({
      donorName: data.donorName,
      donorEmail: data.donorEmail,
      message: data.message,
    }),
  )
  .handler(async ({ data }) => {
    const { submitDonationThanksHandler } = await import('./donations.server')
    return submitDonationThanksHandler(data)
  })
