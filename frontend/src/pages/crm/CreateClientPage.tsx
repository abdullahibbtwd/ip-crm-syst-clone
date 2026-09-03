import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClientRegisteredCorrespondenceFields } from '@/components/crm/ClientRegisteredCorrespondenceFields'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { AttorneyAssigneeSelect } from '@/components/users/AttorneyAssigneeSelect'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  SectionCard,
} from '@/features/create-file/create-file-form'
import {
  correspondenceAddressPayload,
  emptyClientAddressInput,
  toClientAddressPayload,
} from '@/features/crm/addressInput'
import { useCreateClient, useHoldingGroups } from '@/features/crm/hooks/useClients'
import { contactsApi } from '@/features/crm/api'
import type { ClientType } from '@/features/crm/types'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

const NO_HOLDING_GROUP = '__none__'

export function CreateClientPage() {
  const { t } = useTranslation(['crm', 'common'])
  const navigate = useNavigate()
  const createClient = useCreateClient()
  const { data: holdingGroups } = useHoldingGroups({ limit: 200 })

  const [type, setType] = useState<ClientType>('company')
  const [companyName, setCompanyName] = useState('')
  const [legalForm, setLegalForm] = useState('')
  const [registrationNo, setRegistrationNo] = useState('')
  const [vatNo, setVatNo] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [country, setCountry] = useState('BG')
  const [website, setWebsite] = useState('')
  const [assignedUserId, setAssignedUserId] = useState<string | undefined>()
  const [holdingGroupId, setHoldingGroupId] = useState(NO_HOLDING_GROUP)
  const [notes, setNotes] = useState('')
  const [gdprConsent, setGdprConsent] = useState(false)
  const [registeredLegalAddress, setRegisteredLegalAddress] = useState(emptyClientAddressInput())
  const [correspondenceAddress, setCorrespondenceAddress] = useState(emptyClientAddressInput())
  const [correspondenceSameAsRegistered, setCorrespondenceSameAsRegistered] = useState(true)
  const [contactFirstName, setContactFirstName] = useState('')
  const [contactLastName, setContactLastName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (type === 'company' && !companyName.trim()) {
      setError(t('overview.validation.companyName'))
      return
    }
    if (type === 'individual' && (!firstName.trim() || !lastName.trim())) {
      setError(t('overview.validation.name'))
      return
    }

    try {
      const created = await createClient.mutateAsync({
        type,
        status: 'active',
        companyName: type === 'company' ? companyName.trim() : undefined,
        legalForm: legalForm.trim() || undefined,
        registrationNo: registrationNo.trim() || undefined,
        vatNo: vatNo.trim() || undefined,
        firstName: type === 'individual' ? firstName.trim() : undefined,
        lastName: type === 'individual' ? lastName.trim() : undefined,
        country: country || undefined,
        website: website.trim() || undefined,
        assignedUserId,
        holdingGroupId: holdingGroupId === NO_HOLDING_GROUP ? undefined : holdingGroupId,
        notes: notes.trim() || undefined,
        gdprConsent,
        billingName:
          type === 'company'
            ? companyName.trim()
            : [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
        billingCountry: country || undefined,
        registeredLegalAddress: toClientAddressPayload(registeredLegalAddress),
        correspondenceAddress: correspondenceAddressPayload(
          registeredLegalAddress,
          correspondenceAddress,
          correspondenceSameAsRegistered,
        ),
      })

      if (contactFirstName.trim() && contactLastName.trim()) {
        await contactsApi
          .create(created.id, {
            role: 'primary',
            firstName: contactFirstName.trim(),
            lastName: contactLastName.trim(),
            email: contactEmail.trim() || undefined,
            phone: contactPhone.trim() || undefined,
          })
          .catch(() => undefined)
      }

      navigate(`/clients/${created.id}/overview`, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, t('createClient.error')))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <Link
        to="/clients"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-0')}
      >
        {t('createClient.back')}
      </Link>

      <div>
        <h1 className="font-serif text-2xl text-foreground">{t('createClient.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('createClient.description')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard title={t('createClient.identity')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('overview.type')}>
              <Select value={type} onValueChange={(v) => setType(v as ClientType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">{t('type.company')}</SelectItem>
                  <SelectItem value="individual">{t('type.individual')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('overview.country')}>
              <CountrySelect value={country} onValueChange={setCountry} />
            </Field>
            {type === 'company' ? (
              <>
                <Field label={t('overview.companyName')} className="sm:col-span-2">
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </Field>
                <Field label={t('overview.legalForm')}>
                  <Input value={legalForm} onChange={(e) => setLegalForm(e.target.value)} />
                </Field>
                <Field label={t('overview.registrationNo')}>
                  <Input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} />
                </Field>
                <Field label={t('overview.vatNo')}>
                  <Input value={vatNo} onChange={(e) => setVatNo(e.target.value)} />
                </Field>
              </>
            ) : (
              <>
                <Field label={t('overview.firstName')}>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </Field>
                <Field label={t('overview.lastName')}>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </Field>
              </>
            )}
            <Field label={t('overview.website')} className="sm:col-span-2">
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={t('overview.websitePlaceholder')}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title={t('createClient.assignment')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('overview.assignedTo')}>
              <AttorneyAssigneeSelect
                value={assignedUserId}
                onValueChange={setAssignedUserId}
              />
            </Field>
            <Field label={t('overview.holdingGroup')}>
              <Select
                value={holdingGroupId}
                onValueChange={(v) => setHoldingGroupId(v ?? NO_HOLDING_GROUP)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_HOLDING_GROUP}>{t('overview.none')}</SelectItem>
                  {(holdingGroups?.items ?? []).map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={gdprConsent}
                onChange={(e) => setGdprConsent(e.target.checked)}
                className="size-4 rounded border-border"
              />
              {t('overview.gdprConsent')}
            </label>
            <Field label={t('overview.notes')} className="sm:col-span-2">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title={t('createClient.addresses')}>
          <ClientRegisteredCorrespondenceFields
            idPrefix="client"
            registered={registeredLegalAddress}
            correspondence={correspondenceAddress}
            onRegisteredChange={setRegisteredLegalAddress}
            onCorrespondenceChange={setCorrespondenceAddress}
            sameAsRegistered={correspondenceSameAsRegistered}
            onSameAsRegisteredChange={setCorrespondenceSameAsRegistered}
          />
        </SectionCard>

        <SectionCard title={t('createClient.primaryContact')}>
          <p className="mb-3 text-sm text-muted-foreground">{t('createClient.primaryContactHint')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('contacts.firstName')}>
              <Input value={contactFirstName} onChange={(e) => setContactFirstName(e.target.value)} />
            </Field>
            <Field label={t('contacts.lastName')}>
              <Input value={contactLastName} onChange={(e) => setContactLastName(e.target.value)} />
            </Field>
            <Field label={t('contacts.email')}>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </Field>
            <Field label={t('contacts.table.phone')}>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </Field>
          </div>
        </SectionCard>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={createClient.isPending}>
            {createClient.isPending ? t('createClient.creating') : t('createClient.submit')}
          </Button>
          <Link to="/clients" className={buttonVariants({ variant: 'outline' })}>
            {t('common:actions.cancel')}
          </Link>
        </div>
      </form>
    </div>
  )
}
