import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Plus, Star } from 'lucide-react'
import { ClientAddressInsightsPanel } from '@/components/crm/ClientAddressInsightsPanel'
import { Drawer } from '@/components/crm/Drawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Input } from '@/components/ui/input'
import { getCountryLabel } from '@/lib/countries'
import { clientAddressesEqual } from '@/features/crm/addressInput'
import {
  useCreateOffice,
  useDeleteOffice,
  useOffices,
  useSetOfficePrimary,
  useUpsertTypedAddress,
} from '@/features/crm/hooks/useOffices'
import { getApiErrorMessage } from '@/lib/api-client'
import type { ClientTabContext } from '../ClientLayout'
import { ClientTypedAddressForm } from './ClientTypedAddressForm'

export function OfficesTab() {
  const { t } = useTranslation(['crm', 'common'])
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data: offices, isLoading } = useOffices(clientId)
  const setPrimary = useSetOfficePrimary(clientId)
  const deleteOffice = useDeleteOffice(clientId)
  const upsertCorrespondence = useUpsertTypedAddress(clientId, 'correspondence')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [correspondenceSameAsRegistered, setCorrespondenceSameAsRegistered] = useState(true)
  const sameAsInitialized = useRef(false)

  const registeredOffice = offices?.find((o) => o.addressType === 'registered_legal')
  const correspondenceOffice = offices?.find((o) => o.addressType === 'correspondence')
  const branchOffices = offices?.filter((o) => o.addressType === 'branch') ?? []

  useEffect(() => {
    if (isLoading || sameAsInitialized.current) return
    sameAsInitialized.current = true
    setCorrespondenceSameAsRegistered(
      clientAddressesEqual(registeredOffice, correspondenceOffice),
    )
  }, [isLoading, registeredOffice, correspondenceOffice])

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('offices.loading')}</p>
  }

  return (
    <div className="space-y-8">
      <ClientAddressInsightsPanel clientId={clientId} />

      <section className="space-y-4">
        <h2 className="font-medium">{t('offices.addresses.title')}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ClientTypedAddressForm
            clientId={clientId}
            addressType="registered_legal"
            office={registeredOffice}
            onSaved={(payload) => {
              if (!correspondenceSameAsRegistered) return
              void upsertCorrespondence.mutateAsync(payload)
            }}
          />
          <ClientTypedAddressForm
            clientId={clientId}
            addressType="correspondence"
            office={correspondenceOffice}
            sourceOffice={registeredOffice}
            sameAsRegistered={correspondenceSameAsRegistered}
            onSameAsRegisteredChange={setCorrespondenceSameAsRegistered}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{t('offices.addresses.additionalOffices')}</h2>
          <PermissionGate resource="client" action="update">
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              <Plus className="size-4" />
              {t('offices.add')}
            </Button>
          </PermissionGate>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          {branchOffices.map((office) => (
            <div key={office.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{office.label}</p>
                  {office.isPrimary && (
                    <Badge variant="secondary" className="mt-1 gap-1">
                      <Star className="size-3" />
                      {t('offices.primary')}
                    </Badge>
                  )}
                </div>
                <PermissionGate resource="client" action="update">
                  {!office.isPrimary && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setPrimary.isPending}
                      onClick={() => {
                        setError(null)
                        setPrimary.mutate(office.id, {
                          onError: (err) =>
                            setError(getApiErrorMessage(err, t('offices.errorPrimary'))),
                        })
                      }}
                    >
                      {t('offices.setPrimaryAction')}
                    </Button>
                  )}
                </PermissionGate>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {[office.addressLine1, office.city, office.country ? getCountryLabel(office.country) : null]
                  .filter(Boolean)
                  .join(', ') || t('offices.noAddress')}
              </p>
              {office.phone && (
                <p className="mt-1 text-xs text-muted-foreground">{office.phone}</p>
              )}
              <PermissionGate resource="client" action="update">
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 text-destructive"
                  onClick={() => deleteOffice.mutate(office.id)}
                >
                  {t('offices.remove')}
                </Button>
              </PermissionGate>
            </div>
          ))}
        </div>

        {branchOffices.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('offices.empty')}</p>
        )}
      </section>

      <AddOfficeDrawer
        clientId={clientId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}

function AddOfficeDrawer({
  clientId,
  open,
  onClose,
}: {
  clientId: string
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation(['crm', 'common'])
  const createOffice = useCreateOffice(clientId)
  const [label, setLabel] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createOffice.mutateAsync({ label, city: city || undefined, country: country || undefined, isPrimary })
      setLabel('')
      setCity('')
      setCountry('')
      setIsPrimary(false)
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('offices.drawerTitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('offices.label')}>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </Field>
        <Field label={t('offices.city')}>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label={t('overview.country')}>
          <CountrySelect value={country} onValueChange={setCountry} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          {t('offices.setPrimary')}
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={createOffice.isPending}>
          {createOffice.isPending ? t('loading.saving', { ns: 'common' }) : t('offices.save')}
        </Button>
      </form>
    </Drawer>
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
