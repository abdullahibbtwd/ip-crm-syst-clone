import { Link, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MatterStatusBadge } from '@/components/matters/MatterStatusBadge'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { SummaryBar } from '@/features/billing/components/SummaryBar'
import { useClientBillingSummary } from '@/features/billing/hooks/useBilling'
import { formatHours, formatMoney } from '@/features/billing/utils'
import { matterTypeLabel } from '@/features/matters/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClientRetainerCard } from '@/features/retainers/components/ClientRetainerCard'
import { ClientBillingProfileCard } from '@/features/crm/components/ClientBillingProfileCard'
import type { ClientTabContext } from '../ClientLayout'

export function ClientBillingTab() {
  const { t } = useTranslation('crm')
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data, isLoading, isError } = useClientBillingSummary(clientId)

  return (
    <PermissionGate
      resource="billing"
      action="read"
      fallback={<p className="text-sm text-muted-foreground">{t('billing.noPermission')}</p>}
    >
      <div className="space-y-6">
        <ClientBillingProfileCard clientId={clientId} />

        {isLoading && <p className="text-sm text-muted-foreground">{t('billing.loading')}</p>}
        {isError && <p className="text-sm text-destructive">{t('billing.error')}</p>}

        <ClientRetainerCard clientId={clientId} />

        {data && (
        <div className="space-y-6">
          <div>
            <h2 className="font-medium">{t('billing.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('billing.wipDescriptionLong')}</p>
          </div>

          <SummaryBar
            totalHours={data.totals.totalHours}
            totalBillableHours={data.totals.totalBillableHours}
            totalBillableAmount={data.totals.totalBillableAmount}
            totalFixedFees={data.totals.totalFixedFees}
            totalAmount={data.totals.totalAmount}
            unbilledAmount={data.totals.unbilledAmount}
          />

          <section className="space-y-3">
            <h3 className="text-sm font-medium">{t('billing.byMatter')}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('billing.matterTable.matter')}</TableHead>
                  <TableHead>{t('billing.matterTable.type')}</TableHead>
                  <TableHead>{t('billing.matterTable.status')}</TableHead>
                  <TableHead className="text-right">{t('billing.matterTable.billableHours')}</TableHead>
                  <TableHead className="text-right">{t('billing.matterTable.total')}</TableHead>
                  <TableHead className="text-right">{t('billing.matterTable.unbilled')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.matters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t('billing.matterTable.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.matters.map((matter) => (
                    <TableRow key={matter.matterId}>
                      <TableCell>
                        <Link
                          to={`/matters/${matter.matterId}/billing`}
                          className="font-medium text-primary hover:underline"
                        >
                          {matter.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {matterTypeLabel(matter.matterType as never)}
                      </TableCell>
                      <TableCell>
                        <MatterStatusBadge status={matter.status as never} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatHours(matter.totalBillableHours)}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(matter.totalAmount)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(matter.unbilledAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>
        </div>
      )}
      </div>
    </PermissionGate>
  )
}
