import {
  Languages,
  ListChecks,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useShell } from '@/features/shell/ShellProvider'
import { ROLE_LABELS, type SystemRole } from '@/lib/rbac'
import { NotificationsMenu, UserMenu } from './ShellMenus'

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

  const showRoleSwitcher = availableRoles.length > 1 && activeRole && onRoleChange

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:gap-3 md:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground"
      >
        <span className="truncate font-medium text-foreground">{breadcrumb}</span>
      </nav>

      <div className="flex shrink-0 items-center gap-0.5">
        {showLanguage && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Switch language"
            className="hidden sm:inline-flex"
            disabled
            title="Coming soon"
          >
            <Languages className="size-4" />
          </Button>
        )}

        <NotificationsMenu />

        {showTasks && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Tasks"
            className="hidden sm:inline-flex"
            disabled
            title="Coming soon"
          >
            <ListChecks className="size-4" />
          </Button>
        )}

        <div className="mx-1 hidden h-4 w-px bg-border sm:block" />

        {showRoleSwitcher && (
          <Select
            value={activeRole}
            onValueChange={(value) => onRoleChange(value as SystemRole)}
          >
            <SelectTrigger size="sm" className="hidden w-[150px] md:inline-flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
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
