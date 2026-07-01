import { useState } from 'react'
import { CounterpartiesEditor } from '@/components/intake/CounterpartiesEditor'
import { AttorneyAssigneeSelect } from '@/components/users/AttorneyAssigneeSelect'
import { Button } from '@/components/ui/button'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createIntakeSchema,
  zodFieldErrors,
  type CounterpartyFormValues,
  type CreateIntakeFormValues,
} from '@/features/intake/schemas'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type CreateIntakeFormProps = {
  onSubmit: (data: CreateIntakeFormValues) => Promise<void>
  isSubmitting?: boolean
}

export function CreateIntakeForm({ onSubmit, isSubmitting }: CreateIntakeFormProps) {
  const [enquirerType, setEnquirerType] = useState<'company' | 'individual'>('company')
  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [matterType, setMatterType] = useState<CreateIntakeFormValues['matterType']>('trademark')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal')
  const [referralSource, setReferralSource] =
    useState<CreateIntakeFormValues['referralSource']>('email')
  const [referredBy, setReferredBy] = useState('')
  const [assignedUserId, setAssignedUserId] = useState<string | undefined>()
  const [notes, setNotes] = useState('')
  const [counterparties, setCounterparties] = useState<CounterpartyFormValues[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const payload =
      enquirerType === 'company'
        ? {
            enquirerType: 'company' as const,
            companyName,
            country,
            email,
            phone,
            matterType,
            description,
            urgency,
            referralSource,
            referredBy: referredBy || undefined,
            assignedUserId,
            notes: notes || undefined,
            counterparties: counterparties.length ? counterparties : undefined,
          }
        : {
            enquirerType: 'individual' as const,
            fullName,
            country,
            email,
            phone,
            matterType,
            description,
            urgency,
            referralSource,
            referredBy: referredBy || undefined,
            assignedUserId,
            notes: notes || undefined,
            counterparties: counterparties.length ? counterparties : undefined,
          }

    const parsed = createIntakeSchema.safeParse(payload)
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      return
    }

    try {
      await onSubmit(parsed.data)
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to create intake lead'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Enquirer type</Label>
        <div className="flex gap-2">
          {(['company', 'individual'] as const).map((type) => (
            <Button
              key={type}
              type="button"
              variant={enquirerType === type ? 'default' : 'outline'}
              size="sm"
              className="capitalize"
              onClick={() => setEnquirerType(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {enquirerType === 'company' ? (
          <Field label="Company name *" error={fieldErrors.companyName} className="sm:col-span-2">
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.companyName)}
            />
          </Field>
        ) : (
          <Field label="Full name *" error={fieldErrors.fullName} className="sm:col-span-2">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
          </Field>
        )}

        <Field label="Country *" error={fieldErrors.country}>
          <CountrySelect
            value={country}
            onValueChange={setCountry}
            allowEmpty={false}
            aria-invalid={Boolean(fieldErrors.country)}
          />
        </Field>

        <Field label="Email *" error={fieldErrors.email}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            aria-invalid={Boolean(fieldErrors.email)}
          />
        </Field>

        <Field label="Phone *" error={fieldErrors.phone}>
          <Input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+359 88 123 4567"
            aria-invalid={Boolean(fieldErrors.phone)}
          />
        </Field>

        <Field label="Matter type *" error={fieldErrors.matterType}>
          <Select
            value={matterType}
            onValueChange={(v) => setMatterType(v as CreateIntakeFormValues['matterType'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trademark">Trademark</SelectItem>
              <SelectItem value="patent">Patent</SelectItem>
              <SelectItem value="utility_model">Utility model</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Urgency" error={fieldErrors.urgency}>
          <Select value={urgency} onValueChange={(v) => setUrgency(v as 'normal' | 'urgent')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Referral source *" error={fieldErrors.referralSource}>
          <Select
            value={referralSource}
            onValueChange={(v) =>
              setReferralSource(v as CreateIntakeFormValues['referralSource'])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="walk_in">Walk-in</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Referred by" error={fieldErrors.referredBy}>
          <Input
            value={referredBy}
            onChange={(e) => setReferredBy(e.target.value)}
            placeholder="If referral"
          />
        </Field>

        <Field label="Responsible attorney" error={fieldErrors.assignedUserId} className="sm:col-span-2">
          <AttorneyAssigneeSelect
            value={assignedUserId}
            onValueChange={setAssignedUserId}
            aria-invalid={Boolean(fieldErrors.assignedUserId)}
          />
        </Field>
      </div>

      <Field label="Description *" error={fieldErrors.description}>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder={
            matterType === 'trademark'
              ? 'Describe the enquiry and include the sign / word mark to check (e.g. ACME, Red Star logo).'
              : 'What does the enquirer need?'
          }
        />
      </Field>

      <Field label="Internal notes" error={fieldErrors.notes}>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </Field>

      <div className="space-y-2 border-t pt-6">
        <p className="text-sm font-medium">Adverse parties / competitors</p>
        <p className="text-sm text-muted-foreground">
          Optional - record who is on the other side. Included in the conflict check.
        </p>
        <CounterpartiesEditor value={counterparties} onChange={setCounterparties} />
        {fieldErrors.counterparties && (
          <p className="text-xs text-destructive">{fieldErrors.counterparties}</p>
        )}
      </div>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Create intake lead'}
      </Button>
    </form>
  )
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className={cn(error && 'text-destructive')}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
