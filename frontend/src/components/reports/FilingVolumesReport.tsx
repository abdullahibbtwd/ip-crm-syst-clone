import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileOutput, FolderOpen, Globe2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { useFilingVolumesReport } from '@/features/reports/hooks/useReports'
import { defaultFilingPeriod } from '@/features/reports/renewal-urgency'
import { formatReportMonth } from '@/features/reports/receivables-aging'
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
import type { MatterType } from '@/features/matters/types'
import { ReportPanel, ReportStatCard } from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

const ALL = 'all'
const MATTER_TYPES = Object.keys(MATTER_TYPE_LABELS) as MatterType[]

export function FilingVolumesReport() {
  const { t } = useTranslation(['reports', 'common'])
  const defaults = defaultFilingPeriod()
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [matterType, setMatterType] = useState<string | undefined>()
  const [jurisdiction, setJurisdiction] = useState<string | undefined>()

  const filters = useMemo(
    () => ({
      from,
      to,
      ...(matterType ? { matterType } : {}),
      ...(jurisdiction ? { jurisdiction } : {}),
    }),
    [from, to, matterType, jurisdiction],
  )

  const { data, isLoading, isError, refetch, isFetching } = useFilingVolumesReport(filters)

  return (
    <div className="space-y-6">
      <ReportPanel className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[140px] flex-1 space-y-2">
            <Label htmlFor="filing-from" className="text-brand-green/80">
              {t('filingVolumes.filters.periodFrom')}
            </Label>
            <Input
              id="filing-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border-brand-green/15 bg-background"
            />
          </div>
          <div className="min-w-[140px] flex-1 space-y-2">
            <Label htmlFor="filing-to" className="text-brand-green/80">
              {t('filingVolumes.filters.periodTo')}
            </Label>
            <Input
              id="filing-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border-brand-green/15 bg-background"
            />
          </div>
          <div className="min-w-[160px] flex-1 space-y-2">
            <Label className="text-brand-green/80">{t('filingVolumes.filters.matterType')}</Label>
            <Select
              value={matterType ?? ALL}
              onValueChange={(v) => setMatterType(v === ALL ? undefined : v ?? undefined)}
            >
              <SelectTrigger className="border-brand-green/15 bg-background">
                <SelectValue placeholder={t('filingVolumes.filters.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('filingVolumes.filters.allTypes')}</SelectItem>
                {MATTER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {MATTER_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px] flex-1 space-y-2">
            <Label className="text-brand-green/80">{t('filingVolumes.filters.jurisdiction')}</Label>
            <Select
              value={jurisdiction ?? ALL}
              onValueChange={(v) => setJurisdiction(v === ALL ? undefined : v ?? undefined)}
            >
              <SelectTrigger className="border-brand-green/15 bg-background">
                <SelectValue placeholder={t('filingVolumes.filters.allJurisdictions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('filingVolumes.filters.allJurisdictions')}</SelectItem>
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
        <p className="text-sm text-muted-foreground">{t('filingVolumes.loading')}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{t('filingVolumes.error')}</p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <ReportStatCard
              icon={FileOutput}
              label={t('filingVolumes.stats.totalFilings')}
              value={data.summary.totalFilings}
              hint={t('filingVolumes.stats.totalFilingsHint')}
              tone="green"
            />
            <ReportStatCard
              icon={FolderOpen}
              label={t('filingVolumes.stats.matterTypes')}
              value={Object.keys(data.summary.byMatterType).length}
              hint={t('filingVolumes.stats.matterTypesHint')}
              tone="brand"
            />
            <ReportStatCard
              icon={Globe2}
              label={t('filingVolumes.stats.jurisdictions')}
              value={Object.keys(data.summary.byJurisdiction).length}
              hint={t('filingVolumes.stats.jurisdictionsHint')}
              tone="neutral"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {t('filingVolumes.generated', { date: formatDeadlineDate(data.generatedAt) })}
              {isFetching ? ` · ${t('common:loading.refreshing')}` : ''}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
                {t('common:actions.refresh')}
              </Button>
              <Link to="/matters" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                {t('filingVolumes.matterPortfolio')}
              </Link>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-brand-green/10 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <h3 className="font-serif text-lg text-brand-green">{t('filingVolumes.byMonth')}</h3>
                {data.byMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('filingVolumes.noFilings')}</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/80">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead>{t('filingVolumes.table.month')}</TableHead>
                          <TableHead className="text-right">{t('filingVolumes.table.filings')}</TableHead>
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
                <h3 className="font-serif text-lg text-brand-green">{t('filingVolumes.byJurisdiction')}</h3>
                <div className="space-y-2">
                  {Object.entries(data.summary.byJurisdiction)
                    .sort((a, b) => b[1] - a[1])
                    .map(([j, count]) => (
                      <div
                        key={j}
                        className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2"
                      >
                        <span className="text-sm text-brand-green">
                          {jurisdictionLabel(j)}
                        </span>
                        <span className="font-semibold tabular-nums">{count}</span>
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
                    <TableHead>{t('filingVolumes.table.matter')}</TableHead>
                    <TableHead>{t('filingVolumes.table.type')}</TableHead>
                    <TableHead>{t('filingVolumes.table.jurisdiction')}</TableHead>
                    <TableHead>{t('filingVolumes.table.filingDate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.preview.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          to={`/matters/${row.matterId}/timeline`}
                          className="font-medium text-brand-green hover:text-primary hover:underline"
                        >
                          {row.matterTitle}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {MATTER_TYPE_LABELS[row.matterType as MatterType] ?? row.matterType}
                      </TableCell>
                      <TableCell className="text-sm">
                        {jurisdictionLabel(row.jurisdiction)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formatDeadlineDate(row.occurredAt)}
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
