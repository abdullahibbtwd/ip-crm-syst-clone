import { z } from 'zod'
import { getCountryOptions } from '@/lib/countries'

const validCountryCodes = new Set(getCountryOptions().map((c) => c.code))

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v))

const optionalCountryCode = z
  .string()
  .refine((v) => v === '' || validCountryCodes.has(v), {
    message: 'Select a valid country',
  })
  .transform((v) => (v === '' ? undefined : v))

export const createHoldingGroupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  country: optionalCountryCode,
  description: optionalTrimmed(1000),
})

export type CreateHoldingGroupFormValues = z.infer<typeof createHoldingGroupSchema>

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? '_form'
    if (!out[key]) out[key] = issue.message
  }
  return out
}
