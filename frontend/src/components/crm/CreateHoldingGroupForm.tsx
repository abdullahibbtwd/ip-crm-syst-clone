import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createHoldingGroupSchema,
  zodFieldErrors,
  type CreateHoldingGroupFormValues,
} from '@/features/crm/schemas'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type CreateHoldingGroupFormProps = {
  onSubmit: (data: CreateHoldingGroupFormValues) => Promise<void>
  isSubmitting?: boolean
}

export function CreateHoldingGroupForm({
  onSubmit,
  isSubmitting,
}: CreateHoldingGroupFormProps) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const parsed = createHoldingGroupSchema.safeParse({ name, country, description })
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      return
    }

    try {
      await onSubmit(parsed.data)
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to create holding group'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Name *" error={fieldErrors.name}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
          placeholder="e.g. Acme Group BV"
        />
      </Field>

      <Field label="Country" error={fieldErrors.country}>
        <CountrySelect
          value={country}
          onValueChange={setCountry}
          aria-invalid={Boolean(fieldErrors.country)}
        />
      </Field>

      <Field label="Description" error={fieldErrors.description}>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={Boolean(fieldErrors.description)}
          placeholder="Optional notes about this holding structure"
          rows={4}
        />
      </Field>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create holding group'}
      </Button>
    </form>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(error && 'text-destructive')}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
