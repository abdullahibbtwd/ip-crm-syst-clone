import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('crm')
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
      setFormError(getApiErrorMessage(err, t('holdingGroups.formError')))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label={t('holdingGroups.name')} error={fieldErrors.name}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
          placeholder={t('holdingGroups.namePlaceholder')}
        />
      </Field>

      <Field label={t('overview.country')} error={fieldErrors.country}>
        <CountrySelect
          value={country}
          onValueChange={setCountry}
          aria-invalid={Boolean(fieldErrors.country)}
        />
      </Field>

      <Field label={t('holdingGroups.descriptionField')} error={fieldErrors.description}>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={Boolean(fieldErrors.description)}
          placeholder={t('holdingGroups.notesPlaceholder')}
          rows={4}
        />
      </Field>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('holdingGroups.creating') : t('holdingGroups.create')}
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
