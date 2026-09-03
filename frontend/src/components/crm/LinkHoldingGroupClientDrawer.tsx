import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fieldVariants } from '@/components/ui/shared'
import type { ClientListItem } from '@/features/crm/types'
import { useClients } from '@/features/crm/hooks/useClients'
import { useLinkClientsToHoldingGroup } from '@/features/crm/hooks/useHoldingGroups'
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
  const linkClients = useLinkClientsToHoldingGroup()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<ClientListItem[]>([])
  const [listOpen, setListOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { data: searchResults, isFetching } = useClients({
    search: debouncedSearch || undefined,
    limit: 50,
  })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setDebouncedSearch('')
      setSelected([])
      setListOpen(true)
      setError(null)
    }
  }, [open])

  const linkedSet = useMemo(() => new Set(linkedClientIds), [linkedClientIds])
  const selectedIds = useMemo(() => new Set(selected.map((client) => client.id)), [selected])

  const clientOptions = useMemo(() => {
    const fromSearch =
      searchResults?.items.filter((client) => !linkedSet.has(client.id)) ?? []
    const extraSelected = selected.filter(
      (client) => !fromSearch.some((option) => option.id === client.id),
    )
    return [...extraSelected, ...fromSearch]
  }, [linkedSet, searchResults?.items, selected])

  const toggleClient = (client: ClientListItem) => {
    setSelected((current) =>
      current.some((item) => item.id === client.id)
        ? current.filter((item) => item.id !== client.id)
        : [...current, client],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selected.length === 0) {
      setError(t('holdingGroups.selectClient'))
      return
    }

    try {
      await linkClients.mutateAsync({
        clientIds: selected.map((client) => client.id),
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
          <label className="text-sm font-medium">{t('holdingGroups.selectClients')}</label>

          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((client) => (
                <span
                  key={client.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs"
                >
                  <span className="truncate font-medium">{client.displayName}</span>
                  <button
                    type="button"
                    className="rounded-sm text-muted-foreground hover:text-foreground"
                    aria-label={t('holdingGroups.removeSelected', { name: client.displayName })}
                    onClick={() => toggleClient(client)}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="rounded-md border bg-card shadow-xs">
            <button
              type="button"
              className={cn(
                fieldVariants(),
                'flex w-full items-center justify-between gap-2 border-0 shadow-none',
              )}
              onClick={() => setListOpen((open) => !open)}
            >
              <span className="truncate text-left text-muted-foreground">
                {selected.length > 0
                  ? t('holdingGroups.selectedCount', { count: selected.length })
                  : t('holdingGroups.selectClientsPlaceholder')}
              </span>
              <ChevronDown
                className={cn('size-4 shrink-0 text-muted-foreground/80 transition-transform', listOpen && 'rotate-180')}
              />
            </button>

            {listOpen ? (
              <div className="border-t">
                <div className="relative border-b p-2">
                  <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('holdingGroups.searchClientsPlaceholder')}
                    className="h-8 pl-8"
                    autoComplete="off"
                  />
                </div>

                <ul className="max-h-56 overflow-y-auto p-1">
                  {clientOptions.length === 0 ? (
                    <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {isFetching
                        ? t('holdingGroups.searchingClients')
                        : t('holdingGroups.noClientsFound')}
                    </li>
                  ) : (
                    clientOptions.map((client) => {
                      const isSelected = selectedIds.has(client.id)
                      return (
                        <li key={client.id}>
                          <button
                            type="button"
                            className={cn(
                              'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                              isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                            )}
                            onClick={() => toggleClient(client)}
                          >
                            <span
                              className={cn(
                                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border',
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-background',
                              )}
                            >
                              {isSelected ? <Check className="size-3 stroke-[2.5]" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{client.displayName}</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {client.internalCode}
                              </span>
                              {client.holdingGroup && client.holdingGroup.id !== holdingGroupId ? (
                                <span className="mt-1 block text-xs text-amber-700">
                                  {t('holdingGroups.alreadyInGroup', {
                                    name: client.holdingGroup.name,
                                  })}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={linkClients.isPending || selected.length === 0}>
          {linkClients.isPending
            ? t('holdingGroups.linking')
            : selected.length > 1
              ? t('holdingGroups.linkSelected', { count: selected.length })
              : t('holdingGroups.linkClient')}
        </Button>
      </form>
    </Drawer>
  )
}
