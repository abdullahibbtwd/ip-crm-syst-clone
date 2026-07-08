import { useTranslation } from 'react-i18next'
import {
  CalendarClock,
  CheckSquare,
  FolderOpen,
  UsersRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTeamWorkloadReport } from '@/features/reports/hooks/useReports'
import {
  ReportPanel,
  WidgetAvatarInitials,
  WidgetBody,
  WidgetEmptyState,
  WidgetErrorState,
  WidgetFeaturedBanner,
  WidgetLoadingSkeleton,
  WidgetMetricBadge,
  WidgetMiniStat,
  WidgetPanelHeader,
  WidgetProgressBar,
  WidgetStatRail,
  WidgetTableSection,
  WIDGET_TABLE_HEAD,
  WIDGET_TABLE_ROW,
  WidgetTableShell,
} from '@/components/reports/report-ui'
import { formatUserRole, roleBadgeVariant } from '@/features/users/utils'

const PREVIEW_LIMIT = 8

export function TeamWorkloadWidget() {
  const { t } = useTranslation('reports')
  const { data, isLoading, isError } = useTeamWorkloadReport()
  const preview = data?.members.slice(0, PREVIEW_LIMIT) ?? []
  const busiest = data?.members[0]
  const maxTotal = busiest?.counts.total ?? 1

  return (
    <ReportPanel className="overflow-hidden p-0">
      <WidgetPanelHeader
        icon={UsersRound}
        title={t('widgets.teamWorkload.title')}
        subtitle={t('widgets.teamWorkload.subtitle')}
        to="/users/team"
        linkLabel={t('widgets.teamWorkload.viewTeam')}
        accent="green"
      />

      <WidgetBody>
        {isLoading ? (
          <WidgetLoadingSkeleton rows={4} />
        ) : isError ? (
          <WidgetErrorState message={t('widgets.teamWorkload.error')} />
        ) : !data ? null : (
          <div className="space-y-6">
            <WidgetStatRail wash="green">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <WidgetMiniStat
                  icon={FolderOpen}
                  label={t('widgets.teamWorkload.matters')}
                  value={data.summary.totalMatters}
                  hint={t('widgets.teamWorkload.members', { count: data.summary.teamMembers })}
                  tone="green"
                />
                <WidgetMiniStat
                  icon={CheckSquare}
                  label={t('widgets.teamWorkload.tasks')}
                  value={data.summary.totalTasks}
                  hint={t('widgets.teamWorkload.pendingAction')}
                  tone="brand"
                />
                <WidgetMiniStat
                  icon={CalendarClock}
                  label={t('widgets.teamWorkload.deadlines')}
                  value={data.summary.totalDeadlines}
                  hint={t('widgets.teamWorkload.activeWindow')}
                  tone="brand"
                />
                <WidgetMiniStat
                  icon={UsersRound}
                  label={t('widgets.teamWorkload.busiest')}
                  value={busiest?.user.fullName.split(' ')[0] ?? '-'}
                  hint={
                    busiest
                      ? t('widgets.teamWorkload.items', { count: busiest.counts.total })
                      : t('widgets.teamWorkload.clear')
                  }
                  tone="green"
                />
              </div>
            </WidgetStatRail>

            {busiest ? (
              <WidgetFeaturedBanner
                icon={UsersRound}
                subtitle={t('widgets.teamWorkload.busiest')}
                title={busiest.user.fullName}
                meta={
                  <WidgetMetricBadge tone="brand">
                    {busiest.counts.total} {t('widgets.teamWorkload.table.total').toLowerCase()}
                  </WidgetMetricBadge>
                }
                tone="green"
              />
            ) : null}

            {preview.length === 0 ? (
              <WidgetEmptyState icon={UsersRound} title={t('widgets.teamWorkload.empty')} />
            ) : (
              <WidgetTableSection
                title={t('widgets.teamWorkload.table.teamMember')}
                count={preview.length}
              >
                <WidgetTableShell>
                  <Table>
                    <TableHeader className={WIDGET_TABLE_HEAD}>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-green/70">
                          {t('widgets.teamWorkload.table.teamMember')}
                        </TableHead>
                        <TableHead className="hidden px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-brand-green/70 sm:table-cell">
                          {t('widgets.teamWorkload.table.matters')}
                        </TableHead>
                        <TableHead className="hidden px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-brand-green/70 md:table-cell">
                          {t('widgets.teamWorkload.table.tasks')}
                        </TableHead>
                        <TableHead className="hidden px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-brand-green/70 lg:table-cell">
                          {t('widgets.teamWorkload.table.deadlines')}
                        </TableHead>
                        <TableHead className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-brand-green/70">
                          {t('widgets.teamWorkload.table.total')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row) => {
                        const primaryRole = row.user.roles[0]
                        return (
                          <TableRow key={row.user.id} className={WIDGET_TABLE_ROW}>
                            <TableCell className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <WidgetAvatarInitials name={row.user.fullName} />
                                <div className="min-w-0 flex-1 space-y-1.5">
                                  <p className="truncate text-[13px] font-bold text-brand-green transition-colors group-hover:text-primary">
                                    {row.user.fullName}
                                  </p>
                                  {primaryRole ? (
                                    <Badge
                                      variant={roleBadgeVariant(primaryRole)}
                                      className="h-4 w-fit px-1.5 text-[9px] font-black uppercase tracking-tighter"
                                    >
                                      {formatUserRole(primaryRole)}
                                    </Badge>
                                  ) : null}
                                  <WidgetProgressBar
                                    value={row.counts.total}
                                    max={maxTotal}
                                    tone="green"
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden px-4 py-4 text-right text-[13px] font-medium tabular-nums text-muted-foreground sm:table-cell">
                              {row.counts.matters}
                            </TableCell>
                            <TableCell className="hidden px-4 py-4 text-right text-[13px] font-medium tabular-nums text-muted-foreground md:table-cell">
                              {row.counts.tasks}
                            </TableCell>
                            <TableCell className="hidden px-4 py-4 text-right text-[13px] font-medium tabular-nums text-muted-foreground lg:table-cell">
                              {row.counts.deadlines}
                            </TableCell>
                            <TableCell className="px-4 py-4 text-right">
                              <WidgetMetricBadge tone="green">
                                {row.counts.total}
                              </WidgetMetricBadge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
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
