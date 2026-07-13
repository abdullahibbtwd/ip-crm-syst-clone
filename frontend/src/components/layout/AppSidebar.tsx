import type { NavItem, NavSection } from '@/config/role-views'
import { navId } from '@/features/shell/nav-utils'
import { useShell } from '@/features/shell/ShellProvider'
import {
  useFirmTodayDeadlineCount,
  useMyTodayDeadlineCount,
} from '@/features/deadlines/hooks/useDeadlines'
import { useIntakePendingCount } from '@/features/intake/hooks/useIntake'
import { useWatchNewCount } from '@/features/watch/hooks/useWatch'
import { DueTodayCountBadge } from '@/components/deadlines/DueTodayBadge'
import { usePermission } from '@/hooks/usePermission'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

function humanizeNavKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
}

function useIsLgUp() {
  const [isLgUp, setIsLgUp] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setIsLgUp(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isLgUp
}

type AppSidebarProps = {
  nav: NavSection[]
  footer: NavItem[]
  external?: boolean
  activeNavId: string
  onNavigate: (id: string, path?: string) => void
}

type SidebarTheme = {
  accentBar: string
  accentGlow: string
  iconActive: string
  hoverDot: string
  labelMuted: string
  sectionLabel: string
}

const THEMES: Record<'internal' | 'external', SidebarTheme> = {
  internal: {
    accentBar: 'before:bg-primary before:shadow-[0_0_10px_rgba(232,98,26,0.85)]',
    accentGlow: 'shadow-[0_0_20px_rgba(232,98,26,0.15)]',
    iconActive: 'text-primary drop-shadow-[0_0_8px_rgba(232,98,26,0.55)]',
    hoverDot: 'bg-primary/90 shadow-[0_0_8px_rgba(232,98,26,0.7)]',
    labelMuted: 'text-white/35',
    sectionLabel: 'text-white/30',
  },
  external: {
    accentBar: 'before:bg-emerald-400 before:shadow-[0_0_10px_rgba(52,211,153,0.85)]',
    accentGlow: 'shadow-[0_0_20px_rgba(52,211,153,0.12)]',
    iconActive: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.55)]',
    hoverDot: 'bg-emerald-400/90 shadow-[0_0_8px_#10b981]',
    labelMuted: 'text-emerald-400/90',
    sectionLabel: 'text-white/30',
  },
}

function badgeForPath(
  path: string | undefined,
  myCount: number,
  firmCount: number,
  intakeCount: number,
  alertsCount: number,
  watchNewCount: number,
  messagesUnreadCount: number,
): number {
  if (!path) return 0
  if (path === '/deadlines/my') return myCount
  if (path === '/deadlines') return firmCount
  if (path === '/intake') return intakeCount
  if (path === '/alerts') return alertsCount > 0 ? alertsCount : 0
  if (path === '/watch-alerts') return watchNewCount
  if (path === '/portal/messages') return messagesUnreadCount
  return 0
}

function SidebarLink({
  item,
  external,
  isActive,
  collapsed,
  onNavigate,
  badge,
}: {
  item: NavItem
  external?: boolean
  isActive: boolean
  collapsed: boolean
  onNavigate: (id: string, path?: string) => void
  badge?: number
}) {
  const { t } = useTranslation('nav')
  const theme = THEMES[external ? 'external' : 'internal']
  const Icon = item.icon
  const id = navId(item)
  const label = t(`items.${item.labelKey}`, {
    defaultValue: humanizeNavKey(item.labelKey),
  })
  // Prefer shell activeNavId so query-specific siblings (e.g. escalations vs all deadlines)
  // do not all highlight when sharing a pathname.
  const routeActive = isActive
  const isAlerts = item.path === '/alerts'
  const badgeLabel = isAlerts ? 'alerts' : undefined
  const badgeTone = isAlerts ? ('warning' as const) : undefined

  const className = cn(
    buttonVariants({ variant: 'ghost' }),
    'group relative h-10 w-full overflow-hidden rounded-xl text-[13px] font-normal',
    'text-white/70 transition-all duration-500 ease-out active:scale-[0.98]',
    'after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-r',
    'after:from-white/0 after:via-white/10 after:to-white/0',
    'after:-translate-x-full after:transition-transform after:duration-700 group-hover:after:translate-x-full',
    collapsed ? 'justify-center px-0' : 'justify-start gap-2.5 px-3',
    routeActive
      ? cn(
          'border border-white/10 bg-white/10 font-semibold text-white backdrop-blur-md',
          theme.accentGlow,
          'before:absolute before:left-0 before:top-2.5 before:h-5 before:w-1 before:rounded-r-full before:transition-all',
          theme.accentBar,
        )
      : 'border border-transparent hover:border-white/5 hover:bg-white/5 hover:text-white',
    !collapsed && !routeActive && 'hover:translate-x-0.5',
  )

  const content = (
    <>
      <span className="relative z-10 shrink-0">
        <Icon
          className={cn(
            'size-4 transition-all duration-500 group-hover:scale-110',
            routeActive ? cn('opacity-100', theme.iconActive) : 'opacity-70 group-hover:opacity-100',
          )}
          aria-hidden
        />
        {collapsed && badge ? (
          <DueTodayCountBadge
            count={badge}
            collapsed
            external={external}
            label={badgeLabel}
            tone={badgeTone}
          />
        ) : null}
      </span>
      {!collapsed && (
        <>
          <span className="relative z-10 flex-1 truncate text-left tracking-wide">{label}</span>
          {badge ? (
            <span className="relative z-10">
              <DueTodayCountBadge
                count={badge}
                external={external}
                label={badgeLabel}
                tone={badgeTone}
              />
            </span>
          ) : (
            <span
              className={cn(
                'relative z-10 ml-auto size-1.5 scale-0 rounded-full transition-all duration-500 group-hover:scale-100',
                theme.hoverDot,
              )}
            />
          )}
        </>
      )}
    </>
  )

  const title = collapsed ? label : undefined

  if (item.path) {
    return (
      <Link
        to={item.path}
        title={title}
        onClick={() => onNavigate(id, item.path)}
        aria-current={routeActive ? 'page' : undefined}
        aria-label={collapsed ? label : undefined}
        className={className}
      >
        {content}
      </Link>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      title={title}
      onClick={() => onNavigate(id)}
      aria-current={isActive ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={className}
    >
      {content}
    </Button>
  )
}

export function AppSidebar({
  nav,
  footer,
  external,
  activeNavId,
  onNavigate,
}: AppSidebarProps) {
  const { t } = useTranslation('nav')
  const theme = THEMES[external ? 'external' : 'internal']
  const { sidebarCollapsed, toggleSidebarCollapsed } = useShell()
  const isLgUp = useIsLgUp()
  const collapsed = sidebarCollapsed && isLgUp
  const canReadDeadlines = usePermission('deadline', 'read')
  const canReadIntake = usePermission('intake', 'read')
  const canReadMatters = usePermission('matter', 'read')
  const { data: myToday } = useMyTodayDeadlineCount(canReadDeadlines)
  const { data: firmToday } = useFirmTodayDeadlineCount(canReadDeadlines)
  const { data: intakePending } = useIntakePendingCount(canReadIntake && !external)
  const myTodayCount = myToday?.count ?? 0
  const firmTodayCount = firmToday?.count ?? 0
  const intakePendingCount = intakePending?.count ?? 0

  type AlertsSummaryResponse = {
    overdue: Array<{ id: string }>
    today: Array<{ id: string }>
    urgent: Array<{ id: string }>
    notifications: Array<{ id: string }>
  }

  const { data: alertsSummary } = useQuery({
    queryKey: ['alerts', 'summary'],
    queryFn: () => apiClient.get<AlertsSummaryResponse>('/alerts/summary'),
    enabled: !external,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  })

  const { data: watchNew } = useWatchNewCount()
  const watchNewCount = canReadMatters && !external ? (watchNew?.newCount ?? 0) : 0

  const { data: messagesUnread } = useQuery({
    queryKey: ['portal-messages', 'unread-count'],
    queryFn: () => apiClient.get<{ count: number }>('/portal/messages/unread-count'),
    enabled: Boolean(external),
    refetchInterval: 60_000,
  })
  const messagesUnreadCount = external ? (messagesUnread?.count ?? 0) : 0

  const alertsCount =
    (alertsSummary?.overdue?.length ?? 0) +
    (alertsSummary?.today?.length ?? 0) +
    (alertsSummary?.urgent?.length ?? 0) +
    (alertsSummary?.notifications?.length ?? 0)

  const badgeForItem = (item: NavItem) =>
    badgeForPath(
      item.path,
      myTodayCount,
      firmTodayCount,
      intakePendingCount,
      alertsCount,
      watchNewCount,
      messagesUnreadCount,
    )

  return (
    <aside
      className={cn(
        'relative flex h-full shrink-0 flex-col overflow-hidden border-r text-white',
        'transition-[width] duration-500 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[240px]',
        external
          ? 'border-white/10 bg-gradient-to-b from-brand-green via-brand-green/95 to-emerald-950 shadow-[4px_0_32px_rgba(0,0,0,0.35)]'
          : 'border-brand-green/30 bg-gradient-to-b from-brand-green via-[#152e28] to-slate-950 shadow-[4px_0_32px_rgba(0,0,0,0.25)]',
      )}
    >
      {/* Ambient depth — soft light pool at the top */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent',
          external ? 'from-emerald-400/10' : 'from-primary/10',
        )}
        aria-hidden
      />

      <div
        className={cn(
          'relative z-10 flex items-center border-b border-white/10 bg-white/[0.03] backdrop-blur-md',
          collapsed ? 'flex-col gap-2 px-2 py-3' : 'gap-3 px-4 py-4',
        )}
      >
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
            'shadow-lg transition-all duration-500 hover:rotate-6 hover:scale-105',
            external
              ? 'bg-gradient-to-tr from-emerald-400 to-teal-300 text-emerald-950 shadow-emerald-500/30'
              : 'bg-gradient-to-tr from-primary to-orange-400 text-white shadow-primary/40',
          )}
        >
          IP
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-white drop-shadow-sm">
              IP Consulting
            </p>
            <p className={cn('text-[9px] font-bold tracking-widest uppercase', theme.labelMuted)}>
              {external ? 'Client portal' : 'CRM'}
            </p>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebarCollapsed}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          aria-expanded={!collapsed}
          className={cn(
            'shrink-0 text-white/70 transition-all duration-500 hover:bg-white/10 hover:text-white',
            !collapsed && 'ml-auto',
            !isLgUp && 'hidden',
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>

      <div
        className={cn(
          'relative z-10 flex-1 overflow-y-auto py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          collapsed ? 'space-y-2 px-2' : 'space-y-4 px-3',
        )}
      >
        {nav.map((group) => (
          <div key={group.sectionKey} className="space-y-1">
            {!collapsed && (
              <p
                className={cn(
                  'px-3 pb-1 text-[9px] font-bold tracking-widest uppercase transition-colors duration-500',
                  theme.sectionLabel,
                )}
              >
                {t(`sections.${group.sectionKey}`, {
                  defaultValue: humanizeNavKey(group.sectionKey),
                })}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarLink
                  key={navId(item)}
                  item={item}
                  external={external}
                  collapsed={collapsed}
                  isActive={navId(item) === activeNavId}
                  onNavigate={onNavigate}
                  badge={badgeForItem(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          'relative z-10 space-y-1 border-t border-white/10 bg-gradient-to-t from-black/25 to-transparent backdrop-blur-sm',
          collapsed ? 'px-2 py-3' : 'px-3 py-3',
        )}
      >
        {footer.map((item) => (
          <SidebarLink
            key={navId(item)}
            item={item}
            external={external}
            collapsed={collapsed}
            isActive={navId(item) === activeNavId}
            onNavigate={onNavigate}
            badge={badgeForItem(item)}
          />
        ))}
      </div>
    </aside>
  )
}
