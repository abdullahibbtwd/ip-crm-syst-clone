import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMatterDocuments } from '@/features/documents/hooks/useDocuments'
import {
  secondaryHistoryFromAttributes,
  TRADEMARK_ACTION_TAG_PREFIX,
  type TrademarkActionHistoryEntry,
} from '@/features/matters/trademark-actions'
import type { MatterDetail } from '@/features/matters/types'
import { TrademarkActionFilesDrawer } from './TrademarkActionFilesDrawer'
import { TrademarkActionViewDrawer } from './TrademarkActionViewDrawer'

type SecondaryActionsTableProps = {
  matter: MatterDetail
  canUpload: boolean
}

export function SecondaryActionsTable({ matter, canUpload }: SecondaryActionsTableProps) {
  const { t } = useTranslation('matters')
  const { data: documents } = useMatterDocuments(matter.id)
  const [viewing, setViewing] = useState<TrademarkActionHistoryEntry | null>(null)
  const [filesFor, setFilesFor] = useState<TrademarkActionHistoryEntry | null>(null)

  const rows = secondaryHistoryFromAttributes(matter.attributes?.attributes ?? {})

  const fileCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const doc of documents ?? []) {
      for (const rawTag of doc.tags) {
        const tag = rawTag.toLowerCase()
        if (!tag.startsWith(TRADEMARK_ACTION_TAG_PREFIX)) continue
        const id = tag.slice(TRADEMARK_ACTION_TAG_PREFIX.length)
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
    }
    return counts
  }, [documents])

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-medium">{t('trademarkActions.table.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('trademarkActions.table.description')}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('trademarkActions.table.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('trademarkActions.table.procedure')}</TableHead>
              <TableHead className="w-40 text-right">
                {t('trademarkActions.table.action')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((entry) => {
              const count = fileCounts.get(entry.id.toLowerCase()) ?? 0
              return (
                <TableRow key={entry.id}>
                  <TableCell>{t(`trademarkActions.kinds.${entry.kind}`)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setViewing(entry)}
                        aria-label={t('trademarkActions.table.viewAria')}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="relative gap-1.5 px-2"
                        onClick={() => setFilesFor(entry)}
                        aria-label={t('trademarkActions.table.filesAria', { count })}
                      >
                        <Folder className="size-4" />
                        {count > 0 ? (
                          <span className="inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                            {count}
                          </span>
                        ) : null}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <TrademarkActionViewDrawer
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        entry={viewing}
      />
      <TrademarkActionFilesDrawer
        open={Boolean(filesFor)}
        onClose={() => setFilesFor(null)}
        matterId={matter.id}
        entry={filesFor}
        canUpload={canUpload}
      />
    </div>
  )
}
