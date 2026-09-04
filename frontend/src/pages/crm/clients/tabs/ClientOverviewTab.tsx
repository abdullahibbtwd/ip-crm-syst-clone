import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useOutletContext } from 'react-router-dom'
import { Download, Pencil, X } from 'lucide-react'
import { ClientStatusBadge } from '@/components/crm/ClientStatusBadge'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/AuthProvider'
import { useExportClientData } from '@/features/compliance/hooks/useCompliance'
import { useClient, useUpdateClient } from '@/features/crm/hooks/useClients'
import { useHoldingGroups } from '@/features/crm/hooks/useHoldingGroups'
import type { ClientDetail, ClientStatus } from '@/features/crm/types'
import { clientStatusLabel, clientTypeLabel } from '@/features/crm/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { canViewGdprCompliance } from '@/lib/rbac'
import { getCountryLabel } from '@/lib/countries'
import type { ClientTabContext } from '../ClientLayout'

const NO_HOLDING_GROUP = '__none__'

function withoutRequiredMarker(label: string) {
  return label.replace(/\s+\*$/, '')
}

export function ClientOverviewTab() {
  const { t } = useTranslation('crm')
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data: client, isLoading, isError } = useClient(clientId)
  const [editing, setEditing] = useState(false)

  if (isLoading) return <p className="text-sm text-muted-foreground">{t('overview.loading')}</p>
  if (isError || !client) {
    return <p className="text-sm text-destructive">{t('overview.error')}</p>
  }

  return (
    <ClientOverviewCard
      client={client}
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={() => setEditing(false)}
      onSaved={() => setEditing(false)}
    />
  )
}

function ClientOverviewCard({
  client,
  editing,
  onEdit,
  onCancel,
  onSaved,
}: {
  client: ClientDetail
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation(['crm', 'common'])
  const updateClient = useUpdateClient(client.id)
  const exportData = useExportClientData(client.id)
  const { user } = useAuth()
  const showGdprActions = canViewGdprCompliance(user?.roles ?? [])
  const { data: holdingGroups } = useHoldingGroups({ limit: 50 })

  const [status, setStatus] = useState<ClientStatus>(client.status)
  const [companyName, setCompanyName] = useState(client.companyName ?? '')
  const [registrationNo, setRegistrationNo] = useState(client.registrationNo ?? '')
  const [vatNo, setVatNo] = useState(client.vatNo ?? '')
  const [legalForm, setLegalForm] = useState(client.legalForm ?? '')
  const [firstName, setFirstName] = useState(client.firstName ?? '')
  const [lastName, setLastName] = useState(client.lastName ?? '')
  const [country, setCountry] = useState(client.country ?? '')
  const [website, setWebsite] = useState(client.website ?? '')
  const [holdingGroupId, setHoldingGroupId] = useState(client.holdingGroup?.id ?? NO_HOLDING_GROUP)
  const [notes, setNotes] = useState(client.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) {
      setStatus(client.status)
      setCompanyName(client.companyName ?? '')
      setRegistrationNo(client.registrationNo ?? '')
      setVatNo(client.vatNo ?? '')
      setLegalForm(client.legalForm ?? '')
      setFirstName(client.firstName ?? '')
      setLastName(client.lastName ?? '')
      setCountry(client.country ?? '')
      setWebsite(client.website ?? '')
      setHoldingGroupId(client.holdingGroup?.id ?? NO_HOLDING_GROUP)
      setNotes(client.notes ?? '')
      setError(null)
    }
  }, [client, editing])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (client.type === 'company' && !companyName.trim()) {
      setError(t('overview.validation.companyName'))
      return
    }
    if (client.type === 'individual' && (!firstName.trim() || !lastName.trim())) {
      setError(t('overview.validation.name'))
      return
    }
    if (website.trim() && !/^https?:\/\/.+/i.test(website.trim())) {
      setError(t('overview.validation.website'))
      return
    }

    try {
      await updateClient.mutateAsync({
        status,
        country: country || undefined,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
        holdingGroupId: holdingGroupId === NO_HOLDING_GROUP ? null : holdingGroupId,
        ...(client.type === 'company'
          ? {
              companyName: companyName.trim(),
              registrationNo: registrationNo.trim() || undefined,
              vatNo: vatNo.trim() || undefined,
              legalForm: legalForm.trim() || undefined,
            }
          : {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            }),
      })
      onSaved()
    } catch (err) {
      setError(getApiErrorMessage(err, t('overview.errorSave')))
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-serif text-xl">{client.displayName}</CardTitle>
              {!editing && <ClientStatusBadge status={client.status} />}
              {!editing && (
                <Badge variant="outline" className="normal-case">
                  {clientTypeLabel(client.type)}
                </Badge>
              )}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{client.internalCode}</p>
          </div>
          {!editing && (
            <div className="flex flex-wrap gap-2">
              {showGdprActions ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exportData.isPending}
                  onClick={async () => {
                    const bundle = await exportData.mutateAsync()
                    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
                      type: 'application/json',
                    })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `client-${client.internalCode}-export.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download className="size-4" />
                  {t('overview.exportClientData')}
                </Button>
              ) : null}
              <PermissionGate resource="client" action="update">
                <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="size-4" />
                  {t('overview.edit')}
                </Button>
              </PermissionGate>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {editing ? (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('overview.status')}>
                <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['prospect', 'active', 'inactive', 'archived'] as ClientStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {clientStatusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t('overview.country')}>
                <CountrySelect value={country} onValueChange={setCountry} />
              </Field>

              {client.type === 'company' ? (
                <>
                  <Field label={t('overview.companyName')} className="sm:col-span-2">
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </Field>
                  <Field label={t('overview.legalForm')}>
                    <Input value={legalForm} onChange={(e) => setLegalForm(e.target.value)} />
                  </Field>
                  <Field label={t('overview.registrationNo')}>
                    <Input
                      value={registrationNo}
                      onChange={(e) => setRegistrationNo(e.target.value)}
                    />
                  </Field>
                  <Field label={t('overview.vatNo')}>
                    <Input value={vatNo} onChange={(e) => setVatNo(e.target.value)} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label={t('overview.firstName')}>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </Field>
                  <Field label={t('overview.lastName')}>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
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

              <Field label={t('overview.holdingGroup')} className="sm:col-span-2">
                <Select
                  value={holdingGroupId}
                  onValueChange={(v) => setHoldingGroupId(v ?? NO_HOLDING_GROUP)}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {holdingGroupId === NO_HOLDING_GROUP
                        ? t('overview.none')
                        : holdingGroups?.items.find((g) => g.id === holdingGroupId)?.name ??
                          t('overview.none')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_HOLDING_GROUP} label={t('overview.none')}>
                      {t('overview.none')}
                    </SelectItem>
                    {holdingGroups?.items.map((g) => (
                      <SelectItem key={g.id} value={g.id} label={g.name}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t('overview.notes')} className="sm:col-span-2">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </Field>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={updateClient.isPending}>
                {updateClient.isPending ? t('overview.saving') : t('overview.save')}
              </Button>
              <Button type="button" variant="ghost" onClick={onCancel} disabled={updateClient.isPending}>
                <X className="size-4" />
                {t('overview.cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            {client.type === 'company' ? (
              <>
                <ReadField label={withoutRequiredMarker(t('overview.companyName'))} value={client.companyName} />
                <ReadField label={t('overview.legalForm')} value={client.legalForm} />
                <ReadField label={t('overview.registrationNo')} value={client.registrationNo} />
                <ReadField label={t('overview.vatNo')} value={client.vatNo} />
              </>
            ) : (
              <>
                <ReadField label={withoutRequiredMarker(t('overview.firstName'))} value={client.firstName} />
                <ReadField label={withoutRequiredMarker(t('overview.lastName'))} value={client.lastName} />
              </>
            )}
            <ReadField
              label={t('overview.country')}
              value={client.country ? getCountryLabel(client.country) : null}
            />
            <ReadField label={t('overview.website')} value={client.website} />
            <ReadField label={t('overview.assignedTo')} value={client.assignedUser?.fullName} />
            <ReadField
              label={t('overview.holdingGroup')}
              value={
                client.holdingGroup ? (
                  <Link
                    to={`/holding-groups/${client.holdingGroup.id}`}
                    className="text-primary hover:underline"
                  >
                    {client.holdingGroup.name}
                  </Link>
                ) : null
              }
            />
            <ReadField
              label={t('overview.gdprConsent')}
              value={client.gdprConsent ? t('yesNo.yes', { ns: 'common' }) : t('yesNo.no', { ns: 'common' })}
            />
            {client.notes && (
              <div className="sm:col-span-2">
                <ReadField label={t('overview.notes')} value={client.notes} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      {children}
    </div>
  )
}

function ReadField({ label, value }: { label: string; value: React.ReactNode }) {
  const { t } = useTranslation('common')
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value ?? t('yesNo.dash')}</p>
    </div>
  )
}
