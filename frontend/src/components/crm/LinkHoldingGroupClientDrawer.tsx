import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from '@/components/crm/Drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClients } from '@/features/crm/hooks/useClients'
import { useSetClientHoldingGroup } from '@/features/crm/hooks/useHoldingGroups'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type LinkHoldingGroupClientDrawerProps = {
  holdingGroupId: string
  linkedClientIds: string[]
  open: boolean
  onClose: () => void
}

export function LinkHoldingGroupClientDrawer({
  holdingGroupId,
  linkedClientIds,
  open,
  onClose,
}: LinkHoldingGroupClientDrawerProps) {
  const { t } = useTranslation('crm')
  const setHoldingGroup = useSetClientHoldingGroup()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: searchResults } = useClients({
    search: debouncedSearch || undefined,
    limit: 15,
  })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setDebouncedSearch('')
      setSelectedClientId(null)
      setError(null)
    }
  }, [open])

  const linkedSet = new Set(linkedClientIds)
  const clientOptions =
    searchResults?.items.filter((client) => !linkedSet.has(client.id)) ?? []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedClientId) {
      setError(t('holdingGroups.selectClient'))
      return
    }

    try {
      await setHoldingGroup.mutateAsync({
        clientId: selectedClientId,
        holdingGroupId,
        holdingGroupIdForInvalidate: holdingGroupId,
      })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('holdingGroups.linkFailed')))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('holdingGroups.linkClientDrawerTitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('holdingGroups.linkClientDescription')}</p>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('holdingGroups.searchClients')}</label>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedClientId(null)
            }}
            placeholder={t('holdingGroups.searchClientsPlaceholder')}
          />
        </div>

        {debouncedSearch ? (
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1">
            {clientOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {t('holdingGroups.noClientsFound')}
              </li>
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
                    {client.holdingGroup && client.holdingGroup.id !== holdingGroupId ? (
                      <span className="mt-1 block text-xs text-amber-700">
                        {t('holdingGroups.alreadyInGroup', { name: client.holdingGroup.name })}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={setHoldingGroup.isPending}>
          {setHoldingGroup.isPending ? t('holdingGroups.linking') : t('holdingGroups.linkClient')}
        </Button>
      </form>
    </Drawer>
  )
}
