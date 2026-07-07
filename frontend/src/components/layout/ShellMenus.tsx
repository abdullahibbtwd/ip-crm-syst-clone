import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, Languages, LogOut, Settings, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/features/notifications/hooks/useNotifications'
import type { Notification } from '@/features/notifications/types'
import { useShell } from '@/features/shell/ShellProvider'
import i18n from '@/i18n'
import { cn } from '@/lib/utils'

const LANGUAGES = [
  { code: 'en', labelKey: 'language.en' as const },
  { code: 'bg', labelKey: 'language.bg' as const },
] as const

export function LanguageMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation('common')
  const activeLanguage = i18n.language?.startsWith('bg') ? 'bg' : 'en'

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

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="hidden sm:inline-flex"
        aria-label={t('language.switch')}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <Languages className="size-4" />
      </Button>

      {open ? (
        <Card
          className="absolute top-full right-0 z-50 mt-1.5 w-44 gap-0 py-1 shadow-lg"
          role="listbox"
          aria-label={t('language.switch')}
        >
          <CardContent className="flex flex-col gap-0.5 p-1">
            {LANGUAGES.map((language) => {
              const selected = activeLanguage === language.code
              return (
                <Button
                  key={language.code}
                  type="button"
                  variant="ghost"
                  size="sm"
                  role="option"
                  aria-selected={selected}
                  className={cn('justify-between', selected && 'bg-muted/80')}
                  onClick={() => {
                    void i18n.changeLanguage(language.code)
                    setOpen(false)
                  }}
                >
                  {t(language.labelKey)}
                  {selected ? <Check className="size-3.5 text-primary" /> : <span className="size-3.5" />}
                </Button>
              )
            })}
          </CardContent>
        </Card>
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
        className="h-auto gap-2 px-1.5 py-1"
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        aria-expanded={userMenuOpen}
        aria-haspopup="menu"
      >
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
            external
              ? 'bg-primary/15 text-primary'
              : 'bg-foreground text-background',
          )}
        >
          {avatarInitials}
        </div>
        <div className="hidden min-w-0 text-left lg:block">
          <p className="truncate text-xs font-semibold">{userName}</p>
          <p className="truncate text-[10px] text-muted-foreground">{roleLabel}</p>
        </div>
      </Button>

      {userMenuOpen && (
        <Card className="absolute top-full right-0 z-50 mt-1.5 w-56 gap-0 py-0 shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="text-sm">{userName}</CardTitle>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
              {roleLabel}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-0.5 p-1.5">
            <Button variant="ghost" size="sm" className="justify-start" disabled>
              <User className="size-4" />
              Profile
            </Button>
            <Link
              to="/settings"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start')}
              onClick={() => setUserMenuOpen(false)}
            >
              <Settings className="size-4" />
              Settings
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-destructive hover:text-destructive"
              onClick={() => {
                setUserMenuOpen(false)
                onLogout()
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function NotificationsMenu() {
  const { notificationsOpen, setNotificationsOpen } = useShell()
  const ref = useRef<HTMLDivElement>(null)
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
        className="relative"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {notificationsOpen && (
        <Card className="absolute top-full right-0 z-50 mt-1.5 w-80 gap-0 py-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b">
            <CardTitle className="text-sm">Notifications</CardTitle>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                Mark all read
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto p-0 shell-scrollbar">
            {isLoading ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
            ) : isError ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">Could not load notifications.</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    void refetch()
                    void refetchUnread()
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <ul>
                {notifications.map((n: Notification) => {
                  const content = (
                    <>
                      <p
                        className={cn(
                          'text-sm',
                          n.unread ? 'font-medium' : 'text-muted-foreground',
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                      ) : null}
                    </>
                  )

                  return (
                    <li
                      key={n.id}
                      className={cn(
                        'border-b px-4 py-3 last:border-b-0',
                        n.unread && 'bg-primary/5',
                      )}
                    >
                      {n.linkUrl ? (
                        <Link
                          to={n.linkUrl}
                          className="block"
                          onClick={() => handleOpenItem(n.id, n.unread)}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="block w-full text-left"
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
