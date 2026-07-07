import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { URGENCY_DOT_CLASS } from '@/features/deadlines/utils'
import {
  AGING_DOT_CLASS,
  AGING_PILL_CLASS,
  agingBucketLabel,
} from '@/features/reports/receivables-aging'
import type { AgingBucket, AgingBucketCounts } from '@/features/reports/types'
import type { RenewalUrgencyCounts } from '@/features/reports/types'
import {
  RENEWAL_URGENCY_DOT_CLASS,
  RENEWAL_URGENCY_PILL_CLASS,
  renewalUrgencyLabel,
  type ActiveRenewalUrgencyTier,
} from '@/features/reports/renewal-urgency'
import type { UrgencyTier } from '@/features/reports/types'
import type { UrgencyCounts } from '@/features/reports/types'
import { cn } from '@/lib/utils'

export type ReportStatTone = 'brand' | 'green' | 'alert' | 'primary' | 'neutral'

const STAT_TONE: Record<
  ReportStatTone,
  { card: string; icon: string; label: string; value: string; hint: string }
> = {
  green: {
    card: 'border-brand-green/12 bg-brand-green/[0.04] hover:border-brand-green/22',
    icon: 'bg-brand-green/10 text-brand-green',
    label: 'text-brand-green/65',
    value: 'text-brand-green',
    hint: 'text-muted-foreground',
  },
  brand: {
    card: 'border-primary/18 bg-primary/[0.05] hover:border-primary/30',
    icon: 'bg-primary/12 text-primary',
    label: 'text-primary/75',
    value: 'text-brand-green',
    hint: 'text-muted-foreground',
  },
  primary: {
    card: 'border-primary/22 bg-primary/[0.07] hover:border-primary/35',
    icon: 'bg-primary/15 text-primary',
    label: 'text-primary/80',
    value: 'text-primary',
    hint: 'text-muted-foreground',
  },
  alert: {
    card: 'border-destructive/18 bg-destructive/[0.05] hover:border-destructive/32',
    icon: 'bg-destructive/12 text-destructive',
    label: 'text-destructive/75',
    value: 'text-destructive',
    hint: 'text-muted-foreground',
  },
  neutral: {
    card: 'border-border bg-card hover:border-brand-green/18',
    icon: 'bg-muted text-brand-green',
    label: 'text-muted-foreground',
    value: 'text-brand-green',
    hint: 'text-muted-foreground',
  },
}

export function ReportStatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'brand',
  to,
  loading,
  compact,
}: {
  icon: LucideIcon
  label: string
  value: number | string
  hint?: string
  tone?: ReportStatTone
  to?: string
  loading?: boolean
  compact?: boolean
}) {
  const styles = STAT_TONE[tone]
  const body = (
    <Card
      className={cn(
        'group overflow-hidden border shadow-none transition-all duration-300',
        styles.card,
        to && 'hover:shadow-md hover:-translate-y-0.5',
        compact && 'h-full',
      )}
    >
      <CardContent
        className={cn('flex items-center gap-3', compact ? 'p-3.5' : 'gap-4 p-5 md:p-6')}
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110',
            compact ? 'size-9' : 'size-12',
            styles.icon,
          )}
        >
          <Icon className={cn(compact ? 'size-4' : 'size-6')} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-bold uppercase tracking-[0.1em]',
              compact ? 'text-[9px]' : 'text-[10px]',
              styles.label,
            )}
          >
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <p
              className={cn(
                'mt-1 font-serif font-medium leading-none tabular-nums',
                compact ? 'text-xl' : 'text-3xl',
                styles.value,
              )}
            >
              {loading ? <span className="animate-pulse">···</span> : value}
            </p>
          </div>
          {hint ? (
            <p className={cn('mt-2 truncate font-medium opacity-80', compact ? 'text-[10px]' : 'text-xs', styles.hint)}>
              {hint}
            </p>
          ) : null}
        </div>
        {to ? (
          <div className="flex size-7 items-center justify-center rounded-full bg-white/0 transition-colors group-hover:bg-white/50">
            <ArrowRight
              className={cn(
                'size-4 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-primary',
              )}
              aria-hidden
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )

  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  )
}

const URGENCY_PILL_CLASS: Record<
  Exclude<UrgencyTier, 'ok' | 'completed'>,
  string
> = {
  overdue: 'border-destructive/20 bg-destructive/[0.08] text-destructive',
  today: 'border-primary/25 bg-primary/[0.1] text-primary',
  urgent: 'border-[#e8621a]/20 bg-[#e8621a]/[0.08] text-[#b84e12]',
  soon: 'border-brand-green/15 bg-brand-green/[0.06] text-brand-green/90',
}

export function UrgencyPills({ counts, size = 'default' }: { counts: UrgencyCounts; size?: 'default' | 'sm' }) {
  const { t } = useTranslation('reports')
  const items = [
    { key: 'overdue' as const, label: t('urgency.overdue'), show: counts.overdue },
    { key: 'today' as const, label: t('urgency.todayShort'), show: counts.today },
    { key: 'urgent' as const, label: t('urgency.urgentShort'), show: counts.urgent },
    { key: 'soon' as const, label: t('urgency.soonShort'), show: counts.soon },
  ].filter((i) => i.show > 0)

  if (items.length === 0) {
    return <span className="text-xs text-muted-foreground">{t('urgency.noActiveRisk')}</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.key}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border font-medium',
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
            URGENCY_PILL_CLASS[item.key],
          )}
        >
          <span className={cn('rounded-full', size === 'sm' ? 'size-1.5' : 'size-2', URGENCY_DOT_CLASS[item.key])} />
          {item.label}
          <span className="font-semibold tabular-nums">{item.show}</span>
        </span>
      ))}
    </div>
  )
}

export function UrgencyLegend({ className }: { className?: string }) {
  const { t } = useTranslation('reports')
  const items: Array<{ key: Exclude<UrgencyTier, 'ok' | 'completed'>; label: string }> = [
    { key: 'overdue', label: t('urgency.overdue') },
    { key: 'today', label: t('urgency.today') },
    { key: 'urgent', label: t('urgency.urgent') },
    { key: 'soon', label: t('urgency.soon') },
  ]

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-xs text-muted-foreground',
        className,
      )}
    >
      <span className="font-medium text-brand-green">{t('urgency.legend')}</span>
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', URGENCY_DOT_CLASS[item.key])} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

export function AgingPills({
  aging,
  size = 'default',
  showAmount,
  currency = 'EUR',
}: {
  aging: AgingBucketCounts
  size?: 'default' | 'sm'
  showAmount?: boolean
  currency?: string
}) {
  const { t } = useTranslation('reports')
  const buckets: AgingBucket[] = ['overdue90plus', 'overdue60', 'overdue30', 'current']
  const items = buckets
    .filter((key) => aging[key].count > 0)
    .map((key) => ({ key, ...aging[key] }))

  if (items.length === 0) {
    return <span className="text-xs text-muted-foreground">{t('aging.noOpenReceivables')}</span>
  }

  const money = (n: number) =>
    new Intl.NumberFormat('en-EU', { style: 'currency', currency }).format(n)

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.key}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border font-medium',
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
            AGING_PILL_CLASS[item.key],
          )}
        >
          <span
            className={cn(
              'rounded-full',
              size === 'sm' ? 'size-1.5' : 'size-2',
              AGING_DOT_CLASS[item.key],
            )}
          />
          {agingBucketLabel(item.key)}
          <span className="font-semibold tabular-nums">{item.count}</span>
          {showAmount ? (
            <span className="tabular-nums opacity-80">· {money(item.amount)}</span>
          ) : null}
        </span>
      ))}
    </div>
  )
}

export function AgingLegend({ className }: { className?: string }) {
  const { t } = useTranslation('reports')
  const items: AgingBucket[] = ['current', 'overdue30', 'overdue60', 'overdue90plus']

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-xs text-muted-foreground',
        className,
      )}
    >
      <span className="font-medium text-brand-green">{t('aging.legend')}</span>
      {items.map((key) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', AGING_DOT_CLASS[key])} />
          {agingBucketLabel(key)}
        </span>
      ))}
    </div>
  )
}

export function RenewalUrgencyPills({
  urgency,
  size = 'default',
}: {
  urgency: RenewalUrgencyCounts
  size?: 'default' | 'sm'
}) {
  const { t } = useTranslation('reports')
  const buckets: ActiveRenewalUrgencyTier[] = ['overdue', 'today', 'urgent', 'soon']
  const items = buckets.filter((key) => urgency[key] > 0)

  if (items.length === 0) {
    return <span className="text-xs text-muted-foreground">{t('renewalUrgency.noPipeline')}</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((key) => (
        <span
          key={key}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border font-medium',
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
            RENEWAL_URGENCY_PILL_CLASS[key],
          )}
        >
          <span
            className={cn(
              'rounded-full',
              size === 'sm' ? 'size-1.5' : 'size-2',
              RENEWAL_URGENCY_DOT_CLASS[key],
            )}
          />
          {renewalUrgencyLabel(key)}
          <span className="font-semibold tabular-nums">{urgency[key]}</span>
        </span>
      ))}
    </div>
  )
}

export function RenewalUrgencyLegend({ className }: { className?: string }) {
  const { t } = useTranslation('reports')
  const items: ActiveRenewalUrgencyTier[] = ['overdue', 'today', 'urgent', 'soon']

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-xs text-muted-foreground',
        className,
      )}
    >
      <span className="font-medium text-brand-green">{t('renewalUrgency.legend')}</span>
      {items.map((key) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', RENEWAL_URGENCY_DOT_CLASS[key])} />
          {renewalUrgencyLabel(key)}
        </span>
      ))}
    </div>
  )
}

export function ReportSectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-serif text-xl text-brand-green md:text-2xl">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function ReportPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/90 bg-card p-4 shadow-xs md:p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function StaffDashboardHero({
  eyebrow,
  title,
  firstName,
  description,
  children,
}: {
  eyebrow: string
  title: string
  firstName: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-green/12 bg-gradient-to-br from-brand-green via-brand-green to-[#12302a] px-6 py-8 text-white shadow-lg md:px-10 md:py-10">
      {/* Decorative Blur Elements */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-primary/20 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-10 bottom-0 size-60 rounded-full bg-white/5 blur-[80px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-1/4 top-1/4 size-40 rounded-full bg-primary/10 blur-[60px]"
        aria-hidden
      />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
            {eyebrow}
          </p>
        </div>
        
        <h1 className="mt-6 font-serif text-3xl font-light tracking-tight text-white md:text-4xl lg:text-5xl">
          {title}, <span className="text-primary font-normal">{firstName}</span>
        </h1>
        
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
          {description}
        </p>
        
        {children ? (
          <div className="mt-8 flex flex-wrap gap-4">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}
