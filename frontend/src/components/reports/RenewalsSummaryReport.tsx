import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, Flame, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatDeadlineDate,
  JURISDICTION_OPTIONS,
  jurisdictionLabel,
} from '@/features/deadlines/utils'
import { useRenewalsSummaryReport } from '@/features/reports/hooks/useReports'
import {
  defaultRenewalsDueBefore,
  RENEWAL_URGENCY_DOT_CLASS,
  RENEWAL_URGENCY_ROW_CLASS,
} from '@/features/reports/renewal-urgency'
import { formatReportMonth } from '@/features/reports/receivables-aging'
import { RENEWAL_STATUS_LABELS } from '@/features/renewals/utils'
import type { RenewalStatus } from '@/features/renewals/types'
import {
  RenewalUrgencyLegend,
  RenewalUrgencyPills,
  ReportPanel,
  ReportStatCard,
} from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

const ALL = 'all'

export function RenewalsSummaryReport() {
  const { t } = useTranslation(['reports', 'common'])
  const [dueBefore, setDueBefore] = useState(defaultRenewalsDueBefore())
  const [jurisdiction, setJurisdiction] = useState<string | undefined>()

  const filters = useMemo(
    () => ({
      dueBefore,
      ...(jurisdiction ? { jurisdiction } : {}),
    }),
    [dueBefore, jurisdiction],
  )

  const { data, isLoading, isError, refetch, isFetching } = useRenewalsSummaryReport(filters)

  return (
    <div className="space-y-6">
      <ReportPanel className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px] flex-1 space-y-2">
            <Label htmlFor="renewals-due-before" className="text-brand-green/80">
              {t('renewalsSummary.dueBefore')}
            </Label>
            <Input
              id="renewals-due-before"
              type="date"
              value={dueBefore}
              onChange={(e) => setDueBefore(e.target.value)}
              className="border-brand-green/15 bg-background"
            />
          </div>
          <div className="min-w-[180px] flex-1 space-y-2">
            <Label className="text-brand-green/80">{t('renewalsSummary.filters.jurisdiction')}</Label>
            <Select
              value={jurisdiction ?? ALL}
              onValueChange={(v) => setJurisdiction(v === ALL ? undefined : v ?? undefined)}
            >
              <SelectTrigger className="border-brand-green/15 bg-background">
                <SelectValue placeholder={t('renewalsSummary.filters.allJurisdictions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('renewalsSummary.filters.allJurisdictions')}</SelectItem>
                {JURISDICTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ReportPanel>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('renewalsSummary.loading')}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{t('renewalsSummary.error')}</p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStatCard
              icon={RefreshCw}
              label={t('renewalsSummary.stats.pipeline')}
              value={data.summary.pipelineTotal}
              hint={t('renewalsSummary.stats.pipelineHint')}
              tone="green"
            />
            <ReportStatCard
              icon={Clock}
              label={t('renewalsSummary.stats.upcoming')}
              value={data.summary.upcoming}
              hint={t('renewalsSummary.stats.upcomingHint')}
              tone="brand"
            />
            <ReportStatCard
              icon={Flame}
              label={t('renewalsSummary.stats.critical')}
              value={data.summary.critical}
              hint={t('renewalsSummary.stats.criticalHint')}
              tone="alert"
            />
            <ReportStatCard
              icon={AlertTriangle}
              label={t('renewalsSummary.stats.instructed')}
              value={data.summary.instructed}
              hint={t('renewalsSummary.stats.instructedHint')}
              tone="primary"
            />
          </div>

          <RenewalUrgencyLegend />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {t('renewalsSummary.generated', { date: formatDeadlineDate(data.generatedAt) })}
              {isFetching ? ` · ${t('common:loading.refreshing')}` : ''}
              <span className="mx-2 text-border">|</span>
              {t('renewalsSummary.dueBeforeLabel', { date: formatDeadlineDate(data.dueBefore) })}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
                {t('common:actions.refresh')}
              </Button>
              <Link to="/renewals" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                {t('renewalsSummary.renewalsWorklist')}
              </Link>
            </div>
          </div>

          <RenewalUrgencyPills urgency={data.urgency} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-brand-green/10 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <h3 className="font-serif text-lg text-brand-green">{t('renewalsSummary.byDueMonth')}</h3>
                {data.byMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('renewalsSummary.noRenewals')}</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/80">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead>{t('renewalsSummary.table.month')}</TableHead>
                          <TableHead className="text-right">{t('renewalsSummary.table.windows')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.byMonth.map((row) => (
                          <TableRow key={row.month}>
                            <TableCell className="font-medium text-brand-green">
                              {formatReportMonth(row.month)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.count}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-brand-green/10 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <h3 className="font-serif text-lg text-brand-green">{t('renewalsSummary.byJurisdiction')}</h3>
                <div className="space-y-2">
                  {data.byJurisdiction.map((row) => (
                    <div
                      key={row.jurisdiction}
                      className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2"
                    >
                      <span className="text-sm text-brand-green">
                        {jurisdictionLabel(row.jurisdiction)}
                      </span>
                      <span className="font-semibold tabular-nums">{row.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {data.preview.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>{t('renewalsSummary.table.ipRight')}</TableHead>
                    <TableHead>{t('renewalsSummary.table.client')}</TableHead>
                    <TableHead>{t('renewalsSummary.table.due')}</TableHead>
                    <TableHead>{t('renewalsSummary.table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.preview.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(RENEWAL_URGENCY_ROW_CLASS[row.urgency])}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'size-2 shrink-0 rounded-full',
                              RENEWAL_URGENCY_DOT_CLASS[row.urgency],
                            )}
                          />
                          <div>
                            <p className="font-medium text-brand-green">{row.ipRightTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {jurisdictionLabel(row.jurisdiction)} ·{' '}
                              {t('renewalsSummary.cycle', { number: row.cycleNumber })}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{row.clientName}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formatDeadlineDate(row.dueDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {RENEWAL_STATUS_LABELS[row.status as RenewalStatus]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
