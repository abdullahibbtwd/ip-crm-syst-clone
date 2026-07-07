import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FileOutput, FolderOpen, Globe2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDeadlineDate, jurisdictionLabel } from '@/features/deadlines/utils'
import { useFilingVolumesReport } from '@/features/reports/hooks/useReports'
import { defaultFilingPeriod } from '@/features/reports/renewal-urgency'
import { formatReportMonth } from '@/features/reports/receivables-aging'
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
import type { MatterType } from '@/features/matters/types'
import { cn } from '@/lib/utils'
import { ReportPanel } from '@/components/reports/report-ui'

const PREVIEW_LIMIT = 5

export function FilingVolumesWidget() {
  const { t } = useTranslation('reports')
  const period = defaultFilingPeriod()
  const { data, isLoading, isError } = useFilingVolumesReport(period)

  const topMatterType = data
    ? Object.entries(data.summary.byMatterType).sort((a, b) => b[1] - a[1])[0]
    : null
  const topJurisdiction = data
    ? Object.entries(data.summary.byJurisdiction).sort((a, b) => b[1] - a[1])[0]
    : null
  const preview = data?.preview.slice(0, PREVIEW_LIMIT) ?? []
  const thisMonth = data?.byMonth.at(-1)

  const Stat = ({ icon: Icon, label, value, hint, tone = 'brand' }: {
    icon: typeof FileOutput
    label: string
    value: ReactNode
    hint?: string
    tone?: 'brand' | 'green'
  }) => {
    const isBrand = tone === 'brand'
    return (
      <div className={cn(
        "group flex items-center gap-2.5 rounded-2xl border p-3.5 transition-all duration-300",
        isBrand ? "border-primary/18 bg-primary/[0.05]" : "border-brand-green/12 bg-brand-green/[0.04]"
      )}>
        <div className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
          isBrand ? "bg-primary/12 text-primary" : "bg-brand-green/10 text-brand-green"
        )}>
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            "text-[8px] font-black uppercase tracking-[0.1em]",
            isBrand ? "text-primary/75" : "text-brand-green/65"
          )}>
            {label}
          </p>
          <p className="mt-0.5 font-serif text-lg font-bold leading-none text-brand-green tabular-nums">
            {isLoading ? <span className="animate-pulse">···</span> : value}
          </p>
          {hint && (
            <p className="mt-1 text-[9px] font-extrabold text-muted-foreground/50 uppercase tracking-tight truncate">
              {hint}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <ReportPanel className="p-0 overflow-hidden">
      <div className="flex flex-row items-center justify-between gap-3 p-5 md:px-6">
        <div>
          <h3 className="flex items-center gap-2.5 font-serif text-lg text-brand-green leading-none">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-green/8 text-brand-green">
              <FileOutput className="size-5" />
            </span>
            {t('widgets.filingVolumes.title')}
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground font-medium">
            {t('widgets.filingVolumes.subtitle')}
          </p>
        </div>
        <Link
          to="/reports/filing-volumes"
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-[11px] font-bold h-8' })}
        >
          {t('widgets.filingVolumes.fullReport')}
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="px-5 pb-6 md:px-6 md:pb-8">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground italic">
            {t('widgets.filingVolumes.loading')}
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-sm text-destructive font-medium">
            {t('widgets.filingVolumes.error')}
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                icon={FileOutput}
                label={t('widgets.filingVolumes.totalFilings')}
                value={data.summary.totalFilings}
                hint={t('widgets.filingVolumes.yearToDate')}
                tone="green"
              />
              <Stat
                icon={FolderOpen}
                label={t('widgets.filingVolumes.primaryType')}
                value={topMatterType ? MATTER_TYPE_LABELS[topMatterType[0] as MatterType] ?? topMatterType[0] : '-'}
                hint={topMatterType ? t('widgets.filingVolumes.applications', { count: topMatterType[1] }) : t('widgets.filingVolumes.noData')}
                tone="brand"
              />
              <Stat
                icon={Globe2}
                label={t('widgets.filingVolumes.topRegion')}
                value={topJurisdiction ? jurisdictionLabel(topJurisdiction[0]) : '-'}
                hint={topJurisdiction ? t('widgets.filingVolumes.applications', { count: topJurisdiction[1] }) : t('widgets.filingVolumes.noData')}
                tone="green"
              />
            </div>

            {thisMonth ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-brand-green/10 bg-brand-green/[0.02] px-4 py-2.5">
                <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" />
                <p className="text-[11px] font-bold text-brand-green uppercase tracking-tight">
                  {t('widgets.filingVolumes.monthActivity', { month: formatReportMonth(thisMonth.month) })}{' '}
                  <span className="text-primary">{t('widgets.filingVolumes.newFiling', { count: thisMonth.count })}</span>
                </p>
              </div>
            ) : null}

            {preview.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-green/15 bg-brand-green/[0.02] py-10 text-center">
                <p className="text-sm font-bold text-brand-green opacity-60 italic">
                  {t('widgets.filingVolumes.empty')}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-brand-green/70">
                        {t('widgets.filingVolumes.table.matterInfo')}
                      </TableHead>
                      <TableHead className="hidden py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-brand-green/70 sm:table-cell">
                        {t('widgets.filingVolumes.table.type')}
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-right text-brand-green/70">
                        {t('widgets.filingVolumes.table.filingDate')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row) => (
                      <TableRow key={row.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <Link
                              to={`/matters/${row.matterId}/timeline`}
                              className="text-[13px] font-bold text-brand-green group-hover:text-primary transition-colors"
                            >
                              {row.matterTitle}
                            </Link>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                              {jurisdictionLabel(row.jurisdiction)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-3.5 px-4 text-[12px] font-semibold text-muted-foreground sm:table-cell">
                          {MATTER_TYPE_LABELS[row.matterType as MatterType] ?? row.matterType}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right tabular-nums text-[13px] font-bold text-brand-green">
                          {formatDeadlineDate(row.occurredAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    </ReportPanel>
  )
}
