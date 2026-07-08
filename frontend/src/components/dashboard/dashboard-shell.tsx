import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { DashboardSlider } from '@/components/dashboard/DashboardSlider'
import { cn } from '@/lib/utils'

export const SWEEP =
  'after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/50 after:to-transparent after:-translate-x-full after:transition-transform after:duration-700 group-hover:after:translate-x-full'

export function dashboardHeroPrimaryClass() {
  return cn(
    buttonVariants(),
    'border-0 bg-primary text-primary-foreground shadow-lg shadow-primary/35',
    'transition-all duration-500 hover:scale-[1.02] hover:bg-primary/95 hover:shadow-primary/45',
  )
}

export function dashboardHeroSecondaryClass() {
  return cn(
    buttonVariants({ variant: 'outline' }),
    'border-white/20 bg-white/10 text-white backdrop-blur-md',
    'transition-all duration-500 hover:scale-[1.02] hover:border-white/30 hover:bg-white/15 hover:shadow-[0_0_24px_rgba(255,255,255,0.08)]',
  )
}

export function DashboardPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative -mx-4 -mt-4 min-h-full px-4 pb-2 pt-4 md:-mx-6 md:px-6 md:pb-4 md:pt-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-20 size-[28rem] rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute -right-24 top-1/4 size-80 rounded-full bg-brand-green/[0.06] blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 size-72 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(26,60,52,0.04),transparent_55%)]" />
      </div>
      <div className="relative space-y-10">{children}</div>
    </div>
  )
}

export function DashboardSectionHeading({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="border-l-4 border-primary pl-4 font-serif text-xl shadow-[inset_4px_0_12px_rgba(232,98,26,0.12)] md:text-2xl">
        <span className="bg-gradient-to-r from-brand-green via-brand-green to-primary bg-clip-text text-transparent">
          {title}
        </span>
      </h2>
      {action}
    </div>
  )
}

export function DashboardKpiRail({
  children,
  desktopCols = 4,
  ariaLabel,
}: {
  children: ReactNode
  desktopCols?: 2 | 3 | 4 | 5
  ariaLabel?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-green/10 bg-white/50 p-4 shadow-[0_8px_32px_rgba(26,60,52,0.05)] backdrop-blur-sm md:p-5">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/[0.04] to-transparent"
        aria-hidden
      />
      <div className="relative">
        <DashboardSlider desktopCols={desktopCols} ariaLabel={ariaLabel}>
          {children}
        </DashboardSlider>
      </div>
    </div>
  )
}

export function DashboardQuickLinkCard({
  to,
  icon: Icon,
  title,
  description,
  iconClassName,
  variant = 'tile',
}: {
  to: string
  icon: LucideIcon
  title: string
  description: string
  iconClassName: string
  variant?: 'tile' | 'row'
}) {
  if (variant === 'row') {
    return (
      <Link to={to} className="group block h-full">
        <Card
          className={cn(
            'relative h-full overflow-hidden rounded-2xl border border-brand-green/15 bg-white/75 shadow-[0_8px_30px_rgba(26,60,52,0.06)] backdrop-blur-md',
            'transition-all duration-500 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_44px_rgba(26,60,52,0.12)]',
            SWEEP,
          )}
        >
          <CardContent className="relative flex items-start gap-4 p-5">
            <span
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/60 shadow-sm transition-all duration-500 group-hover:scale-110',
                iconClassName,
              )}
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1 px-1">
              <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                {title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition-all duration-500 group-hover:translate-x-1 group-hover:text-primary" />
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Link to={to} className="group block h-full">
      <Card
        className={cn(
          'relative h-full overflow-hidden rounded-2xl border border-brand-green/15 bg-white/75 shadow-[0_8px_30px_rgba(26,60,52,0.06)] backdrop-blur-md',
          'transition-all duration-500 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_44px_rgba(26,60,52,0.12)]',
          SWEEP,
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-brand-green/[0.05] to-transparent"
          aria-hidden
        />
        <CardContent className="relative flex flex-col gap-3 p-5">
          <span
            className={cn(
              'flex size-11 items-center justify-center rounded-xl border border-white/60 shadow-sm transition-all duration-500 group-hover:scale-110',
              iconClassName,
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1 px-1">
            <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
              {title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function DashboardQuickLinksRail({
  children,
  desktopCols = 3,
  ariaLabel,
}: {
  children: ReactNode
  desktopCols?: 2 | 3 | 4 | 5
  ariaLabel?: string
}) {
  return (
    <DashboardSlider desktopCols={desktopCols} ariaLabel={ariaLabel} className="pt-1">
      {children}
    </DashboardSlider>
  )
}
