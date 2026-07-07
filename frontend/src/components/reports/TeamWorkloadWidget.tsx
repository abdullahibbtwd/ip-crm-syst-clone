import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CalendarClock,
  CheckSquare,
  FolderOpen,
  UsersRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useTeamWorkloadReport } from '@/features/reports/hooks/useReports'
import { ReportPanel } from '@/components/reports/report-ui'
import { formatUserRole, roleBadgeVariant } from '@/features/users/utils'

const PREVIEW_LIMIT = 8

export function TeamWorkloadWidget() {
  const { t } = useTranslation('reports')
  const { data, isLoading, isError } = useTeamWorkloadReport()
  const preview = data?.members.slice(0, PREVIEW_LIMIT) ?? []
  const busiest = data?.members[0]

  const Stat = ({ icon: Icon, label, value, hint, tone = 'brand' }: {
    icon: typeof FolderOpen
    label: string
    value: ReactNode
    hint?: string
    tone?: 'brand' | 'green'
  }) => {
    const isBrand = tone === 'brand'
    const isGreen = tone === 'green'

    return (
      <div className={cn(
        "group flex items-center gap-2 rounded-2xl border p-3 transition-all duration-300",
        isBrand && "border-primary/18 bg-primary/[0.05]",
        isGreen && "border-brand-green/12 bg-brand-green/[0.04]"
      )}>
        <div className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
          isBrand && "bg-primary/12 text-primary",
          isGreen && "bg-brand-green/10 text-brand-green"
        )}>
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            "text-[8px] font-black uppercase tracking-[0.1em]",
            isBrand && "text-primary/75",
            isGreen && "text-brand-green/65"
          )}>
            {label}
          </p>
          <p className="mt-0.5 font-serif text-lg font-bold leading-none text-brand-green tabular-nums">
            {isLoading ? <span className="animate-pulse">···</span> : value}
          </p>
          {hint && (
            <p className="mt-1 text-[9px] font-extrabold text-muted-foreground/45 uppercase tracking-tighter truncate">
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
              <UsersRound className="size-5" />
            </span>
            {t('widgets.teamWorkload.title')}
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground font-medium">
            {t('widgets.teamWorkload.subtitle')}
          </p>
        </div>
        <Link
          to="/users/team"
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-[11px] font-bold h-8' })}
        >
          {t('widgets.teamWorkload.viewTeam')}
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="px-5 pb-6 md:px-6 md:pb-8">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground italic">
            {t('widgets.teamWorkload.loading')}
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-sm text-destructive font-medium">
            {t('widgets.teamWorkload.error')}
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={FolderOpen}
                label={t('widgets.teamWorkload.matters')}
                value={data.summary.totalMatters}
                hint={t('widgets.teamWorkload.members', { count: data.summary.teamMembers })}
                tone="green"
              />
              <Stat
                icon={CheckSquare}
                label={t('widgets.teamWorkload.tasks')}
                value={data.summary.totalTasks}
                hint={t('widgets.teamWorkload.pendingAction')}
                tone="brand"
              />
              <Stat
                icon={CalendarClock}
                label={t('widgets.teamWorkload.deadlines')}
                value={data.summary.totalDeadlines}
                hint={t('widgets.teamWorkload.activeWindow')}
                tone="brand"
              />
              <Stat
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

            {preview.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-green/15 bg-brand-green/[0.02] py-10 text-center">
                <p className="text-sm font-bold text-brand-green">{t('widgets.teamWorkload.empty')}</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-brand-green/70">
                        {t('widgets.teamWorkload.table.teamMember')}
                      </TableHead>
                      <TableHead className="hidden py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-right text-brand-green/70 sm:table-cell">
                        {t('widgets.teamWorkload.table.matters')}
                      </TableHead>
                      <TableHead className="hidden py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-right text-brand-green/70 md:table-cell">
                        {t('widgets.teamWorkload.table.tasks')}
                      </TableHead>
                      <TableHead className="hidden py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-right text-brand-green/70 md:table-cell">
                        {t('widgets.teamWorkload.table.deadlines')}
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-right text-brand-green/70">
                        {t('widgets.teamWorkload.table.total')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row) => {
                      const primaryRole = row.user.roles[0]
                      return (
                        <TableRow key={row.user.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-bold text-brand-green group-hover:text-primary transition-colors">{row.user.fullName}</span>
                              {primaryRole ? (
                                <Badge
                                  variant={roleBadgeVariant(primaryRole)}
                                  className="h-4 px-1.5 text-[9px] font-black uppercase tracking-tighter w-fit"
                                >
                                  {formatUserRole(primaryRole)}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="hidden py-3.5 px-4 text-right tabular-nums text-[13px] font-medium text-muted-foreground sm:table-cell">
                            {row.counts.matters}
                          </TableCell>
                          <TableCell className="hidden py-3.5 px-4 text-right tabular-nums text-[13px] font-medium text-muted-foreground md:table-cell">
                            {row.counts.tasks}
                          </TableCell>
                          <TableCell className="hidden py-3.5 px-4 text-right tabular-nums text-[13px] font-medium text-muted-foreground md:table-cell">
                            {row.counts.deadlines}
                          </TableCell>
                          <TableCell className="py-3.5 px-4 text-right font-bold tabular-nums text-[13px] text-brand-green">
                            {row.counts.total}
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
