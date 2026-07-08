import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
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

const SWEEP =
  'after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent after:-translate-x-full after:transition-transform after:duration-700 group-hover:after:translate-x-full'

const STAT_TONE: Record<
  ReportStatTone,
  {
    card: string
    cardGlow: string
    ambient: string
    accentBar: string
    icon: string
    iconGlow: string
    label: string
    value: string
    hint: string
    arrow: string
  }
> = {
  green: {
    card: 'border-brand-green/20 bg-white/75 backdrop-blur-md hover:border-brand-green/40',
    cardGlow:
      'shadow-[0_8px_30px_rgba(26,60,52,0.07)] hover:shadow-[0_16px_44px_rgba(26,60,52,0.14)]',
    ambient: 'from-brand-green/10',
    accentBar: 'bg-brand-green shadow-[0_0_10px_rgba(26,60,52,0.45)]',
    icon: 'bg-gradient-to-br from-brand-green/20 via-brand-green/10 to-white/50 text-brand-green',
    iconGlow: 'shadow-[0_0_18px_rgba(26,60,52,0.18)] group-hover:shadow-[0_0_24px_rgba(26,60,52,0.28)]',
    label: 'text-brand-green/70',
    value: 'text-brand-green',
    hint: 'text-muted-foreground',
    arrow: 'group-hover:text-brand-green group-hover:shadow-[0_0_10px_rgba(26,60,52,0.2)]',
  },
  brand: {
    card: 'border-primary/25 bg-white/75 backdrop-blur-md hover:border-primary/45',
    cardGlow:
      'shadow-[0_8px_30px_rgba(232,98,26,0.08)] hover:shadow-[0_16px_44px_rgba(232,98,26,0.16)]',
    ambient: 'from-primary/10',
    accentBar: 'bg-primary shadow-[0_0_10px_rgba(232,98,26,0.65)]',
    icon: 'bg-gradient-to-br from-primary/25 via-primary/10 to-white/50 text-primary',
    iconGlow: 'shadow-[0_0_18px_rgba(232,98,26,0.22)] group-hover:shadow-[0_0_26px_rgba(232,98,26,0.35)]',
    label: 'text-primary/80',
    value: 'bg-gradient-to-br from-brand-green to-brand-green/80 bg-clip-text text-transparent',
    hint: 'text-muted-foreground',
    arrow: 'group-hover:text-primary group-hover:shadow-[0_0_12px_rgba(232,98,26,0.35)]',
  },
  primary: {
    card: 'border-primary/30 bg-white/75 backdrop-blur-md hover:border-primary/50',
    cardGlow:
      'shadow-[0_8px_30px_rgba(232,98,26,0.1)] hover:shadow-[0_16px_44px_rgba(232,98,26,0.18)]',
    ambient: 'from-primary/12',
    accentBar: 'bg-primary shadow-[0_0_12px_rgba(232,98,26,0.75)]',
    icon: 'bg-gradient-to-br from-primary/30 via-primary/15 to-white/50 text-primary',
    iconGlow: 'shadow-[0_0_20px_rgba(232,98,26,0.28)] group-hover:shadow-[0_0_28px_rgba(232,98,26,0.4)]',
    label: 'text-primary/85',
    value: 'bg-gradient-to-br from-primary to-orange-500 bg-clip-text text-transparent',
    hint: 'text-muted-foreground',
    arrow: 'group-hover:text-primary group-hover:shadow-[0_0_12px_rgba(232,98,26,0.4)]',
  },
  alert: {
    card: 'border-destructive/25 bg-white/75 backdrop-blur-md hover:border-destructive/45',
    cardGlow:
      'shadow-[0_8px_30px_rgba(197,48,48,0.08)] hover:shadow-[0_16px_44px_rgba(197,48,48,0.16)]',
    ambient: 'from-destructive/10',
    accentBar: 'bg-destructive shadow-[0_0_10px_rgba(197,48,48,0.55)]',
    icon: 'bg-gradient-to-br from-destructive/25 via-destructive/10 to-white/50 text-destructive',
    iconGlow: 'shadow-[0_0_18px_rgba(197,48,48,0.2)] group-hover:shadow-[0_0_24px_rgba(197,48,48,0.32)]',
    label: 'text-destructive/80',
    value: 'text-destructive',
    hint: 'text-muted-foreground',
    arrow: 'group-hover:text-destructive group-hover:shadow-[0_0_10px_rgba(197,48,48,0.3)]',
  },
  neutral: {
    card: 'border-border/80 bg-white/70 backdrop-blur-md hover:border-brand-green/25',
    cardGlow:
      'shadow-[0_8px_28px_rgba(26,60,52,0.05)] hover:shadow-[0_14px_40px_rgba(26,60,52,0.1)]',
    ambient: 'from-brand-green/6',
    accentBar: 'bg-brand-green/70 shadow-[0_0_8px_rgba(26,60,52,0.3)]',
    icon: 'bg-gradient-to-br from-muted to-white/60 text-brand-green',
    iconGlow: 'shadow-[0_0_12px_rgba(26,60,52,0.1)] group-hover:shadow-[0_0_18px_rgba(26,60,52,0.18)]',
    label: 'text-muted-foreground',
    value: 'text-brand-green',
    hint: 'text-muted-foreground',
    arrow: 'group-hover:text-brand-green',
  },
}

const LEGEND_PANEL =
  'rounded-2xl border border-brand-green/10 bg-white/70 px-4 py-2.5 text-xs text-muted-foreground shadow-sm backdrop-blur-md'

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
        'group relative overflow-hidden rounded-2xl border shadow-none',
        'transition-all duration-500 ease-out active:scale-[0.99]',
        SWEEP,
        styles.card,
        styles.cardGlow,
        to && 'hover:-translate-y-1',
        compact && 'h-full',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b to-transparent',
          styles.ambient,
        )}
        aria-hidden
      />
      <div
        className={cn(
          'absolute left-0 top-4 h-10 w-1 rounded-r-full opacity-80 transition-all duration-500',
          'group-hover:top-3 group-hover:h-12 group-hover:opacity-100',
          styles.accentBar,
        )}
        aria-hidden
      />

      <CardContent
        className={cn(
          'relative z-10 flex items-center',
          compact ? 'gap-3 p-3.5' : 'gap-4 p-5 md:p-6',
        )}
      >
        <div
          className={cn(
            'relative flex shrink-0 items-center justify-center rounded-2xl border border-white/60',
            'transition-all duration-500 group-hover:scale-110',
            compact ? 'size-10' : 'size-12',
            styles.icon,
            styles.iconGlow,
          )}
        >
          <Icon className={cn(compact ? 'size-4' : 'size-6')} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-bold uppercase tracking-[0.12em]',
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
              {loading ? (
                <span className="inline-flex gap-0.5 animate-pulse">
                  <span>·</span>
                  <span>·</span>
                  <span>·</span>
                </span>
              ) : (
                value
              )}
            </p>
          </div>
          {hint ? (
            <p
              className={cn(
                'mt-2 truncate font-medium opacity-85',
                compact ? 'text-[10px]' : 'text-xs',
                styles.hint,
              )}
            >
              {hint}
            </p>
          ) : null}
        </div>
        {to ? (
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent',
              'bg-white/0 transition-all duration-500 group-hover:border-white/60 group-hover:bg-white/70',
              styles.arrow,
            )}
          >
            <ArrowRight
              className="size-4 shrink-0 text-muted-foreground/35 transition-all duration-500 group-hover:translate-x-0.5"
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
            'inline-flex items-center gap-1.5 rounded-full border font-medium shadow-sm backdrop-blur-sm transition-transform duration-300 hover:scale-[1.02]',
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
            URGENCY_PILL_CLASS[item.key],
          )}
        >
          <span
            className={cn(
              'rounded-full',
              size === 'sm' ? 'size-1.5' : 'size-2',
              URGENCY_DOT_CLASS[item.key],
              item.key === 'overdue' && 'animate-pulse shadow-[0_0_6px_rgba(197,48,48,0.6)]',
            )}
          />
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
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', LEGEND_PANEL, className)}>
      <span className="font-semibold text-brand-green">{t('urgency.legend')}</span>
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
            'inline-flex items-center gap-1.5 rounded-full border font-medium shadow-sm backdrop-blur-sm transition-transform duration-300 hover:scale-[1.02]',
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
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', LEGEND_PANEL, className)}>
      <span className="font-semibold text-brand-green">{t('aging.legend')}</span>
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
            'inline-flex items-center gap-1.5 rounded-full border font-medium shadow-sm backdrop-blur-sm transition-transform duration-300 hover:scale-[1.02]',
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
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', LEGEND_PANEL, className)}>
      <span className="font-semibold text-brand-green">{t('renewalUrgency.legend')}</span>
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
      <div className="border-l-4 border-primary pl-4 shadow-[inset_4px_0_12px_rgba(232,98,26,0.12)]">
        <h2 className="bg-gradient-to-r from-brand-green via-brand-green to-primary bg-clip-text font-serif text-xl text-transparent md:text-2xl">
          {title}
        </h2>
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
        'relative overflow-hidden rounded-2xl border border-brand-green/10 bg-white/80 p-4 shadow-[0_8px_32px_rgba(26,60,52,0.06)] backdrop-blur-md md:p-5',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-brand-green/[0.04] to-transparent"
        aria-hidden
      />
      <div className="relative">{children}</div>
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
    <div className="relative overflow-hidden rounded-2xl border border-brand-green/15 bg-gradient-to-br from-brand-green via-brand-green to-[#0f2621] px-6 py-8 text-white shadow-[0_20px_50px_rgba(26,60,52,0.25)] md:px-10 md:py-10">
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

export type WidgetMiniStatTone = 'brand' | 'green' | 'alert'

const WIDGET_MINI_STAT: Record<
  WidgetMiniStatTone,
  { card: string; icon: string; label: string; value: string }
> = {
  brand: {
    card: 'border-primary/18 bg-white/70 hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(232,98,26,0.08)]',
    icon: 'border-primary/15 bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[0_0_12px_rgba(232,98,26,0.15)]',
    label: 'text-primary/75',
    value: 'text-brand-green',
  },
  green: {
    card: 'border-brand-green/15 bg-white/70 hover:border-brand-green/30 hover:shadow-[0_8px_24px_rgba(26,60,52,0.08)]',
    icon: 'border-brand-green/15 bg-gradient-to-br from-brand-green/20 to-brand-green/5 text-brand-green shadow-[0_0_12px_rgba(26,60,52,0.12)]',
    label: 'text-brand-green/65',
    value: 'text-brand-green',
  },
  alert: {
    card: 'border-destructive/18 bg-white/70 hover:border-destructive/30 hover:shadow-[0_8px_24px_rgba(197,48,48,0.08)]',
    icon: 'border-destructive/15 bg-gradient-to-br from-destructive/20 to-destructive/5 text-destructive shadow-[0_0_12px_rgba(197,48,48,0.15)]',
    label: 'text-destructive/75',
    value: 'text-destructive',
  },
}

export function widgetCtaClass() {
  return cn(
    'group h-8 border-brand-green/20 bg-white/80 text-[11px] font-bold backdrop-blur-sm',
    'transition-all duration-300 hover:border-primary/40 hover:bg-primary/[0.05] hover:text-primary hover:shadow-[0_0_16px_rgba(232,98,26,0.12)]',
  )
}

export function WidgetKpiRail({
  children,
  wash = 'mixed',
  className,
}: {
  children: ReactNode
  wash?: 'primary' | 'green' | 'alert' | 'mixed'
  className?: string
}) {
  const washClass = {
    primary: 'from-primary/[0.05] to-transparent',
    green: 'from-brand-green/[0.05] to-transparent',
    alert: 'from-destructive/[0.04] via-primary/[0.03] to-transparent',
    mixed: 'from-brand-green/[0.04] via-primary/[0.03] to-transparent',
  }[wash]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-brand-green/10 bg-white/50 p-3 shadow-[0_8px_32px_rgba(26,60,52,0.05)] backdrop-blur-sm md:p-4',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b',
          washClass,
        )}
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  )
}

export function WidgetPanelHeader({
  icon: Icon,
  title,
  subtitle,
  to,
  linkLabel,
  accent = 'brand',
  pulse,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  to: string
  linkLabel: string
  accent?: WidgetMiniStatTone
  pulse?: boolean
}) {
  const accentBar =
    accent === 'green'
      ? 'bg-brand-green shadow-[0_0_10px_rgba(26,60,52,0.45)]'
      : accent === 'alert'
        ? 'bg-destructive shadow-[0_0_10px_rgba(197,48,48,0.55)]'
        : 'bg-primary shadow-[0_0_10px_rgba(232,98,26,0.55)]'

  const iconShell =
    accent === 'green'
      ? 'border-brand-green/20 bg-gradient-to-br from-brand-green/20 via-brand-green/10 to-white/60 text-brand-green shadow-[0_0_16px_rgba(26,60,52,0.15)]'
      : accent === 'alert'
        ? 'border-destructive/20 bg-gradient-to-br from-destructive/20 via-destructive/10 to-white/60 text-destructive shadow-[0_0_16px_rgba(197,48,48,0.18)]'
        : 'border-primary/20 bg-gradient-to-br from-primary/20 via-primary/10 to-white/60 text-primary shadow-[0_0_16px_rgba(232,98,26,0.18)]'

  return (
    <div className="relative flex flex-row items-center justify-between gap-3 border-b border-brand-green/8 bg-gradient-to-r from-brand-green/[0.04] via-white/40 to-primary/[0.04] p-5 md:px-6">
      <div
        className={cn(
          'pointer-events-none absolute left-0 top-4 h-10 w-1 rounded-r-full opacity-80',
          accentBar,
        )}
        aria-hidden
      />
      <div className="pl-3">
        <h3 className="flex items-center gap-2.5 font-serif text-lg leading-none">
          <span
            className={cn(
              'relative flex size-9 items-center justify-center rounded-xl border transition-transform duration-500 hover:scale-105',
              iconShell,
            )}
          >
            <Icon className="size-5" />
            {pulse ? (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(197,48,48,0.7)] animate-pulse" />
            ) : null}
          </span>
          <span className="bg-gradient-to-r from-brand-green via-brand-green to-primary bg-clip-text text-transparent">
            {title}
          </span>
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3 text-primary/60" />
          {subtitle}
        </p>
      </div>
      <Link
        to={to}
        className={cn('group', buttonVariants({ variant: 'outline', size: 'sm' }), widgetCtaClass())}
      >
        {linkLabel}
        <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}

export function WidgetLoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-8">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl bg-gradient-to-r from-brand-green/[0.06] via-muted/30 to-brand-green/[0.04]"
        />
      ))}
    </div>
  )
}

export function WidgetEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-brand-green/20 bg-gradient-to-br from-brand-green/[0.04] via-white/60 to-primary/[0.03] py-12 text-center">
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-brand-green/8 blur-2xl"
        aria-hidden
      />
      <div className="relative mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-brand-green/15 bg-white/90 text-brand-green shadow-[0_8px_24px_rgba(26,60,52,0.08)]">
        <Icon className="size-6" />
      </div>
      <p className="relative text-sm font-bold text-brand-green">{title}</p>
      {description ? (
        <p className="relative mt-1 text-xs font-medium text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export function WidgetTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-green/10 bg-white/60 shadow-[0_4px_24px_rgba(26,60,52,0.05)] backdrop-blur-sm">
      {children}
    </div>
  )
}

export const WIDGET_TABLE_HEAD =
  'bg-gradient-to-r from-brand-green/[0.06] via-muted/25 to-primary/[0.04]'

export function WidgetFooterBar({
  message,
  to,
  linkLabel,
}: {
  message: string
  to: string
  linkLabel: string
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-brand-green/8 bg-brand-green/[0.03] px-4 py-3">
      <p className="text-[11px] font-semibold tracking-tight text-muted-foreground/80 italic">
        {message}
      </p>
      <Link
        to={to}
        className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-white/80 px-3 py-1 text-[11px] font-bold text-primary transition-all duration-300 hover:border-primary/40 hover:bg-primary/[0.06] hover:shadow-[0_0_12px_rgba(232,98,26,0.15)]"
      >
        {linkLabel}
        <ArrowRight className="size-3" />
      </Link>
    </div>
  )
}

export function WidgetMiniStat({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'brand',
  loading,
  size = 'md',
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: string
  tone?: WidgetMiniStatTone
  loading?: boolean
  size?: 'sm' | 'md'
}) {
  const styles = WIDGET_MINI_STAT[tone]
  const isSm = size === 'sm'

  return (
    <div
      className={cn(
        'group relative flex min-h-[6.25rem] min-w-0 flex-col overflow-hidden rounded-2xl border backdrop-blur-sm',
        'transition-all duration-500 hover:-translate-y-0.5',
        SWEEP,
        isSm ? 'p-2.5' : 'p-3',
        styles.card,
      )}
    >
      <div className="relative flex items-center gap-1.5">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border transition-transform duration-500 group-hover:scale-105',
            isSm ? 'size-5' : 'size-6',
            styles.icon,
          )}
        >
          <Icon className={isSm ? 'size-2.5' : 'size-3'} />
        </div>
        <p
          className={cn(
            'min-w-0 flex-1 truncate font-black uppercase leading-tight',
            isSm ? 'text-[7px] tracking-[0.06em]' : 'text-[8px] tracking-[0.08em]',
            styles.label,
          )}
        >
          {label}
        </p>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-1 py-1.5">
        <p
          className={cn(
            'w-full text-center font-serif font-bold leading-none tabular-nums',
            isSm ? 'truncate text-sm' : 'text-lg',
            styles.value,
          )}
        >
          {loading ? <span className="animate-pulse">···</span> : value}
        </p>
      </div>

      {hint ? (
        <p
          className={cn(
            'relative truncate text-center font-extrabold uppercase tracking-tight text-muted-foreground/50',
            isSm ? 'text-[6.5px] leading-tight' : 'text-[7px]',
          )}
        >
          {hint}
        </p>
      ) : (
        <span className="h-2" aria-hidden />
      )}
    </div>
  )
}

export function WidgetHighlightBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-brand-green/12 bg-white/60 px-4 py-2.5 shadow-sm backdrop-blur-sm">
      <span className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_rgba(232,98,26,0.55)]" />
      <div className="text-[11px] font-bold uppercase tracking-tight text-brand-green">
        {children}
      </div>
    </div>
  )
}

export function WidgetInfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[0.04] via-white/60 to-brand-green/[0.03] px-4 py-3 text-[11px] leading-relaxed text-muted-foreground shadow-sm backdrop-blur-sm">
      {children}
    </div>
  )
}

export function WidgetBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-gradient-to-b from-brand-green/[0.02] via-transparent to-primary/[0.02] px-5 pb-6 pt-5 md:px-6 md:pb-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function WidgetStatRail({
  children,
  wash = 'mixed',
  className,
}: {
  children: ReactNode
  wash?: 'primary' | 'green' | 'alert' | 'mixed'
  className?: string
}) {
  return (
    <WidgetKpiRail wash={wash} className={className}>
      {children}
    </WidgetKpiRail>
  )
}

export function WidgetSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-green/60">
        <span className="size-1 rounded-full bg-primary shadow-[0_0_6px_rgba(232,98,26,0.5)]" />
        {title}
      </p>
      {children}
    </div>
  )
}

export function WidgetInsetPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-brand-green/10 bg-white/55 p-4 shadow-[0_4px_20px_rgba(26,60,52,0.04)] backdrop-blur-sm md:p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function WidgetHeroStat({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'green',
  loading,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: string
  tone?: WidgetMiniStatTone
  loading?: boolean
}) {
  const styles = WIDGET_MINI_STAT[tone]

  return (
    <div
      className={cn(
        'group relative flex h-full min-h-[8.5rem] flex-col justify-between overflow-hidden rounded-2xl border p-5 backdrop-blur-sm',
        'transition-all duration-500 hover:-translate-y-0.5',
        SWEEP,
        styles.card,
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/8 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex size-11 items-center justify-center rounded-2xl border transition-transform duration-500 group-hover:scale-110',
            styles.icon,
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
      <div className="relative mt-4">
        <p className={cn('text-[9px] font-black uppercase tracking-[0.14em]', styles.label)}>
          {label}
        </p>
        <p className={cn('mt-1 font-serif text-4xl font-bold leading-none tabular-nums', styles.value)}>
          {loading ? <span className="animate-pulse">···</span> : value}
        </p>
        {hint ? (
          <p className="mt-2 text-[10px] font-bold uppercase tracking-tight text-muted-foreground/55">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function WidgetFeaturedBanner({
  icon: Icon,
  title,
  subtitle,
  meta,
  tone = 'brand',
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  meta?: ReactNode
  tone?: WidgetMiniStatTone
}) {
  const shell =
    tone === 'green'
      ? 'border-brand-green/15 bg-gradient-to-r from-brand-green/[0.06] via-white/70 to-brand-green/[0.03]'
      : tone === 'alert'
        ? 'border-destructive/15 bg-gradient-to-r from-destructive/[0.06] via-white/70 to-destructive/[0.03]'
        : 'border-primary/15 bg-gradient-to-r from-primary/[0.06] via-white/70 to-primary/[0.03]'

  const iconShell =
    tone === 'green'
      ? 'bg-brand-green/10 text-brand-green shadow-[0_0_14px_rgba(26,60,52,0.12)]'
      : tone === 'alert'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-primary/10 text-primary shadow-[0_0_14px_rgba(232,98,26,0.18)]'

  return (
    <div
      className={cn(
        'flex items-center gap-4 overflow-hidden rounded-2xl border p-4 backdrop-blur-sm transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(26,60,52,0.08)]',
        shell,
      )}
    >
      <div
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/60',
          iconShell,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
          {subtitle}
        </p>
        <p className="mt-0.5 truncate font-serif text-lg font-bold text-brand-green">{title}</p>
      </div>
      {meta ? <div className="shrink-0">{meta}</div> : null}
    </div>
  )
}

export function WidgetTableSection({
  title,
  count,
  children,
  footer,
}: {
  title: string
  count?: number
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-green/60">
          <span className="size-1 rounded-full bg-primary shadow-[0_0_6px_rgba(232,98,26,0.5)]" />
          {title}
        </p>
        {count !== undefined ? (
          <span className="rounded-full border border-brand-green/12 bg-white/70 px-2.5 py-0.5 text-[10px] font-bold tabular-nums text-brand-green/70">
            {count}
          </span>
        ) : null}
      </div>
      {children}
      {footer}
    </div>
  )
}

export const WIDGET_TABLE_ROW =
  'group border-b border-brand-green/[0.06] transition-all duration-300 hover:bg-white/90 last:border-0'

export function WidgetTypeBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit rounded-full border border-brand-green/15 bg-brand-green/[0.06] px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-brand-green">
      {children}
    </span>
  )
}

export function WidgetDateBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-lg border border-brand-green/12 bg-white/80 px-2.5 py-1 text-[12px] font-bold tabular-nums text-brand-green shadow-sm">
      {children}
    </span>
  )
}

export function WidgetMetricBadge({
  children,
  tone = 'green',
}: {
  children: ReactNode
  tone?: 'green' | 'brand' | 'alert'
}) {
  const styles = {
    green: 'border-brand-green/15 bg-brand-green/[0.06] text-brand-green',
    brand: 'border-primary/20 bg-primary/[0.08] text-primary',
    alert: 'border-destructive/20 bg-destructive/[0.08] text-destructive',
  }[tone]

  return (
    <span
      className={cn(
        'inline-flex rounded-lg border px-2.5 py-1 text-[12px] font-bold tabular-nums shadow-sm',
        styles,
      )}
    >
      {children}
    </span>
  )
}

export function WidgetRankBadge({ rank }: { rank: number }) {
  const isTop = rank === 1
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black tabular-nums',
        isTop
          ? 'border-primary/25 bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[0_0_10px_rgba(232,98,26,0.2)]'
          : 'border-brand-green/12 bg-brand-green/[0.05] text-brand-green/70',
      )}
    >
      {rank}
    </span>
  )
}

export function WidgetAvatarInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const label = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-brand-green/15 bg-gradient-to-br from-brand-green/15 to-white/80 text-[11px] font-black text-brand-green shadow-sm transition-transform duration-300 group-hover:scale-105">
      {label || '?'}
    </span>
  )
}

export function WidgetProgressBar({
  value,
  max,
  tone = 'brand',
}: {
  value: number
  max: number
  tone?: 'brand' | 'green'
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const fill =
    tone === 'green'
      ? 'bg-gradient-to-r from-brand-green/70 to-brand-green'
      : 'bg-gradient-to-r from-primary/70 to-primary'

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-green/10">
      <div className={cn('h-full rounded-full transition-all duration-500', fill)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function WidgetErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.04] py-10 text-center text-sm font-medium text-destructive">
      {message}
    </div>
  )
}
