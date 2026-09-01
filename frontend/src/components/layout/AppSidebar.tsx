import type { NavItem, NavSection } from '@/config/role-views'
import { navId, splitNavPath } from '@/features/shell/nav-utils'
import { useShell } from '@/features/shell/ShellProvider'
import {
  useFirmTodayDeadlineCount,
  useMyTodayDeadlineCount,
} from '@/features/deadlines/hooks/useDeadlines'
import { useIntakePendingCount } from '@/features/intake/hooks/useIntake'
import { useMatterShelfCounts } from '@/features/matters/hooks/useMatters'
import type { MatterShelfCounts } from '@/features/matters/api'
import { useWatchNewCount } from '@/features/watch/hooks/useWatch'
import { DueTodayCountBadge } from '@/components/deadlines/DueTodayBadge'
import { usePermission } from '@/hooks/usePermission'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
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

/** Soft total pill — not the deadline warning orange. */
function NavTotalBadge({
  count,
  collapsed,
  label = 'total',
}: {
  count: number
  collapsed?: boolean
  label?: string
}) {
  const countLabel = count > 999 ? '999+' : String(count)

  if (collapsed) {
    return (
      <span
        className="absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[9px] font-semibold tabular-nums text-white/90"
        aria-label={`${count} ${label}`}
      >
        {countLabel}
      </span>
    )
  }

  return (
    <span
      className="ml-auto flex min-h-5 min-w-5 items-center justify-center rounded-full bg-white/12 px-1.5 text-[10px] font-medium tabular-nums text-white/65"
      aria-label={`${count} ${label}`}
    >
      {countLabel}
    </span>
  )
}

function matterShelfCountForPath(
  path: string | undefined,
  counts: MatterShelfCounts | undefined,
): number | null {
  if (!path || !counts) return null
  const { pathname, search } = splitNavPath(path)
  if (pathname !== '/matters') return null

  const params = new URLSearchParams(search)
  if (params.get('archived') === '1') return counts.archived
  if (params.get('drafts') === '1') return counts.drafts
  if (params.get('group') === 'others') return counts.others

  const trademarkProcedure = params.get('trademarkProcedure')
  if (params.get('matterType') === 'trademark') {
    if (trademarkProcedure) {
      return counts.trademarkByProcedure?.[trademarkProcedure] ?? 0
    }
    return counts.trademarkByProcedure?.marks ?? counts.byType.trademark ?? 0
  }

  if (params.get('matterType') === 'patent' && params.get('spcOnly') === '1') {
    return counts.byType.spc ?? 0
  }

  const matterType = params.get('matterType')
  if (matterType) return counts.byType[matterType] ?? 0
  if (!search) return counts.all
  return null
}

function navTreeHasActiveItem(item: NavItem, activeNavId: string): boolean {
  if (navId(item) === activeNavId) return true
  return item.children?.some((child) => navTreeHasActiveItem(child, activeNavId)) ?? false
}

function useNavLabel(item: Pick<NavItem, 'labelKey' | 'labelNs'>) {
  const { t } = useTranslation(item.labelNs ?? 'nav')
  const key = item.labelNs && item.labelNs !== 'nav' ? item.labelKey : `items.${item.labelKey}`
  return t(key, {
    defaultValue: humanizeNavKey(item.labelKey.split('.').pop() ?? item.labelKey),
  })
}

function SidebarLink({
  item,
  external,
  isActive,
  collapsed,
  onNavigate,
  badge,
  totalCount,
  nested,
}: {
  item: NavItem
  external?: boolean
  isActive: boolean
  collapsed: boolean
  onNavigate: (id: string, path?: string) => void
  badge?: number
  /** Neutral inventory total (Working files shelves). */
  totalCount?: number | null
  nested?: boolean
}) {
  const theme = THEMES[external ? 'external' : 'internal']
  const Icon = item.icon
  const id = navId(item)
  const label = useNavLabel(item)
  const routeActive = isActive
  const isAlerts = item.path === '/alerts'
  const badgeLabel = isAlerts ? 'alerts' : undefined
  const badgeTone = isAlerts ? ('warning' as const) : undefined
  const showTotal =
    totalCount != null && !(badge && badge > 0)

  const className = cn(
    buttonVariants({ variant: 'ghost' }),
    'group relative h-9 w-full overflow-hidden rounded-xl text-[13px] font-normal',
    'text-white/70 transition-all duration-500 ease-out active:scale-[0.98]',
    'after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-r',
    'after:from-white/0 after:via-white/10 after:to-white/0',
    'after:-translate-x-full after:transition-transform after:duration-700 group-hover:after:translate-x-full',
    collapsed ? 'justify-center px-0' : 'justify-start gap-2.5',
    nested && !collapsed ? 'h-8 px-2.5 text-[12.5px]' : !collapsed && 'px-3',
    routeActive
      ? cn(
          external
            ? 'border border-white/15 bg-white/12 font-semibold text-white'
            : 'border border-white/10 bg-white/10 font-semibold text-white backdrop-blur-md',
          theme.accentGlow,
          'before:absolute before:left-0 before:top-1.5 before:h-5 before:w-1 before:rounded-r-full before:transition-all',
          theme.accentBar,
        )
      : external
        ? 'border border-transparent hover:bg-white/10 hover:text-white'
        : 'border border-transparent hover:border-white/5 hover:bg-white/5 hover:text-white',
    !collapsed && !routeActive && !nested && 'hover:translate-x-0.5',
  )

  const content = (
    <>
      <span className="relative z-10 shrink-0">
        <Icon
          className={cn(
            'transition-all duration-500 group-hover:scale-110',
            nested ? 'size-3.5' : 'size-4',
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
        {collapsed && showTotal ? (
          <NavTotalBadge count={totalCount!} collapsed label={label} />
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
          ) : showTotal ? (
            <span className="relative z-10">
              <NavTotalBadge count={totalCount!} label={label} />
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

function FlyoutNavSection({
  item,
  external,
  activeNavId,
  onNavigate,
  onClose,
  badgeForItem,
  shelfCounts,
}: {
  item: NavItem
  external?: boolean
  activeNavId: string
  onNavigate: (id: string, path?: string) => void
  onClose: () => void
  badgeForItem: (item: NavItem) => number
  shelfCounts?: MatterShelfCounts
}) {
  const label = useNavLabel(item)
  return (
    <div className="space-y-0.5">
      <p className="px-2.5 pt-2 pb-0.5 text-[10px] font-bold tracking-widest text-white/45 uppercase">
        {label}
      </p>
      {(item.children ?? []).map((sub) => (
        <SidebarLink
          key={navId(sub)}
          item={sub}
          external={external}
          collapsed={false}
          nested
          isActive={navId(sub) === activeNavId}
          onNavigate={(id, path) => {
            onClose()
            onNavigate(id, path)
          }}
          badge={badgeForItem(sub)}
          totalCount={matterShelfCountForPath(sub.path, shelfCounts)}
        />
      ))}
    </div>
  )
}

function NavGroup({
  item,
  external,
  collapsed,
  activeNavId,
  onNavigate,
  badgeForItem,
  shelfCounts,
  nested = false,
}: {
  item: NavItem
  external?: boolean
  collapsed: boolean
  activeNavId: string
  onNavigate: (id: string, path?: string) => void
  badgeForItem: (item: NavItem) => number
  shelfCounts?: MatterShelfCounts
  nested?: boolean
}) {
  const theme = THEMES[external ? 'external' : 'internal']
  const label = useNavLabel(item)
  const children = item.children ?? []
  const childActive = navTreeHasActiveItem(item, activeNavId)
  const [open, setOpen] = useState(childActive)
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const panelId = useId()
  const flyoutRef = useRef<HTMLDivElement>(null)
  const Icon = item.icon
  const parentTotal =
    navId(item) === 'matters-trademark-group'
      ? (shelfCounts?.byType.trademark ?? null)
      : children.some((child) => {
            const pathname = child.path?.split('?')[0]
            return pathname === '/matters'
          })
        ? (shelfCounts?.all ?? null)
        : null

  const renderChild = (child: NavItem) => {
    if (child.children?.length) {
      return (
        <NavGroup
          key={navId(child)}
          item={child}
          external={external}
          collapsed={false}
          nested
          activeNavId={activeNavId}
          onNavigate={onNavigate}
          badgeForItem={badgeForItem}
          shelfCounts={shelfCounts}
        />
      )
    }

    return (
      <SidebarLink
        key={navId(child)}
        item={child}
        external={external}
        collapsed={false}
        nested
        isActive={navId(child) === activeNavId}
        onNavigate={onNavigate}
        badge={badgeForItem(child)}
        totalCount={matterShelfCountForPath(child.path, shelfCounts)}
      />
    )
  }

  const renderFlyoutChild = (child: NavItem) => {
    if (child.children?.length) {
      return (
        <FlyoutNavSection
          key={navId(child)}
          item={child}
          external={external}
          activeNavId={activeNavId}
          onNavigate={onNavigate}
          onClose={() => setFlyoutOpen(false)}
          badgeForItem={badgeForItem}
          shelfCounts={shelfCounts}
        />
      )
    }

    return (
      <SidebarLink
        key={navId(child)}
        item={child}
        external={external}
        collapsed={false}
        nested
        isActive={navId(child) === activeNavId}
        onNavigate={(id, path) => {
          setFlyoutOpen(false)
          onNavigate(id, path)
        }}
        badge={badgeForItem(child)}
        totalCount={matterShelfCountForPath(child.path, shelfCounts)}
      />
    )
  }

  useEffect(() => {
    if (childActive) setOpen(true)
  }, [childActive])

  useEffect(() => {
    if (!flyoutOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!flyoutRef.current?.contains(event.target as Node)) {
        setFlyoutOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFlyoutOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [flyoutOpen])

  if (collapsed) {
    return (
      <div className="relative" ref={flyoutRef}>
        <Button
          type="button"
          variant="ghost"
          title={label}
          aria-label={label}
          aria-expanded={flyoutOpen}
          aria-haspopup="menu"
          onClick={() => setFlyoutOpen((v) => !v)}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'group relative h-10 w-full justify-center overflow-hidden rounded-xl px-0',
            'text-white/70 transition-all duration-500',
            childActive || flyoutOpen
              ? cn(
                  'border border-white/10 bg-white/10 text-white',
                  theme.accentGlow,
                  'before:absolute before:left-0 before:top-2.5 before:h-5 before:w-1 before:rounded-r-full',
                  theme.accentBar,
                )
              : 'border border-transparent hover:bg-white/5 hover:text-white',
          )}
        >
          <span className="relative">
            <Icon
              className={cn(
                'size-4 transition-all duration-500',
                childActive || flyoutOpen
                  ? cn('opacity-100', theme.iconActive)
                  : 'opacity-70 group-hover:opacity-100',
              )}
              aria-hidden
            />
            {parentTotal != null ? (
              <NavTotalBadge count={parentTotal} collapsed label={label} />
            ) : null}
          </span>
        </Button>

        {flyoutOpen ? (
          <div
            role="menu"
            className={cn(
              'absolute top-0 left-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-2xl border',
              'border-white/10 bg-brand-green/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl',
              'animate-in fade-in-0 zoom-in-95 slide-in-from-left-2 duration-200',
            )}
          >
            <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold tracking-widest text-white/40 uppercase">
              {label}
            </p>
            <div className="space-y-0.5">
              {children.map((child) => renderFlyoutChild(child))}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', nested && 'pt-0.5')}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl text-[13px]',
          'text-white/75 transition-all duration-400 ease-out',
          nested ? 'h-8 px-2.5 text-[12.5px]' : 'h-10 px-3',
          childActive
            ? 'bg-white/[0.07] font-semibold text-white'
            : 'hover:bg-white/5 hover:text-white',
        )}
      >
        <Icon
          className={cn(
            'shrink-0 transition-all duration-400',
            nested ? 'size-3.5' : 'size-4',
            childActive ? cn('opacity-100', theme.iconActive) : 'opacity-70 group-hover:opacity-100',
          )}
          aria-hidden
        />
        <span className="flex-1 truncate text-left tracking-wide">{label}</span>
        {parentTotal != null ? <NavTotalBadge count={parentTotal} label={label} /> : null}
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-white/40 transition-transform duration-300',
            open && 'rotate-180 text-white/70',
          )}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'relative space-y-0.5 border-l border-white/10 py-1',
              nested ? 'ml-2 pl-2' : 'ml-3 pl-2.5',
              'before:absolute before:inset-y-1 before:left-0 before:w-px',
              external
                ? 'before:bg-gradient-to-b before:from-emerald-400/40 before:via-white/10 before:to-transparent'
                : 'before:bg-gradient-to-b before:from-primary/50 before:via-white/10 before:to-transparent',
            )}
          >
            {children.map((child) => renderChild(child))}
          </div>
        </div>
      </div>
    </div>
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
  const { data: shelfCounts } = useMatterShelfCounts(canReadMatters)
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

  const badgeForItem = (navItem: NavItem) =>
    badgeForPath(
      navItem.path,
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
          ? 'border-emerald-950/40 bg-brand-green text-white shadow-[4px_0_24px_rgba(0,0,0,0.28)]'
          : 'border-brand-green/30 bg-gradient-to-b from-brand-green via-[#152e28] to-slate-950 shadow-[4px_0_32px_rgba(0,0,0,0.25)]',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent',
          external ? 'from-white/[0.04]' : 'from-primary/10',
        )}
        aria-hidden
      />

      <div
        className={cn(
          'relative z-10 flex items-center border-b',
          external ? 'border-white/12 bg-brand-green' : 'border-white/10 bg-white/[0.03] backdrop-blur-md',
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
          'relative z-10 flex-1 overflow-y-auto overflow-x-visible py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
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
              {group.items.map((item) =>
                item.children?.length ? (
                  <NavGroup
                    key={navId(item)}
                    item={item}
                    external={external}
                    collapsed={collapsed}
                    activeNavId={activeNavId}
                    onNavigate={onNavigate}
                    badgeForItem={badgeForItem}
                    shelfCounts={shelfCounts}
                  />
                ) : (
                  <SidebarLink
                    key={navId(item)}
                    item={item}
                    external={external}
                    collapsed={collapsed}
                    isActive={navId(item) === activeNavId}
                    onNavigate={onNavigate}
                    badge={badgeForItem(item)}
                    totalCount={matterShelfCountForPath(item.path, shelfCounts)}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          'relative z-10 space-y-1 border-t',
          external
            ? 'border-white/12 bg-[#15352e]'
            : 'border-white/10 bg-gradient-to-t from-black/25 to-transparent backdrop-blur-sm',
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
