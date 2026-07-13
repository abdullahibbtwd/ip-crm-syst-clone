import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePortalCorrespondence } from '@/features/correspondence/hooks/useCorrespondence'
import {
  DIRECTION_LABELS,
  formatCorrespondenceDate,
} from '@/features/correspondence/utils'
import { cn } from '@/lib/utils'

export function PortalCorrespondencePage() {
  const { t } = useTranslation('portal')
  const { data: rows, isLoading, isError } = usePortalCorrespondence()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {t('correspondence.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('correspondence.description')}</p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">{t('correspondence.loading')}</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">{t('correspondence.error')}</p>
      )}

      {rows && rows.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('correspondence.empty')}
        </p>
      )}

      {rows && rows.length > 0 && (
        <>
          <ul className="space-y-3 md:hidden">
            {rows.map((item) => (
              <li key={item.id} className="rounded-lg border p-4">
                <p className="font-medium leading-snug break-words">{item.subject}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.matter.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'normal-case',
                      item.direction === 'incoming'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
                    )}
                  >
                    {DIRECTION_LABELS[item.direction]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatCorrespondenceDate(item.correspondenceDate)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('correspondence.table.subject')}</TableHead>
                  <TableHead>{t('correspondence.table.date')}</TableHead>
                  <TableHead>{t('correspondence.table.direction')}</TableHead>
                  <TableHead>{t('correspondence.table.matter')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[280px] font-medium">
                      <span className="line-clamp-2 whitespace-normal">{item.subject}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCorrespondenceDate(item.correspondenceDate)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'normal-case',
                          item.direction === 'incoming'
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
                        )}
                      >
                        {DIRECTION_LABELS[item.direction]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{item.matter.title}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
