import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpsertTypedAddress } from '@/features/crm/hooks/useOffices'
import { getApiErrorMessage } from '@/lib/api-client'
import { toClientAddressInput } from '@/features/crm/addressInput'
import type { ClientOffice, ClientOfficeAddressType } from '@/features/crm/types'

type TypedAddressType = Extract<
  ClientOfficeAddressType,
  'registered_legal' | 'correspondence'
>

type ClientTypedAddressFormProps = {
  clientId: string
  addressType: TypedAddressType
  office: ClientOffice | undefined
  sourceOffice?: ClientOffice
  sameAsRegistered?: boolean
  onSameAsRegisteredChange?: (same: boolean) => void
  onSaved?: (payload: Partial<ClientOffice>) => void
}

function officePayload(office: {
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  region?: string | null
  postalCode?: string | null
  country?: string | null
  phone?: string | null
  fax?: string | null
}): Partial<ClientOffice> {
  return {
    addressLine1: office.addressLine1 || undefined,
    addressLine2: office.addressLine2 || undefined,
    city: office.city || undefined,
    region: office.region || undefined,
    postalCode: office.postalCode || undefined,
    country: office.country || undefined,
    phone: office.phone || undefined,
    fax: office.fax || undefined,
  }
}

export function ClientTypedAddressForm({
  clientId,
  addressType,
  office,
  sourceOffice,
  sameAsRegistered = false,
  onSameAsRegisteredChange,
  onSaved,
}: ClientTypedAddressFormProps) {
  const { t } = useTranslation(['crm', 'common'])
  const upsert = useUpsertTypedAddress(clientId, addressType)
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [fax, setFax] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const applyOffice = (next: ClientOffice | undefined) => {
    const fields = toClientAddressInput(next)
    setAddressLine1(fields.addressLine1 ?? '')
    setAddressLine2(fields.addressLine2 ?? '')
    setCity(fields.city ?? '')
    setRegion(fields.region ?? '')
    setPostalCode(fields.postalCode ?? '')
    setCountry(fields.country ?? '')
    setPhone(fields.phone ?? '')
    setFax(fields.fax ?? '')
    setSaved(false)
  }

  useEffect(() => {
    applyOffice(office)
  }, [office])

  useEffect(() => {
    if (addressType !== 'correspondence' || !sameAsRegistered) return
    applyOffice(sourceOffice)
  }, [addressType, sameAsRegistered, sourceOffice])

  const titleKey =
    addressType === 'registered_legal'
      ? 'offices.addresses.registeredLegal'
      : 'offices.addresses.correspondence'

  const currentPayload = (): Partial<ClientOffice> => {
    if (addressType === 'correspondence' && sameAsRegistered) {
      return officePayload(toClientAddressInput(sourceOffice))
    }
    return officePayload({
      addressLine1,
      addressLine2,
      city,
      region,
      postalCode,
      country,
      phone,
      fax,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    const payload = currentPayload()
    try {
      await upsert.mutateAsync(payload)
      setSaved(true)
      onSaved?.(payload)
    } catch (err) {
      setError(getApiErrorMessage(err, t('offices.addresses.errorSave')))
    }
  }

  const hideFields = addressType === 'correspondence' && sameAsRegistered

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="font-medium">{t(titleKey)}</h3>

      {addressType === 'correspondence' && onSameAsRegisteredChange ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border"
            checked={sameAsRegistered}
            onChange={(e) => onSameAsRegisteredChange(e.target.checked)}
          />
          <span>{t('offices.addresses.sameAsRegistered')}</span>
        </label>
      ) : null}

      {hideFields ? (
        <p className="text-sm text-muted-foreground">
          {t('offices.addresses.sameAsRegisteredHint')}
        </p>
      ) : (
        <>
          <Field label={t('offices.addresses.addressLine1')}>
            <Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
          </Field>
          <Field label={t('offices.addresses.addressLine2')}>
            <Input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('offices.city')}>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label={t('offices.addresses.region')}>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('offices.addresses.postalCode')}>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </Field>
            <Field label={t('overview.country')}>
              <CountrySelect value={country} onValueChange={setCountry} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('offices.addresses.phone')}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label={t('offices.addresses.fax')}>
              <Input value={fax} onChange={(e) => setFax(e.target.value)} />
            </Field>
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p className="text-sm text-muted-foreground">{t('offices.addresses.saved')}</p>
      )}

      <PermissionGate resource="client" action="update">
        <Button type="submit" size="sm" disabled={upsert.isPending}>
          {upsert.isPending
            ? t('loading.saving', { ns: 'common' })
            : t('offices.addresses.save')}
        </Button>
      </PermissionGate>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}
