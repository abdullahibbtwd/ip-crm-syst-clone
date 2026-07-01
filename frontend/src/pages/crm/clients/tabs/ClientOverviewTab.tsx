import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Pencil, X } from 'lucide-react'
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
import { useClient, useUpdateClient } from '@/features/crm/hooks/useClients'
import { useHoldingGroups } from '@/features/crm/hooks/useHoldingGroups'
import type { ClientDetail, ClientStatus } from '@/features/crm/types'
import { CLIENT_STATUS_LABELS, CLIENT_TYPE_LABELS } from '@/features/crm/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { getCountryLabel } from '@/lib/countries'
import type { ClientTabContext } from '../ClientLayout'

const NO_HOLDING_GROUP = '__none__'

export function ClientOverviewTab() {
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data: client, isLoading, isError } = useClient(clientId)
  const [editing, setEditing] = useState(false)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading profile…</p>
  if (isError || !client) {
    return <p className="text-sm text-destructive">Failed to load client profile.</p>
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
  const updateClient = useUpdateClient(client.id)
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
      setError('Company name is required')
      return
    }
    if (client.type === 'individual' && (!firstName.trim() || !lastName.trim())) {
      setError('First and last name are required')
      return
    }
    if (website.trim() && !/^https?:\/\/.+/i.test(website.trim())) {
      setError('Website must start with http:// or https://')
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
      setError(getApiErrorMessage(err, 'Failed to save client'))
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
                  {CLIENT_TYPE_LABELS[client.type]}
                </Badge>
              )}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{client.internalCode}</p>
          </div>
          {!editing && (
            <PermissionGate resource="client" action="update">
              <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="size-4" />
                Edit
              </Button>
            </PermissionGate>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {editing ? (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {CLIENT_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Country">
                <CountrySelect value={country} onValueChange={setCountry} />
              </Field>

              {client.type === 'company' ? (
                <>
                  <Field label="Company name *" className="sm:col-span-2">
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </Field>
                  <Field label="Legal form">
                    <Input value={legalForm} onChange={(e) => setLegalForm(e.target.value)} />
                  </Field>
                  <Field label="Registration no.">
                    <Input
                      value={registrationNo}
                      onChange={(e) => setRegistrationNo(e.target.value)}
                    />
                  </Field>
                  <Field label="VAT no.">
                    <Input value={vatNo} onChange={(e) => setVatNo(e.target.value)} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="First name *">
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </Field>
                  <Field label="Last name *">
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </Field>
                </>
              )}

              <Field label="Website" className="sm:col-span-2">
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                />
              </Field>

              <Field label="Holding group" className="sm:col-span-2">
                <Select
                  value={holdingGroupId}
                  onValueChange={(v) => setHoldingGroupId(v ?? NO_HOLDING_GROUP)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_HOLDING_GROUP}>None</SelectItem>
                    {holdingGroups?.items.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Notes" className="sm:col-span-2">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </Field>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={updateClient.isPending}>
                {updateClient.isPending ? 'Saving…' : 'Save changes'}
              </Button>
              <Button type="button" variant="ghost" onClick={onCancel} disabled={updateClient.isPending}>
                <X className="size-4" />
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            {client.type === 'company' ? (
              <>
                <ReadField label="Company name" value={client.companyName} />
                <ReadField label="Legal form" value={client.legalForm} />
                <ReadField label="Registration no." value={client.registrationNo} />
                <ReadField label="VAT no." value={client.vatNo} />
              </>
            ) : (
              <>
                <ReadField label="First name" value={client.firstName} />
                <ReadField label="Last name" value={client.lastName} />
              </>
            )}
            <ReadField
              label="Country"
              value={client.country ? getCountryLabel(client.country) : null}
            />
            <ReadField label="Website" value={client.website} />
            <ReadField label="Assigned to" value={client.assignedUser?.fullName} />
            <ReadField
              label="Holding group"
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
            <ReadField label="GDPR consent" value={client.gdprConsent ? 'Yes' : 'No'} />
            {client.notes && (
              <div className="sm:col-span-2">
                <ReadField label="Notes" value={client.notes} />
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
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value ?? '-'}</p>
    </div>
  )
}
