import type { NavItem, NavSection } from '@/config/role-views'
import { navId } from '@/features/shell/nav-utils'
import { useShell } from '@/features/shell/ShellProvider'
import {
  useFirmTodayDeadlineCount,
  useMyTodayDeadlineCount,
} from '@/features/deadlines/hooks/useDeadlines'
import { useIntakePendingCount } from '@/features/intake/hooks/useIntake'
import { DueTodayCountBadge } from '@/components/deadlines/DueTodayBadge'
import { usePermission } from '@/hooks/usePermission'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

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

function isPathActive(itemPath: string, pathname: string): boolean {
  if (itemPath === '/dashboard') return pathname === '/dashboard'
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

function badgeForPath(
  path: string | undefined,
  myCount: number,
  firmCount: number,
  intakeCount: number,
): number {
  if (!path) return 0
  if (path === '/deadlines/my') return myCount
  if (path === '/deadlines') return firmCount
  if (path === '/intake') return intakeCount
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
  const Icon = item.icon
  const id = navId(item)
  const label = t(`items.${item.labelKey}`)
  const location = useLocation()
  const routeActive = item.path ? isPathActive(item.path, location.pathname) : isActive

  const className = cn(
    buttonVariants({ variant: 'ghost' }),
    'group relative h-9 w-full text-[13px] font-normal transition-all duration-300 ease-out active:scale-[0.98] overflow-hidden rounded-md',
    collapsed ? 'justify-center px-0' : 'justify-start gap-2.5 px-3',
    !external && [
      'text-muted-foreground hover:text-foreground',
      routeActive
        ? cn(
            'bg-primary/10 font-semibold text-primary shadow-sm shadow-primary/5',
            'before:absolute before:top-2 before:h-5 before:w-1 before:rounded-r-full before:bg-primary before:transition-all',
            collapsed ? 'before:left-0' : 'before:left-0',
          )
        : 'hover:bg-accent/50',
      !collapsed && !routeActive && 'hover:translate-x-0.5',
    ],
    external && [
      'text-white/70 hover:text-white transition-all duration-200',
      routeActive
        ? cn(
            'bg-white/10 font-semibold text-white shadow-md shadow-black/10 backdrop-blur-md border border-white/10',
            'before:absolute before:left-0 before:top-2 before:h-5 before:w-1 before:rounded-r-full before:bg-emerald-400 before:shadow-[0_0_8px_rgba(52,211,153,0.8)]',
          )
        : 'hover:bg-white/5',
      !collapsed && !routeActive && 'hover:translate-x-0.5',
    ],
  )

  const content = (
    <>
      <span className="relative shrink-0">
        <Icon
          className={cn(
            'size-4 transition-transform duration-300 group-hover:scale-110',
            routeActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100',
            external && routeActive && 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]',
          )}
          aria-hidden
        />
        {collapsed && badge ? (
          <DueTodayCountBadge count={badge} collapsed external={external} />
        ) : null}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left tracking-wide">{label}</span>
          {badge ? (
            <DueTodayCountBadge count={badge} external={external} />
          ) : (
            <span
              className={cn(
                'ml-auto size-1.5 scale-0 rounded-full transition-transform duration-300 group-hover:scale-100',
                external ? 'bg-emerald-400/80 shadow-[0_0_6px_#10b981]' : 'bg-primary/80',
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
  const { sidebarCollapsed, toggleSidebarCollapsed } = useShell()
  const isLgUp = useIsLgUp()
  const collapsed = sidebarCollapsed && isLgUp
  const canReadDeadlines = usePermission('deadline', 'read')
  const canReadIntake = usePermission('intake', 'read')
  const { data: myToday } = useMyTodayDeadlineCount(canReadDeadlines)
  const { data: firmToday } = useFirmTodayDeadlineCount(canReadDeadlines)
  const { data: intakePending } = useIntakePendingCount(canReadIntake && !external)
  const myTodayCount = myToday?.count ?? 0
  const firmTodayCount = firmToday?.count ?? 0
  const intakePendingCount = intakePending?.count ?? 0

  const badgeForItem = (item: NavItem) =>
    badgeForPath(item.path, myTodayCount, firmTodayCount, intakePendingCount)

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[240px]',
        external
          ? 'border-white/10 bg-gradient-to-b from-brand-green via-brand-green/95 to-emerald-950 text-white shadow-[4px_0_24px_rgba(0,0,0,0.3)]'
          : 'border-border bg-gradient-to-b from-card to-background text-foreground shadow-sm',
      )}
    >
      <div
        className={cn(
          'flex items-center border-b backdrop-blur-sm',
          collapsed ? 'flex-col gap-2 px-2 py-3' : 'gap-3 px-4 py-4',
          external ? 'border-white/10 bg-white/[0.02]' : 'border-border/60 bg-muted/20',
        )}
      >
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm transition-transform duration-500 hover:rotate-6',
            external
              ? 'bg-gradient-to-tr from-emerald-400 to-teal-300 text-emerald-950 shadow-emerald-500/20'
              : 'bg-gradient-to-tr from-foreground to-neutral-700 text-background',
          )}
        >
          IP
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'truncate text-sm font-bold tracking-tight transition-colors',
                external ? 'text-white drop-shadow-sm' : 'text-foreground',
              )}
            >
              IP Consulting
            </p>
            <p
              className={cn(
                'text-[9px] font-bold tracking-widest uppercase opacity-80',
                external ? 'text-emerald-400' : 'text-primary',
              )}
            >
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
            'shrink-0',
            !collapsed && 'ml-auto',
            !isLgUp && 'hidden',
            external
              ? 'text-white/70 hover:bg-white/10 hover:text-white'
              : 'text-muted-foreground hover:text-foreground',
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
          'flex-1 overflow-y-auto py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          collapsed ? 'space-y-2 px-2' : 'space-y-4 px-3',
        )}
      >
        {nav.map((group) => (
          <div key={group.sectionKey} className="space-y-1">
            {!collapsed && (
              <p
                className={cn(
                  'px-3 pb-1 text-[9px] font-bold tracking-widest uppercase transition-colors duration-300',
                  external ? 'text-white/30' : 'text-muted-foreground/70',
                )}
              >
                {t(`sections.${group.sectionKey}`)}
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
          'space-y-1 border-t bg-gradient-to-t',
          collapsed ? 'px-2 py-3' : 'px-3 py-3',
          external
            ? 'border-white/10 from-black/20 to-transparent'
            : 'border-border/60 from-muted/10 to-transparent',
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
