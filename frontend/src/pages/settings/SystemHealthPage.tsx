import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, Server } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleGate } from '@/components/permissions/RoleGate'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type CheckResult = { ok: boolean; latencyMs: number; error?: string }

type DetailedHealth = {
  status: 'ok' | 'degraded'
  checkedAt: string
  checks: {
    database: CheckResult
    redis: CheckResult
    storage: CheckResult
  }
}

export function SystemHealthPage() {
  const { t } = useTranslation('settings')
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => apiClient.get<DetailedHealth>('/health/detailed'),
    refetchInterval: 30_000,
  })

  const checks = data
    ? [
        { key: 'database', label: t('systemHealth.database'), ...data.checks.database },
        { key: 'redis', label: t('systemHealth.redis'), ...data.checks.redis },
        { key: 'storage', label: t('systemHealth.storage'), ...data.checks.storage },
      ]
    : []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/settings" className="hover:text-foreground">
              {t('title')}
            </Link>
            <span className="mx-2">/</span>
            {t('systemHealth.title')}
          </p>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">
            {t('systemHealth.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('systemHealth.subtitle')}</p>
        </div>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => void refetch()}
        >
          {isFetching ? t('systemHealth.refreshing') : t('systemHealth.refresh')}
        </button>
      </div>

      <RoleGate
        roles={['managing_partner', 'it_admin']}
        fallback={
          <p className="text-sm text-muted-foreground">{t('systemHealth.noPermission')}</p>
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('systemHealth.loading')}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{t('systemHealth.error')}</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Server className="size-4 text-primary" />
              <span className="text-sm font-medium">{t('systemHealth.overall')}</span>
              <Badge variant={data?.status === 'ok' ? 'success' : 'destructive'}>
                {data?.status === 'ok'
                  ? t('systemHealth.statusOk')
                  : t('systemHealth.statusDegraded')}
              </Badge>
              {data?.checkedAt ? (
                <span className="text-xs text-muted-foreground">
                  {new Date(data.checkedAt).toLocaleString()}
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {checks.map((check) => (
                <Card key={check.key} className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{check.label}</CardTitle>
                    <CardDescription>
                      {check.latencyMs} ms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={cn(
                        'flex items-start gap-2 text-sm',
                        check.ok ? 'text-emerald-700' : 'text-destructive',
                      )}
                    >
                      {check.ok ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                      ) : (
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      )}
                      <span>
                        {check.ok
                          ? t('systemHealth.checkOk')
                          : check.error || t('systemHealth.checkFailed')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </RoleGate>
    </div>
  )
}
