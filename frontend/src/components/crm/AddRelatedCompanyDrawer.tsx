import { useEffect, useState } from 'react'
import { Drawer } from '@/components/crm/Drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients } from '@/features/crm/hooks/useClients'
import { useCreateRelatedCompany } from '@/features/crm/hooks/useRelatedCompanies'
import { RELATIONSHIP_TYPE_LABELS } from '@/features/crm/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type LinkMode = 'client' | 'external'

type AddRelatedCompanyDrawerProps = {
  clientId: string
  open: boolean
  onClose: () => void
}

export function AddRelatedCompanyDrawer({
  clientId,
  open,
  onClose,
}: AddRelatedCompanyDrawerProps) {
  const createRelated = useCreateRelatedCompany(clientId)
  const [linkMode, setLinkMode] = useState<LinkMode>('external')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [externalName, setExternalName] = useState('')
  const [relationshipType, setRelationshipType] =
    useState<'subsidiary' | 'affiliate' | 'parent'>('subsidiary')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: searchResults } = useClients({
    search: debouncedSearch || undefined,
    limit: 10,
  })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!open) {
      setLinkMode('external')
      setSearch('')
      setDebouncedSearch('')
      setSelectedClientId(null)
      setExternalName('')
      setRelationshipType('subsidiary')
      setNotes('')
      setError(null)
    }
  }, [open])

  const clientOptions =
    searchResults?.items.filter((c) => c.id !== clientId) ?? []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (linkMode === 'client' && !selectedClientId) {
      setError('Select a client from the search results')
      return
    }
    if (linkMode === 'external' && !externalName.trim()) {
      setError('Enter the external company name')
      return
    }

    try {
      await createRelated.mutateAsync({
        relationshipType,
        notes: notes.trim() || undefined,
        ...(linkMode === 'client'
          ? { relatedClientId: selectedClientId }
          : { externalName: externalName.trim() }),
      })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to add related company'))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add related company">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Link type</p>
          <div className="flex gap-2">
            {(
              [
                ['external', 'External name'],
                ['client', 'Existing client'],
              ] as const
            ).map(([mode, label]) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={linkMode === mode ? 'default' : 'outline'}
                onClick={() => {
                  setLinkMode(mode)
                  setError(null)
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {linkMode === 'external' ? (
          <Field label="Company name *">
            <Input
              value={externalName}
              onChange={(e) => setExternalName(e.target.value)}
              placeholder="e.g. Acme Holdings Ltd"
            />
          </Field>
        ) : (
          <div className="space-y-2">
            <Field label="Search clients *">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setSelectedClientId(null)
                }}
                placeholder="Search by name or code…"
              />
            </Field>
            {debouncedSearch && (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
                {clientOptions.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">No clients found</li>
                ) : (
                  clientOptions.map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        className={cn(
                          'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                          selectedClientId === client.id
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted',
                        )}
                        onClick={() => setSelectedClientId(client.id)}
                      >
                        <span className="font-medium">{client.displayName}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {client.internalCode}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}

        <Field label="Relationship *">
          <Select
            value={relationshipType}
            onValueChange={(v) =>
              setRelationshipType(v as 'subsidiary' | 'affiliate' | 'parent')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RELATIONSHIP_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional context"
          />
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={createRelated.isPending}>
          {createRelated.isPending ? 'Saving…' : 'Save related company'}
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
