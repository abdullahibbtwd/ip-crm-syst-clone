import { Link } from 'react-router-dom'
import {
  Award,
  Atom,
  CalendarClock,
  FolderOpen,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { MATTER_PAGE_SIZE } from '@/components/matters/MattersTable'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useMatters } from '@/features/matters/hooks/useMatters'
import { useMyDeadlines } from '@/features/deadlines/hooks/useDeadlines'
import { usePortalRenewals } from '@/features/renewals/hooks/useRenewals'
import { deadlineUrgency } from '@/features/deadlines/utils'
import { cn } from '@/lib/utils'

type PortalDashboardProps = {
  userName: string
}

type StatCardProps = {
  icon: typeof FolderOpen
  label: string
  value: number | string
  hint: string
  to?: string
  tone?: 'brand' | 'green' | 'alert'
  loading?: boolean
}

const TONE_STYLES: Record<
  NonNullable<StatCardProps['tone']>,
  { card: string; icon: string; label: string; value: string; hint: string; arrow: string }
> = {
  green: {
    card: 'border-[#1a3c34]/10 bg-[#1a3c34]/[0.04] hover:border-[#1a3c34]/25 hover:bg-[#1a3c34]/[0.07]',
    icon: 'bg-[#1a3c34]/10 text-[#1a3c34]',
    label: 'text-[#1a3c34]/60',
    value: 'text-[#1a3c34]',
    hint: 'text-muted-foreground',
    arrow: 'text-[#1a3c34]/40 group-hover:text-[#1a3c34]',
  },
  brand: {
    card: 'border-primary/15 bg-primary/[0.05] hover:border-primary/35 hover:bg-primary/[0.09]',
    icon: 'bg-primary/12 text-primary',
    label: 'text-primary/70',
    value: 'text-[#1a3c34]',
    hint: 'text-muted-foreground',
    arrow: 'text-primary/40 group-hover:text-primary',
  },
  alert: {
    card: 'border-destructive/15 bg-destructive/[0.05] hover:border-destructive/35 hover:bg-destructive/[0.09]',
    icon: 'bg-destructive/12 text-destructive',
    label: 'text-destructive/70',
    value: 'text-destructive',
    hint: 'text-muted-foreground',
    arrow: 'text-destructive/40 group-hover:text-destructive',
  },
}

function StatCard({ icon: Icon, label, value, hint, to, tone = 'brand', loading }: StatCardProps) {
  const styles = TONE_STYLES[tone]
  const body = (
    <Card
      className={cn(
        'group relative overflow-hidden border shadow-none transition',
        styles.card,
        to && 'hover:shadow-md',
      )}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            styles.icon,
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-medium uppercase tracking-wide', styles.label)}>
            {label}
          </p>
          <p className={cn('mt-0.5 font-serif text-2xl leading-none', styles.value)}>
            {loading ? '—' : value}
          </p>
          <p className={cn('mt-1 truncate text-xs', styles.hint)}>{hint}</p>
        </div>
        {to && (
          <ArrowRight
            className={cn(
              'size-4 shrink-0 transition group-hover:translate-x-0.5',
              styles.arrow,
            )}
            aria-hidden
          />
        )}
      </CardContent>
    </Card>
  )

  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}

export function PortalDashboard({ userName }: PortalDashboardProps) {
  const firstName = userName.split(' ')[0]
  const matters = useMatters({ limit: MATTER_PAGE_SIZE })
  const deadlines = useMyDeadlines({ limit: 100 })
  const renewals = usePortalRenewals()

  const matterCount = matters.data?.items.length ?? 0
  const matterHasMore = Boolean(matters.data?.nextCursor)

  const renewalCount = renewals.data?.length ?? 0
  const renewalsNeedAction =
    renewals.data?.filter((r) => r.status === 'upcoming').length ?? 0

  const deadlineItems = deadlines.data?.items ?? []
  const openDeadlines = deadlineItems.filter(
    (d) => d.status !== 'completed' && d.status !== 'superseded',
  )
  const overdueCount = deadlineItems.filter(
    (d) => deadlineUrgency(d.dueDate, d.status) === 'overdue',
  ).length

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-[#1a3c34] via-[#1a3c34] to-[#12302a] px-6 py-7 text-white md:px-8 md:py-9">
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/25 blur-3xl"
          aria-hidden
        />
        <div className="pointer-events-none absolute right-24 bottom-0 size-40 rounded-full bg-primary/10 blur-2xl" aria-hidden />
        <div className="relative">
          <p className="text-sm font-medium text-white/70">Client portal</p>
          <h1 className="mt-1 font-serif text-2xl text-white md:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Submit new filing enquiries and track matters opened under your organisation.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/portal/intake?tab=new&type=trademark"
              className={cn(
                buttonVariants(),
                'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              <Award className="size-4" />
              File a trademark
            </Link>
            <Link
              to="/portal/intake?tab=new&type=patent"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white',
              )}
            >
              <Atom className="size-4" />
              File a patent
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderOpen}
          label="Active matters"
          value={matterHasMore ? `${matterCount}+` : matterCount}
          hint="Opened for your organisation"
          to="/matters"
          tone="green"
          loading={matters.isLoading}
        />
        <StatCard
          icon={RefreshCw}
          label="Renewals"
          value={renewalCount}
          hint={
            renewalsNeedAction > 0
              ? `${renewalsNeedAction} awaiting your decision`
              : 'No action required'
          }
          to="/portal/renewals"
          tone={renewalsNeedAction > 0 ? 'brand' : 'green'}
          loading={renewals.isLoading}
        />
        <StatCard
          icon={CalendarClock}
          label="Open deadlines"
          value={openDeadlines.length}
          hint="Awaiting action or in progress"
          to="/deadlines/my"
          tone="brand"
          loading={deadlines.isLoading}
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={overdueCount}
          hint={overdueCount > 0 ? 'Needs immediate attention' : 'Nothing overdue'}
          to="/deadlines/my"
          tone={overdueCount > 0 ? 'alert' : 'green'}
          loading={deadlines.isLoading}
        />
      </div>
    </div>
  )
}
