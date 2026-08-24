import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { goodsRowsFromAttributes } from '@/features/matters/trademark-actions'
import type { MatterDetail } from '@/features/matters/types'

type TrademarkScopeCardProps = {
  matter: MatterDetail
  onEdit: () => void
  canEdit: boolean
}

export function TrademarkScopeCard({ matter, onEdit, canEdit }: TrademarkScopeCardProps) {
  const { t } = useTranslation('matters')
  const rows = goodsRowsFromAttributes(matter.attributes?.attributes ?? {})
  const hasClasses = rows.length > 0

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{t('trademarkActions.scope.cardTitle')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('trademarkActions.scope.cardHint')}
          </p>
        </div>
        {canEdit ? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
            <Pencil className="size-3.5" />
            {t('trademarkActions.menu.editScope')}
          </Button>
        ) : null}
      </div>
      {!hasClasses ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t('trademarkActions.scope.empty')}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row, index) => (
            <li
              key={`${row.classNumber}-${index}`}
              className="rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="font-medium">
                {t('trademarkActions.scope.classLabel', { n: row.classNumber })}
              </span>
              <p className="mt-0.5 text-muted-foreground">
                {row.description.trim() || t('trademarkActions.scope.noDescription')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
