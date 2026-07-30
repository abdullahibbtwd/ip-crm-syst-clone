import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Pencil } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { RoleGate } from '@/components/permissions/RoleGate'
import { SYSTEM_ROLES } from '@/lib/rbac'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DeadlineRulesPanel } from '@/features/deadline-rules/components/DeadlineRulesPanel'
import { HolidaysPanel } from '@/features/holidays/components/HolidaysPanel'
import { useJurisdictionByCode } from '@/features/jurisdictions/hooks/useJurisdictions'
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

type HubTab = 'overview' | 'rules' | 'holidays'

export function JurisdictionDetailPage() {
  const { t } = useTranslation('settings')
  const { code: codeParam } = useParams<{ code: string }>()
  const code = codeParam?.toUpperCase()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: HubTab =
    tabParam === 'rules' || tabParam === 'holidays' || tabParam === 'overview'
      ? tabParam
      : 'overview'

  const [editOpen, setEditOpen] = useState(false)
  const { data: jurisdiction, isLoading, isError } = useJurisdictionByCode(code)

  const setTab = (next: HubTab) => {
    setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true })
  }

  const tabs = useMemo(
    () =>
      [
        { id: 'overview' as const, label: t('jurisdictions.hub.tabs.overview') },
        {
          id: 'rules' as const,
          label: t('jurisdictions.hub.tabs.rules'),
          count: jurisdiction?.ruleCount,
        },
        {
          id: 'holidays' as const,
          label: t('jurisdictions.hub.tabs.holidays'),
          count: jurisdiction?.holidayCount,
        },
      ] as const,
    [t, jurisdiction?.ruleCount, jurisdiction?.holidayCount],
  )

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
          <div>
            <Link
              to="/settings/jurisdictions"
              className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              {t('jurisdictions.hub.back')}
            </Link>

            {isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('jurisdictions.loading')}
              </p>
            )}
            {isError && (
              <p className="text-sm text-destructive">
                {t('jurisdictions.loadError')}
              </p>
            )}

            {jurisdiction && (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-serif text-2xl text-foreground md:text-3xl">
                    {formatJurisdictionLabel(jurisdiction)}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={AUTOMATION_VARIANT[jurisdiction.automationLevel]}>
                      {t(
                        `jurisdictions.automation.${jurisdiction.automationLevel}`,
                      )}
                    </Badge>
                    <Badge variant="secondary">
                      {t(`jurisdictions.type.${jurisdiction.type}`)}
                    </Badge>
                    {jurisdiction.isPriority && (
                      <Badge variant="info">
                        {t('jurisdictions.priority.badge')}
                      </Badge>
                    )}
                    <Badge
                      variant={jurisdiction.isActive ? 'success' : 'secondary'}
                    >
                      {jurisdiction.isActive
                        ? t('jurisdictions.status.active')
                        : t('jurisdictions.status.inactive')}
                    </Badge>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    {t(
                      `jurisdictions.hub.automationHint.${jurisdiction.automationLevel}`,
                    )}
                  </p>
                </div>
                <PermissionGate resource="deadline" action="update">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="mr-1 size-3.5" />
                    {t('jurisdictions.hub.editOffice')}
                  </Button>
                </PermissionGate>
              </div>
            )}
          </div>

          {jurisdiction && (
            <>
              <div className="flex flex-wrap gap-1 border-b border-border pb-px">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={cn(
                      'relative px-3 py-2 text-sm transition-colors',
                      tab === item.id
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {item.label}
                    {'count' in item && item.count !== undefined && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({item.count})
                      </span>
                    )}
                    {tab === item.id && (
                      <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
                    )}
                  </button>
                ))}
              </div>

              {tab === 'overview' && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setTab('rules')}
                    className="rounded-lg border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('jurisdictions.hub.tabs.rules')}
                    </p>
                    <p className="mt-1 font-serif text-3xl text-foreground">
                      {jurisdiction.ruleCount}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('jurisdictions.hub.manageRules')}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('holidays')}
                    className="rounded-lg border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('jurisdictions.hub.tabs.holidays')}
                    </p>
                    <p className="mt-1 font-serif text-3xl text-foreground">
                      {jurisdiction.holidayCount}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('jurisdictions.hub.manageHolidays')}
                    </p>
                  </button>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('jurisdictions.columns.automation')}
                    </p>
                    <p className="mt-2">
                      <Badge
                        variant={AUTOMATION_VARIANT[jurisdiction.automationLevel]}
                      >
                        {t(
                          `jurisdictions.automation.${jurisdiction.automationLevel}`,
                        )}
                      </Badge>
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t(
                        `jurisdictions.hub.automationHint.${jurisdiction.automationLevel}`,
                      )}
                    </p>
                  </div>
                </div>
              )}

              {tab === 'rules' && (
                <DeadlineRulesPanel jurisdictionCode={jurisdiction.code} />
              )}
              {tab === 'holidays' && (
                <HolidaysPanel jurisdictionCode={jurisdiction.code} />
              )}

              <JurisdictionDrawer
                open={editOpen}
                onClose={() => setEditOpen(false)}
                jurisdiction={jurisdiction}
              />
            </>
          )}
        </div>
      </PermissionGate>
    </RoleGate>
  )
}
