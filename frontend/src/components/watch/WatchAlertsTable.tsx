import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { clientDisplayName } from '@/features/crm/utils'
import { jurisdictionLabel } from '@/features/deadlines/utils'
import type { WatchAlert } from '@/features/watch/types'
import {
  formatDetectedAt,
  formatSimilarityScore,
  registrySourceLabel,
  watchAlertStatusLabel,
  WATCH_ALERT_STATUS_VARIANT,
} from '@/features/watch/utils'
import { cn } from '@/lib/utils'

export const WATCH_ALERT_PAGE_SIZE = 20

type WatchAlertsTableProps = {
  items: WatchAlert[]
  isLoading?: boolean
  pageIndex: number
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}

export function WatchAlertsTable({
  items,
  isLoading,
  pageIndex,
  hasNextPage,
  onPreviousPage,
  onNextPage,
}: WatchAlertsTableProps) {
  const { t } = useTranslation(['watch', 'common'])
  const navigate = useNavigate()
  const colCount = 9

  const rangeStart = items.length === 0 ? 0 : pageIndex * WATCH_ALERT_PAGE_SIZE + 1
  const rangeEnd = pageIndex * WATCH_ALERT_PAGE_SIZE + items.length

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>{t('table.conflict')}</TableHead>
          <TableHead>{t('table.mark')}</TableHead>
          <TableHead>{t('table.similarity')}</TableHead>
          <TableHead>{t('table.client')}</TableHead>
          <TableHead>{t('table.source')}</TableHead>
          <TableHead>{t('table.jurisdiction')}</TableHead>
          <TableHead>{t('table.status')}</TableHead>
          <TableHead>{t('table.detected')}</TableHead>
          <TableHead className="text-right">{t('table.actions', { defaultValue: 'Actions' })}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={colCount} className="py-12 text-center text-sm text-muted-foreground">
              {t('page.loading')}
            </TableCell>
          </TableRow>
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colCount} className="py-12 text-center text-sm text-muted-foreground">
              {t('page.empty')}
            </TableCell>
          </TableRow>
        ) : (
          items.map((alert, index) => (
            <TableRow
              key={alert.id}
              className={cn(
                'cursor-pointer border-border/40 transition-colors',
                index % 2 === 0 ? 'bg-background hover:bg-muted/35' : 'bg-muted/15 hover:bg-muted/40',
                alert.status === 'new' && 'border-l-2 border-l-primary/70',
              )}
              tabIndex={0}
              role="link"
              aria-label={`${t('actions.view', { ns: 'common' })} ${alert.conflictingMark}`}
              onClick={() => navigate(`/watch-alerts/${alert.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/watch-alerts/${alert.id}`)
                }
              }}
            >
              <TableCell className="font-medium text-foreground">{alert.conflictingMark}</TableCell>
              <TableCell className="text-muted-foreground">
                {alert.watchProfile?.markText ?? '—'}
              </TableCell>
              <TableCell>
                {alert.similarityScore != null ? (
                  <Badge variant="secondary">{formatSimilarityScore(alert.similarityScore)}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                {alert.client ? (
                  <Link
                    to={`/clients/${alert.client.id}/watch`}
                    className="text-sm hover:text-primary hover:underline"
                  >
                    {clientDisplayName(alert.client)}
                  </Link>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{registrySourceLabel(alert.source)}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {jurisdictionLabel(alert.jurisdiction)}
              </TableCell>
              <TableCell>
                <Badge variant={WATCH_ALERT_STATUS_VARIANT[alert.status]}>
                  {watchAlertStatusLabel(alert.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDetectedAt(alert.detectedAt)}
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => navigate(`/watch-alerts/${alert.id}`)}
                >
                  <Eye className="size-3.5" />
                  {t('actions.view', { ns: 'common' })}
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
      {!isLoading && items.length > 0 ? (
        <TableFooter>
          <TableRow className="bg-muted/25 hover:bg-muted/25">
            <TableCell colSpan={colCount}>
              <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                <p className="text-sm text-muted-foreground">
                  {items.length === 0
                    ? t('pagination.noResults', { ns: 'common' })
                    : t('pagination.showing', {
                        ns: 'common',
                        start: rangeStart,
                        end: rangeEnd,
                      })}
                  {hasNextPage ? '+' : ''}
                  {pageIndex > 0 ? (
                    <span className="ml-2">
                      · {t('pagination.page', { ns: 'common', page: pageIndex + 1 })}
                    </span>
                  ) : null}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoading || pageIndex === 0}
                    onClick={onPreviousPage}
                  >
                    <ChevronLeft className="size-4" />
                    {t('actions.previous', { ns: 'common' })}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoading || !hasNextPage}
                    onClick={onNextPage}
                  >
                    {t('actions.next', { ns: 'common' })}
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  )
}
