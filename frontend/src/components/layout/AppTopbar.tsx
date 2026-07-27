import {
  ListChecks,
  Menu,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useShell } from '@/features/shell/ShellProvider'
import { roleLabel as getRoleLabel, type SystemRole } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import { LanguageMenu, NotificationsMenu, UserMenu } from './ShellMenus'
import { GlobalSearch } from './GlobalSearch'

type AppTopbarProps = {
  userName: string
  roleLabel: string
  avatarInitials: string
  email: string
  external?: boolean
  showLanguage?: boolean
  showTasks?: boolean
  availableRoles?: SystemRole[]
  activeRole?: SystemRole
  onRoleChange?: (role: SystemRole) => void
  onLogout: () => void
}

export function AppTopbar({
  userName,
  roleLabel,
  avatarInitials,
  email,
  external,
  showLanguage,
  showTasks,
  availableRoles = [],
  activeRole,
  onRoleChange,
  onLogout,
}: AppTopbarProps) {
  const { breadcrumb, sidebarOpen, setSidebarOpen } = useShell()
  const { t: tCommon } = useTranslation('common')
  const { t: tNav } = useTranslation('nav')

  const showRoleSwitcher = availableRoles.length > 1 && activeRole && onRoleChange
  const breadcrumbLabel = tNav(`items.${breadcrumb}`)

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3',
        'transition-all duration-500 md:gap-3 md:px-4',
        external
          ? 'border-brand-green/80 bg-brand-green text-white shadow-[0_2px_12px_rgba(0,0,0,0.18)]'
          : 'border-brand-green/10 bg-white/80 shadow-sm shadow-brand-green/5 backdrop-blur-xl',
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(
          'group lg:hidden',
          external && 'text-white hover:bg-white/10 hover:text-white',
        )}
        aria-label={sidebarOpen ? tCommon('nav.closeMenu') : tCommon('nav.openMenu')}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? (
          <X className="size-5 transition-transform duration-300 group-hover:scale-110" />
        ) : (
          <Menu className="size-5 transition-transform duration-300 group-hover:scale-110" />
        )}
      </Button>

      <nav
        aria-label={tCommon('nav.breadcrumb')}
        className="flex min-w-0 shrink items-center gap-2 text-xs md:max-w-[28%]"
      >
        <span
          className={cn(
            'hidden shrink-0 font-bold uppercase tracking-widest sm:inline',
            external ? 'text-emerald-200/90' : 'text-primary/70',
          )}
        >
          {external ? tCommon('clientPortal') : tCommon('crm')}
        </span>
        <span
          className={cn(
            'hidden h-3 w-px sm:block',
            external ? 'bg-white/25' : 'bg-brand-green/15',
          )}
          aria-hidden
        />
        <span
          className={cn(
            'truncate text-sm font-semibold tracking-tight',
            external
              ? 'text-white'
              : 'bg-gradient-to-r from-brand-green via-brand-green to-primary bg-clip-text text-transparent',
          )}
        >
          {breadcrumbLabel}
        </span>
      </nav>

      {!external ? <GlobalSearch /> : null}

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        {showLanguage ? <LanguageMenu external={external} /> : null}

        <NotificationsMenu external={external} />

        {showTasks && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={tCommon('tasks')}
            className="group hidden sm:inline-flex"
            disabled
            title={tCommon('comingSoon')}
          >
            <ListChecks className="size-4 transition-transform duration-300 group-hover:scale-110" />
          </Button>
        )}

        <div
          className={cn(
            'mx-1.5 hidden h-5 w-px sm:block',
            external ? 'bg-gradient-to-b from-transparent via-white/25 to-transparent' : 'bg-gradient-to-b from-transparent via-brand-green/20 to-transparent',
          )}
          aria-hidden
        />

        {showRoleSwitcher && (
          <Select
            value={activeRole}
            onValueChange={(value) => onRoleChange(value as SystemRole)}
          >
            <SelectTrigger
              size="sm"
              className={cn(
                'hidden w-[150px] border-transparent md:inline-flex',
                external
                  ? 'bg-white/10 text-white hover:bg-white/15'
                  : 'bg-brand-green/5 hover:bg-brand-green/8 backdrop-blur-sm',
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {getRoleLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <UserMenu
          userName={userName}
          roleLabel={roleLabel}
          avatarInitials={avatarInitials}
          email={email}
          external={external}
          onLogout={onLogout}
        />
      </div>
    </header>
  )
}
