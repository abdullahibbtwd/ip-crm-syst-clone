import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClientAddressFields } from '@/components/crm/ClientAddressFields'
import { CounterpartiesEditor } from '@/components/intake/CounterpartiesEditor'
import { IntakePartyFields } from '@/components/intake/IntakePartyFields'
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
  type IntakePartyFormValues,
} from '@/features/intake/schemas'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  emptyClientAddressInput,
  toClientAddressPayload,
} from '@/features/crm/addressInput'
import { ALL_MATTER_TYPES, matterTypeLabel } from '@/features/matters/utils'
import { cn } from '@/lib/utils'

export type IntakeFormInitialValues = {
  enquirerType?: 'company' | 'individual'
  companyName?: string
  fullName?: string
  country?: string
  email?: string
  phone?: string
  matterType?: CreateIntakeFormValues['matterType']
  description?: string
  urgency?: 'normal' | 'urgent'
  referralSource?: CreateIntakeFormValues['referralSource']
  referredBy?: string
  assignedUserId?: string
  notes?: string
  counterparties?: CounterpartyFormValues[]
  applicant?: IntakePartyFormValues
  intermediary?: IntakePartyFormValues
}

type CreateIntakeFormProps = {
  onSubmit: (data: CreateIntakeFormValues) => Promise<void>
  isSubmitting?: boolean
  variant?: 'internal' | 'portal'
  defaultEmail?: string
  defaultFullName?: string
  initialMatterType?: CreateIntakeFormValues['matterType']
  initialValues?: IntakeFormInitialValues
  submitLabel?: string
}

export function CreateIntakeForm({
  onSubmit,
  isSubmitting,
  variant = 'internal',
  defaultEmail = '',
  defaultFullName = '',
  initialMatterType = 'trademark',
  initialValues,
  submitLabel,
}: CreateIntakeFormProps) {
  const { t } = useTranslation(['intake', 'crm', 'common'])
  const isPortal = variant === 'portal'
  const [enquirerType, setEnquirerType] = useState<'company' | 'individual'>(
    initialValues?.enquirerType ?? 'company',
  )
  const [companyName, setCompanyName] = useState(initialValues?.companyName ?? '')
  const [fullName, setFullName] = useState(initialValues?.fullName ?? defaultFullName)
  const [country, setCountry] = useState(initialValues?.country ?? '')
  const [email, setEmail] = useState(initialValues?.email ?? defaultEmail)
  const [phone, setPhone] = useState(initialValues?.phone ?? '')
  const [matterType, setMatterType] = useState<CreateIntakeFormValues['matterType']>(
    initialValues?.matterType ?? initialMatterType,
  )
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>(initialValues?.urgency ?? 'normal')
  const [referralSource, setReferralSource] = useState<CreateIntakeFormValues['referralSource']>(
    initialValues?.referralSource ?? (isPortal ? 'website' : 'email'),
  )
  const [referredBy, setReferredBy] = useState(initialValues?.referredBy ?? '')
  const [assignedUserId, setAssignedUserId] = useState<string | undefined>(
    initialValues?.assignedUserId,
  )
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [counterparties, setCounterparties] = useState<CounterpartyFormValues[]>(
    initialValues?.counterparties ?? [],
  )
  const [applicant, setApplicant] = useState<IntakePartyFormValues | undefined>(
    initialValues?.applicant,
  )
  const [intermediary, setIntermediary] = useState<IntakePartyFormValues | undefined>(
    initialValues?.intermediary,
  )
  const [registeredLegalAddress, setRegisteredLegalAddress] = useState(
    emptyClientAddressInput(),
  )
  const [correspondenceAddress, setCorrespondenceAddress] = useState(
    emptyClientAddressInput(),
  )
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
            referralSource: isPortal ? 'website' : referralSource,
            referredBy: referredBy || undefined,
            assignedUserId,
            notes: notes || undefined,
            counterparties: counterparties.length ? counterparties : undefined,
            applicant,
            intermediary,
            registeredLegalAddress: toClientAddressPayload(registeredLegalAddress),
            correspondenceAddress: toClientAddressPayload(correspondenceAddress),
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
            referralSource: isPortal ? 'website' : referralSource,
            referredBy: referredBy || undefined,
            assignedUserId,
            notes: notes || undefined,
            counterparties: counterparties.length ? counterparties : undefined,
            applicant,
            intermediary,
            registeredLegalAddress: toClientAddressPayload(registeredLegalAddress),
            correspondenceAddress: toClientAddressPayload(correspondenceAddress),
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
        <Label>{t('intake:form.enquirerType')}</Label>
        <p className="text-xs text-muted-foreground">{t('intake:form.clientSectionHint')}</p>
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
              {t(`intake:form.type.${type}`)}
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

        <div className="space-y-4 border-t pt-4 sm:col-span-2">
          <p className="text-sm font-medium">{t('offices.addresses.title', { ns: 'crm' })}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <ClientAddressFields
              idPrefix="intake-registered"
              title={t('offices.addresses.registeredLegal', { ns: 'crm' })}
              value={registeredLegalAddress}
              onChange={setRegisteredLegalAddress}
            />
            <ClientAddressFields
              idPrefix="intake-correspondence"
              title={t('offices.addresses.correspondence', { ns: 'crm' })}
              value={correspondenceAddress}
              onChange={setCorrespondenceAddress}
            />
          </div>
        </div>

        <Field label={t('form.matterType')} error={fieldErrors.matterType}>
          <Select
            value={matterType}
            onValueChange={(v) => setMatterType(v as CreateIntakeFormValues['matterType'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_MATTER_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {matterTypeLabel(type)}
                </SelectItem>
              ))}
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

        {!isPortal && (
          <>
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
          </>
        )}
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

      {!isPortal && (
        <Field label="Internal notes" error={fieldErrors.notes}>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
      )}

      <div className="space-y-3 border-t pt-6">
        <div>
          <p className="text-sm font-medium">{t('intake:parties.title')}</p>
          <p className="text-sm text-muted-foreground">{t('intake:parties.hint')}</p>
        </div>
        <IntakePartyFields
          label={t('intake:parties.applicant')}
          hint={t('intake:parties.applicantHint')}
          value={applicant}
          onChange={setApplicant}
        />
        <IntakePartyFields
          label={t('intake:parties.intermediary')}
          hint={t('intake:parties.intermediaryHint')}
          value={intermediary}
          onChange={setIntermediary}
        />
      </div>

      <div className="space-y-2 border-t pt-6">
        <p className="text-sm font-medium">
          {isPortal ? 'Competitors / adverse parties (optional)' : 'Adverse parties / competitors'}
        </p>
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
        {isSubmitting
          ? 'Saving…'
          : submitLabel ?? (isPortal ? 'Submit enquiry' : 'Create intake lead')}
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
