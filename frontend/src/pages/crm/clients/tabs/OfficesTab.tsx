import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus, Star } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Input } from '@/components/ui/input'
import { getCountryLabel } from '@/lib/countries'
import {
  useCreateOffice,
  useDeleteOffice,
  useOffices,
  useSetOfficePrimary,
} from '@/features/crm/hooks/useOffices'
import { getApiErrorMessage } from '@/lib/api-client'
import type { ClientTabContext } from '../ClientLayout'

export function OfficesTab() {
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data: offices, isLoading } = useOffices(clientId)
  const setPrimary = useSetOfficePrimary(clientId)
  const deleteOffice = useDeleteOffice(clientId)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading offices…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Offices</h2>
        <PermissionGate resource="client" action="update">
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" />
            Add office
          </Button>
        </PermissionGate>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {(offices ?? []).map((office) => (
          <div key={office.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{office.label}</p>
                {office.isPrimary && (
                  <Badge variant="secondary" className="mt-1 gap-1">
                    <Star className="size-3" />
                    Primary
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
                          setError(getApiErrorMessage(err, 'Failed to set primary office')),
                      })
                    }}
                  >
                    Set primary
                  </Button>
                )}
              </PermissionGate>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {[office.addressLine1, office.city, office.country ? getCountryLabel(office.country) : null]
                .filter(Boolean)
                .join(', ') || 'No address'}
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
                Remove
              </Button>
            </PermissionGate>
          </div>
        ))}
      </div>

      {offices?.length === 0 && (
        <p className="text-sm text-muted-foreground">No offices yet.</p>
      )}

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
    <Drawer open={open} onClose={onClose} title="Add office">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Label *">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </Field>
        <Field label="City">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Country">
          <CountrySelect value={country} onValueChange={setCountry} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          Set as primary office
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={createOffice.isPending}>
          {createOffice.isPending ? 'Saving…' : 'Save office'}
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
