import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, Languages, LogOut, Settings, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/features/notifications/hooks/useNotifications'
import type { Notification } from '@/features/notifications/types'
import { useShell } from '@/features/shell/ShellProvider'
import i18n from '@/i18n'
import { APP_LOCALES, isSupportedLocale } from '@/i18n/locales'
import { updatePreferredLocale } from '@/features/auth/api'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/utils'

type MenuTheme = {
  accent: string
  accentGlow: string
  accentMuted: string
  panel: string
  panelGlow: string
  header: string
  headerTitle: string
  headerMuted: string
  item: string
  itemActive: string
  divider: string
  unreadRow: string
  badge: string
  iconTrigger: string
}

const MENU_THEMES: Record<'internal' | 'external', MenuTheme> = {
  internal: {
    accent: 'text-primary',
    accentGlow: 'shadow-[0_0_10px_rgba(232,98,26,0.85)]',
    accentMuted: 'text-primary/80',
    panel: 'border-brand-green/15 bg-white/90 backdrop-blur-xl',
    panelGlow: 'shadow-[0_16px_48px_rgba(26,60,52,0.16)]',
    header: 'border-brand-green/10 bg-gradient-to-r from-brand-green/[0.06] via-primary/[0.04] to-transparent',
    headerTitle: 'bg-gradient-to-r from-brand-green to-primary bg-clip-text text-transparent',
    headerMuted: 'text-muted-foreground',
    item: 'text-foreground/80 hover:border-brand-green/10 hover:bg-brand-green/[0.04] hover:text-foreground',
    itemActive:
      'border-primary/25 bg-primary/10 font-semibold text-brand-green shadow-sm shadow-primary/10',
    divider: 'via-brand-green/15',
    unreadRow: 'border-l-2 border-l-primary bg-primary/[0.06]',
    badge: 'bg-gradient-to-r from-primary to-orange-400',
    iconTrigger: 'text-brand-green/80',
  },
  external: {
    accent: 'text-emerald-300',
    accentGlow: 'shadow-[0_0_10px_rgba(52,211,153,0.45)]',
    accentMuted: 'text-emerald-200/90',
    panel: 'border-white/12 bg-[#122923] text-white',
    panelGlow: 'shadow-[0_16px_40px_rgba(0,0,0,0.45)]',
    header: 'border-white/10 bg-[#16372f]',
    headerTitle: 'text-emerald-200',
    headerMuted: 'text-white/55',
    item: 'text-white/80 hover:border-white/10 hover:bg-white/8 hover:text-white',
    itemActive:
      'border-emerald-400/35 bg-white/12 font-semibold text-white shadow-sm',
    divider: 'via-white/20',
    unreadRow: 'border-l-2 border-l-emerald-400 bg-emerald-500/15',
    badge: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    iconTrigger: 'text-emerald-200',
  },
}

function menuTheme(external?: boolean) {
  return MENU_THEMES[external ? 'external' : 'internal']
}

const sweepClasses =
  'after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/15 after:to-transparent after:-translate-x-full after:transition-transform after:duration-700 group-hover:after:translate-x-full'

function ShellDropdown({
  children,
  className,
  external,
  role,
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  className?: string
  external?: boolean
  role?: string
  'aria-label'?: string
}) {
  const theme = menuTheme(external)

  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={cn(
        'absolute top-full right-0 z-50 mt-2 overflow-hidden rounded-2xl border',
        'origin-top-right transition-all duration-500 ease-out',
        'animate-in fade-in zoom-in-95 slide-in-from-top-2',
        theme.panel,
        theme.panelGlow,
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent',
          external ? 'from-emerald-400/10' : 'from-primary/8',
        )}
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  )
}

function ShellMenuItem({
  children,
  className,
  external,
  active,
  onClick,
  disabled,
}: {
  children: ReactNode
  className?: string
  external?: boolean
  active?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  const theme = menuTheme(external)

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group relative h-9 w-full justify-start gap-2.5 overflow-hidden rounded-xl border border-transparent px-3',
        'transition-all duration-500 ease-out active:scale-[0.98]',
        sweepClasses,
        theme.item,
        active && theme.itemActive,
        disabled && 'opacity-50',
        className,
      )}
    >
      <span className="relative z-10 flex w-full items-center gap-2.5">{children}</span>
    </Button>
  )
}

export function LanguageMenu({ external }: { external?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const theme = menuTheme(external)
  const activeLanguage = isSupportedLocale(i18n.language) ? i18n.language : 'en'

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleLanguageChange = (code: string) => {
    void i18n.changeLanguage(code)
    setOpen(false)
    if (user) {
      updatePreferredLocale(code).catch(() => undefined)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(
          'group hidden sm:inline-flex transition-all duration-300',
          external && 'text-white hover:bg-white/10 hover:text-white',
          open && (external ? 'bg-white/10' : 'bg-brand-green/5'),
        )}
        aria-label={t('language.switch')}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <Languages
          className={cn(
            'size-4 transition-transform duration-300 group-hover:scale-110',
            external ? 'text-white/90' : open && 'text-primary',
          )}
        />
      </Button>

      {open ? (
        <ShellDropdown
          className="w-52 p-1.5"
          external={external}
          role="listbox"
          aria-label={t('language.switch')}
        >
          <p
            className={cn(
              'px-3 pb-1 pt-2 text-[9px] font-bold uppercase tracking-widest',
              theme.headerMuted,
            )}
          >
            {t('language.switch')}
          </p>
          <div className="flex flex-col gap-0.5 p-1 max-h-64 overflow-y-auto shell-scrollbar">
            {APP_LOCALES.map((locale) => {
              const selected = activeLanguage === locale.code
              return (
                <ShellMenuItem
                  key={locale.code}
                  external={external}
                  active={selected}
                  onClick={() => handleLanguageChange(locale.code)}
                >
                  <span className="flex-1 text-left">{locale.nativeName}</span>
                  {selected ? (
                    <Check className={cn('size-3.5', theme.accent)} />
                  ) : (
                    <span className="size-3.5" />
                  )}
                </ShellMenuItem>
              )
            })}
          </div>
        </ShellDropdown>
      ) : null}
    </div>
  )
}

type UserMenuProps = {
  userName: string
  roleLabel: string
  avatarInitials: string
  email: string
  external?: boolean
  onLogout: () => void
}

export function UserMenu({
  userName,
  roleLabel,
  avatarInitials,
  email,
  external,
  onLogout,
}: UserMenuProps) {
  const { userMenuOpen, setUserMenuOpen } = useShell()
  const ref = useRef<HTMLDivElement>(null)
  const theme = menuTheme(external)

  useEffect(() => {
    if (!userMenuOpen) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [userMenuOpen, setUserMenuOpen])

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'group h-auto gap-2 rounded-xl px-1.5 py-1 transition-all duration-500',
          external && 'text-white hover:bg-white/10 hover:text-white',
          userMenuOpen
            ? external
              ? 'bg-white/10'
              : 'bg-brand-green/5'
            : !external && 'hover:bg-accent/60',
        )}
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        aria-expanded={userMenuOpen}
        aria-haspopup="menu"
      >
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
            'shadow-md transition-transform duration-500 group-hover:scale-105',
            external
              ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-emerald-950 shadow-emerald-500/30'
              : 'bg-gradient-to-br from-primary to-orange-400 text-white shadow-primary/35',
            userMenuOpen && 'ring-2 ring-offset-1',
            userMenuOpen &&
              (external
                ? 'ring-emerald-300/60 ring-offset-brand-green'
                : 'ring-primary/40'),
          )}
        >
          {avatarInitials}
        </div>
        <div className="hidden min-w-0 text-left lg:block">
          <p className={cn('truncate text-xs font-semibold', external && 'text-white')}>
            {userName}
          </p>
          <p
            className={cn(
              'truncate text-[10px]',
              external ? 'text-white/65' : theme.headerMuted,
            )}
          >
            {roleLabel}
          </p>
        </div>
      </Button>

      {userMenuOpen && (
        <ShellDropdown className="w-60" external={external} role="menu">
          <div className={cn('border-b px-4 py-3.5', theme.header)}>
            <p className={cn('text-sm font-bold tracking-tight', theme.headerTitle)}>{userName}</p>
            <p className={cn('mt-0.5 truncate text-xs', theme.headerMuted)}>{email}</p>
            <span
              className={cn(
                'mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white',
                theme.badge,
                'shadow-sm',
                theme.accentGlow,
              )}
            >
              {roleLabel}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 p-1.5">
            <ShellMenuItem external={external} disabled>
              <User className={cn('size-4 shrink-0', theme.accentMuted)} />
              Profile
            </ShellMenuItem>
            <Link
              to="/settings"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'group relative h-9 w-full justify-start gap-2.5 overflow-hidden rounded-xl border border-transparent px-3',
                'transition-all duration-500 ease-out active:scale-[0.98]',
                sweepClasses,
                theme.item,
              )}
              onClick={() => setUserMenuOpen(false)}
            >
              <span className="relative z-10 flex items-center gap-2.5">
                <Settings className={cn('size-4 shrink-0', theme.accentMuted)} />
                Settings
              </span>
            </Link>
            <div className={cn('my-1 h-px bg-gradient-to-r from-transparent to-transparent', theme.divider)} />
            <ShellMenuItem
              external={external}
              className="text-destructive hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setUserMenuOpen(false)
                onLogout()
              }}
            >
              <LogOut className="size-4 shrink-0" />
              Sign out
            </ShellMenuItem>
          </div>
        </ShellDropdown>
      )}
    </div>
  )
}

export function NotificationsMenu({ external }: { external?: boolean }) {
  const { notificationsOpen, setNotificationsOpen } = useShell()
  const ref = useRef<HTMLDivElement>(null)
  const theme = menuTheme(external)
  const { data, isLoading, isError, refetch } = useNotifications(20)
  const { data: unreadData, refetch: refetchUnread } = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data?.items ?? []
  const unreadCount = unreadData?.count ?? 0

  useEffect(() => {
    if (!notificationsOpen) return
    void refetch()
    void refetchUnread()
  }, [notificationsOpen, refetch, refetchUnread])

  useEffect(() => {
    if (!notificationsOpen) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [notificationsOpen, setNotificationsOpen])

  const handleOpenItem = (id: string, unread: boolean) => {
    if (unread) markRead.mutate(id)
    setNotificationsOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={notificationsOpen}
        onClick={() => setNotificationsOpen(!notificationsOpen)}
        className={cn(
          'group relative transition-all duration-300',
          external && 'text-white hover:bg-white/10 hover:text-white',
          notificationsOpen && (external ? 'bg-white/10' : 'bg-brand-green/5'),
        )}
      >
        <Bell
          className={cn(
            'size-4 transition-transform duration-300 group-hover:scale-110',
            unreadCount > 0 ? theme.accent : external ? 'text-white/90' : undefined,
          )}
        />
        {unreadCount > 0 ? (
          <>
            <span
              className={cn(
                'absolute top-1.5 right-1.5 size-2 rounded-full animate-pulse',
                external ? 'bg-emerald-400' : 'bg-primary',
                theme.accentGlow,
              )}
              aria-hidden
            />
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white shadow-sm',
                theme.badge,
              )}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        ) : (
          <span
            className={cn(
              'absolute top-2 right-2 size-1.5 rounded-full opacity-40',
              external ? 'bg-emerald-400' : 'bg-primary',
            )}
            aria-hidden
          />
        )}
      </Button>

      {notificationsOpen && (
        <ShellDropdown className="w-80" external={external}>
          <div className={cn('flex items-center justify-between gap-2 border-b px-4 py-3', theme.header)}>
            <div>
              <p className={cn('text-sm font-bold', theme.headerTitle)}>
                {t('notifications.title')}
              </p>
              {unreadCount > 0 ? (
                <p className={cn('mt-0.5 text-[10px] font-medium uppercase tracking-wider', theme.accentMuted)}>
                  {unreadCount} {t('notifications.unread')}
                </p>
              ) : null}
            </div>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'h-auto rounded-lg px-2.5 py-1 text-xs transition-all duration-300',
                  external
                    ? 'text-emerald-400 hover:bg-white/10 hover:text-emerald-300'
                    : 'text-primary hover:bg-primary/10',
                )}
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                {t('notifications.markAllRead')}
              </Button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto p-1 shell-scrollbar">
            {isLoading ? (
              <p className={cn('px-4 py-8 text-center text-sm italic', theme.headerMuted)}>
                {t('loading.default')}
              </p>
            ) : isError ? (
              <div className="px-4 py-8 text-center">
                <p className={cn('text-sm', theme.headerMuted)}>
                  {t('notifications.couldNotLoad')}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn('mt-2 rounded-lg', theme.accent)}
                  onClick={() => {
                    void refetch()
                    void refetchUnread()
                  }}
                >
                  {t('actions.retry')}
                </Button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className={cn('mx-auto mb-2 size-8 opacity-20', theme.accent)} />
                <p className={cn('text-sm', theme.headerMuted)}>
                  {t('notifications.noNotificationsYet')}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5 p-1">
                {notifications.map((n: Notification) => {
                  const rowClass = cn(
                    'group relative overflow-hidden rounded-xl border border-transparent px-3 py-2.5',
                    'transition-all duration-500 ease-out hover:translate-x-0.5',
                    sweepClasses,
                    n.unread ? theme.unreadRow : theme.item,
                  )

                  const content = (
                    <div className="relative z-10">
                      <div className="flex items-start gap-2">
                        {n.unread ? (
                          <span
                            className={cn(
                              'mt-1.5 size-1.5 shrink-0 rounded-full animate-pulse',
                              external ? 'bg-emerald-400' : 'bg-primary',
                              theme.accentGlow,
                            )}
                            aria-hidden
                          />
                        ) : (
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-transparent" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'text-sm leading-snug',
                              n.unread ? 'font-semibold' : 'font-normal',
                              external
                                ? n.unread
                                  ? 'text-white'
                                  : 'text-white/60'
                                : n.unread
                                  ? 'text-brand-green'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {n.title}
                          </p>
                          {n.body ? (
                            <p className={cn('mt-0.5 text-xs leading-relaxed', theme.headerMuted)}>
                              {n.body}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )

                  return (
                    <li key={n.id}>
                      {n.linkUrl ? (
                        <Link
                          to={n.linkUrl}
                          className={rowClass}
                          onClick={() => handleOpenItem(n.id, n.unread)}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={cn(rowClass, 'w-full text-left')}
                          onClick={() => handleOpenItem(n.id, n.unread)}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </ShellDropdown>
      )}
    </div>
  )
}
