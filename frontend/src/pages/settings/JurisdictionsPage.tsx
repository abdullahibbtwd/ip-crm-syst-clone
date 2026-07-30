import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Plus } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { RoleGate } from '@/components/permissions/RoleGate'
import { SYSTEM_ROLES } from '@/lib/rbac'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useJurisdictions } from '@/features/jurisdictions/hooks/useJurisdictions'
import type { JurisdictionAutomationLevel } from '@/features/jurisdictions/types'
import { formatJurisdictionLabel } from '@/features/jurisdictions/utils'
import { JurisdictionDrawer } from './JurisdictionDrawer'

const AUTOMATION_VARIANT: Record<
  JurisdictionAutomationLevel,
  'success' | 'warning' | 'secondary'
> = {
  full: 'success',
  partial: 'warning',
  manual: 'secondary',
}

export function JurisdictionsPage() {
  const { t } = useTranslation('settings')
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    'all',
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: jurisdictions, isLoading, isError } = useJurisdictions({
    q: q.trim() || undefined,
  })

  const filtered = useMemo(() => {
    if (!jurisdictions) return []
    if (statusFilter === 'active') return jurisdictions.filter((j) => j.isActive)
    if (statusFilter === 'inactive')
      return jurisdictions.filter((j) => !j.isActive)
    return jurisdictions
  }, [jurisdictions, statusFilter])

  return (
    <RoleGate
      roles={[SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN]}
      fallback={
        <p className="text-sm text-muted-foreground">
          {t('jurisdictions.noPermission')}
        </p>
      }
    >
      <PermissionGate
        resource="deadline"
        action="read"
        fallback={
          <p className="text-sm text-muted-foreground">
            {t('jurisdictions.noPermission')}
          </p>
        }
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-2xl text-foreground md:text-3xl">
                {t('jurisdictions.title')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {t('jurisdictions.subtitle')}
              </p>
            </div>
            <PermissionGate resource="deadline" action="create">
              <Button type="button" onClick={() => setDrawerOpen(true)}>
                <Plus className="mr-1 size-4" />
                {t('jurisdictions.newJurisdiction')}
              </Button>
            </PermissionGate>
          </div>

          <div className="flex flex-wrap gap-3">
            <Input
              className="w-[240px]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('jurisdictions.searchPlaceholder')}
            />
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter((v as typeof statusFilter) ?? 'all')
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('jurisdictions.filters.all')}</SelectItem>
                <SelectItem value="active">
                  {t('jurisdictions.status.active')}
                </SelectItem>
                <SelectItem value="inactive">
                  {t('jurisdictions.status.inactive')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">
              {t('jurisdictions.loading')}
            </p>
          )}
          {isError && (
            <p className="text-sm text-destructive">{t('jurisdictions.loadError')}</p>
          )}

          {jurisdictions && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('jurisdictions.columns.jurisdiction')}</TableHead>
                  <TableHead>{t('jurisdictions.columns.type')}</TableHead>
                  <TableHead>{t('jurisdictions.columns.automation')}</TableHead>
                  <TableHead>{t('jurisdictions.columns.rules')}</TableHead>
                  <TableHead>{t('jurisdictions.columns.holidays')}</TableHead>
                  <TableHead>{t('jurisdictions.columns.status')}</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      {t('jurisdictions.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((j) => (
                    <TableRow
                      key={j.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/settings/jurisdictions/${j.code}`)}
                    >
                      <TableCell>
                        <Link
                          to={`/settings/jurisdictions/${j.code}`}
                          className="font-medium text-foreground hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {formatJurisdictionLabel(j)}
                        </Link>
                        {j.isPriority && (
                          <Badge variant="info" className="mt-1">
                            {t('jurisdictions.priority.badge')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t(`jurisdictions.type.${j.type}`)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={AUTOMATION_VARIANT[j.automationLevel]}>
                          {t(`jurisdictions.automation.${j.automationLevel}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{j.ruleCount}</TableCell>
                      <TableCell className="tabular-nums">
                        {j.holidayCount}
                      </TableCell>
                      <TableCell>
                        {j.isActive ? (
                          <Badge variant="success">
                            {t('jurisdictions.status.active')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {t('jurisdictions.status.inactive')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          <JurisdictionDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            jurisdiction={null}
            onCreated={(newCode) =>
              navigate(`/settings/jurisdictions/${newCode}?tab=rules`)
            }
          />
        </div>
      </PermissionGate>
    </RoleGate>
  )
}
