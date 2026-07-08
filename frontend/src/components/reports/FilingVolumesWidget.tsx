import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileOutput, FolderOpen, Globe2 } from 'lucide-react'
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
import {
  ReportPanel,
  WidgetBody,
  WidgetDateBadge,
  WidgetEmptyState,
  WidgetErrorState,
  WidgetHeroStat,
  WidgetHighlightBar,
  WidgetLoadingSkeleton,
  WidgetMiniStat,
  WidgetPanelHeader,
  WidgetTableSection,
  WIDGET_TABLE_HEAD,
  WIDGET_TABLE_ROW,
  WidgetTableShell,
  WidgetTypeBadge,
} from '@/components/reports/report-ui'

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

  return (
    <ReportPanel className="overflow-hidden p-0">
      <WidgetPanelHeader
        icon={FileOutput}
        title={t('widgets.filingVolumes.title')}
        subtitle={t('widgets.filingVolumes.subtitle')}
        to="/reports/filing-volumes"
        linkLabel={t('widgets.filingVolumes.fullReport')}
        accent="green"
      />

      <WidgetBody>
        {isLoading ? (
          <WidgetLoadingSkeleton rows={4} />
        ) : isError ? (
          <WidgetErrorState message={t('widgets.filingVolumes.error')} />
        ) : !data ? null : (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <WidgetHeroStat
                  icon={FileOutput}
                  label={t('widgets.filingVolumes.totalFilings')}
                  value={data.summary.totalFilings}
                  hint={t('widgets.filingVolumes.yearToDate')}
                  tone="green"
                />
              </div>
              <div className="flex flex-col gap-3 lg:col-span-7">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <WidgetMiniStat
                    icon={FolderOpen}
                    label={t('widgets.filingVolumes.primaryType')}
                    value={
                      topMatterType
                        ? MATTER_TYPE_LABELS[topMatterType[0] as MatterType] ?? topMatterType[0]
                        : '-'
                    }
                    hint={
                      topMatterType
                        ? t('widgets.filingVolumes.applications', { count: topMatterType[1] })
                        : t('widgets.filingVolumes.noData')
                    }
                    tone="brand"
                  />
                  <WidgetMiniStat
                    icon={Globe2}
                    label={t('widgets.filingVolumes.topRegion')}
                    value={topJurisdiction ? jurisdictionLabel(topJurisdiction[0]) : '-'}
                    hint={
                      topJurisdiction
                        ? t('widgets.filingVolumes.applications', { count: topJurisdiction[1] })
                        : t('widgets.filingVolumes.noData')
                    }
                    tone="green"
                  />
                </div>
                {thisMonth ? (
                  <WidgetHighlightBar>
                    {t('widgets.filingVolumes.monthActivity', {
                      month: formatReportMonth(thisMonth.month),
                    })}{' '}
                    <span className="text-primary">
                      {t('widgets.filingVolumes.newFiling', { count: thisMonth.count })}
                    </span>
                  </WidgetHighlightBar>
                ) : null}
              </div>
            </div>

            {preview.length === 0 ? (
              <WidgetEmptyState icon={FolderOpen} title={t('widgets.filingVolumes.empty')} />
            ) : (
              <WidgetTableSection
                title={t('widgets.filingVolumes.table.matterInfo')}
                count={preview.length}
              >
                <WidgetTableShell>
                  <Table>
                    <TableHeader className={WIDGET_TABLE_HEAD}>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-green/70">
                          {t('widgets.filingVolumes.table.matterInfo')}
                        </TableHead>
                        <TableHead className="hidden px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-green/70 sm:table-cell">
                          {t('widgets.filingVolumes.table.type')}
                        </TableHead>
                        <TableHead className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-brand-green/70">
                          {t('widgets.filingVolumes.table.filingDate')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row) => (
                        <TableRow key={row.id} className={WIDGET_TABLE_ROW}>
                          <TableCell className="px-4 py-4">
                            <div className="flex flex-col gap-1.5">
                              <Link
                                to={`/matters/${row.matterId}/timeline`}
                                className="text-[13px] font-bold text-brand-green transition-colors group-hover:text-primary"
                              >
                                {row.matterTitle}
                              </Link>
                              <WidgetTypeBadge>
                                {jurisdictionLabel(row.jurisdiction)}
                              </WidgetTypeBadge>
                            </div>
                          </TableCell>
                          <TableCell className="hidden px-4 py-4 sm:table-cell">
                            <WidgetTypeBadge>
                              {MATTER_TYPE_LABELS[row.matterType as MatterType] ?? row.matterType}
                            </WidgetTypeBadge>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right">
                            <WidgetDateBadge>
                              {formatDeadlineDate(row.occurredAt)}
                            </WidgetDateBadge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </WidgetTableShell>
              </WidgetTableSection>
            )}
          </div>
        )}
      </WidgetBody>
    </ReportPanel>
  )
}
