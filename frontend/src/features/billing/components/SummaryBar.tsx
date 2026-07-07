import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { formatHours, formatMoney } from '../utils'

type SummaryBarProps = {
  totalHours: number
  totalBillableHours: number
  totalBillableAmount: number
  totalFixedFees: number
  totalAmount: number
  unbilledAmount?: number
}

export function SummaryBar({
  totalHours,
  totalBillableHours,
  totalBillableAmount,
  totalFixedFees,
  totalAmount,
  unbilledAmount,
}: SummaryBarProps) {
  const { t } = useTranslation('finance')

  const items = [
    { label: t('summary.totalHours'), value: formatHours(totalHours) },
    { label: t('summary.billable'), value: formatHours(totalBillableHours) },
    { label: t('summary.billableAmount'), value: formatMoney(totalBillableAmount) },
    { label: t('summary.fixedFees'), value: formatMoney(totalFixedFees) },
    ...(unbilledAmount != null
      ? [{ label: t('summary.unbilled'), value: formatMoney(unbilledAmount), highlight: true }]
      : []),
    { label: t('summary.total'), value: formatMoney(totalAmount), highlight: unbilledAmount == null },
  ]

  return (
    <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
      {items.map((item) => (
        <div key={item.label} className="min-w-[120px]">
          <p className="text-muted-foreground">{item.label}</p>
          <p className={cn('font-medium', item.highlight && 'text-base')}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}
