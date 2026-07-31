import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { useClients } from '@/features/crm/hooks/useClients'
import { clientDisplayName } from '@/features/crm/utils'
import { cn } from '@/lib/utils'

type MatterPartyLinkProps = {
  label: string
  hint?: string
  excludeClientId: string
  value: string | undefined
  onChange: (clientId: string | undefined) => void
}

export function MatterPartyLink({
  label,
  hint,
  excludeClientId,
  value,
  onChange,
}: MatterPartyLinkProps) {
  const { t } = useTranslation('matters')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data } = useClients({
    search: debounced || undefined,
    limit: 8,
    status: 'active',
  })
  const options = data?.items.filter((c) => c.id !== excludeClientId) ?? []
  const selected = options.find((c) => c.id === value)

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {value ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>
            {selected ? clientDisplayName(selected) : value}
          </span>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => {
              onChange(undefined)
              setSearch('')
            }}
          >
            {t('parties.clear')}
          </button>
        </div>
      ) : (
        <>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('parties.searchPlaceholder')}
          />
          <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
            {options.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={cn(
                    'w-full rounded-md px-2 py-1.5 text-left hover:bg-muted',
                  )}
                  onClick={() => onChange(c.id)}
                >
                  {clientDisplayName(c)}
                  {c.internalCode ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({c.internalCode})
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
