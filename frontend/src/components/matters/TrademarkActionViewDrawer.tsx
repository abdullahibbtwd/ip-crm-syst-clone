import { useTranslation } from 'react-i18next'
import { Drawer } from '@/components/crm/Drawer'
import { formatMatterDate } from '@/features/matters/utils'
import type { TrademarkActionHistoryEntry } from '@/features/matters/trademark-actions'

type TrademarkActionViewDrawerProps = {
  open: boolean
  onClose: () => void
  entry: TrademarkActionHistoryEntry | null
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

export function TrademarkActionViewDrawer({
  open,
  onClose,
  entry,
}: TrademarkActionViewDrawerProps) {
  const { t } = useTranslation(['matters', 'common'])
  if (!entry) return null

  const fee =
    entry.governmentFeeAmount && entry.governmentFeeAmount > 0
      ? `${entry.governmentFeeAmount} ${entry.governmentFeeCurrency || 'EUR'}`
      : null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t(`trademarkActions.kinds.${entry.kind}`)}
      className="max-w-lg"
    >
      <div className="space-y-4">
        <Detail
          label={t('trademarkActions.table.loggedAt')}
          value={entry.occurredAt ? formatMatterDate(entry.occurredAt) : null}
        />
        <Detail
          label={t('trademarkActions.secondary.generateProforma')}
          value={
            entry.generateProforma
              ? t('common:yesNo.yes')
              : t('common:yesNo.no')
          }
        />
        <Detail label={t('trademarkActions.secondary.governmentFee')} value={fee} />
        <Detail
          label={t('trademarkActions.secondary.paymentDueDate')}
          value={entry.paymentDueDate ? formatMatterDate(entry.paymentDueDate) : null}
        />
        <Detail
          label={t('trademarkActions.secondary.filingDeadline')}
          value={entry.filingDeadline ? formatMatterDate(entry.filingDeadline) : null}
        />
      </div>
    </Drawer>
  )
}
