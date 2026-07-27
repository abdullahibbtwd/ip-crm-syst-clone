import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useClientHistory } from '@/features/crm/hooks/useClients'

import type { ClientTabContext } from '../ClientLayout'

export function RelationshipHistoryTab() {
  const { t } = useTranslation(['crm', 'common'])
  const { clientId } = useOutletContext<ClientTabContext>()
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useClientHistory(clientId)

  if (isLoading) return <p className="text-sm text-muted-foreground">{t('history.loading')}</p>

  const entries = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="space-y-4">
      <h2 className="font-medium">{t('history.title')}</h2>
      <ol className="relative space-y-4 border-l border-border pl-4">
        {entries.length === 0 ? (
          <li className="text-sm text-muted-foreground">{t('history.empty')}</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
              <p className="text-sm font-medium capitalize">
                {entry.eventType.replace(/_/g, ' ')}
              </p>
              {entry.description && (
                <p className="text-sm text-muted-foreground">{entry.description}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
                {entry.user ? ` · ${entry.user.fullName}` : ''}
              </p>
            </li>
          ))
        )}
      </ol>
      {hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? t('common:loading.default') : t('history.loadMore')}
        </Button>
      )}
    </div>
  )
}
