import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Plug,
  RefreshCw,
  Unplug,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useFetchMailboxEmails,
  useMailboxConnections,
  useMailboxProviders,
  useRevokeMailboxConnection,
} from '@/features/email-integration/hooks/useEmailIntegration'
import type { MailboxConnection, MailboxProviderId, MailboxProviderInfo } from '@/features/email-integration/types'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

const PROVIDER_ACCENTS: Record<MailboxProviderId, string> = {
  microsoft: 'border-blue-500/30 bg-blue-500/5',
  google: 'border-emerald-500/30 bg-emerald-500/5',
}

export function EmailIntegrationSettingsPage() {
  const { t } = useTranslation(['settings', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: providers } = useMailboxProviders()
  const { data: connections, isLoading } = useMailboxConnections()
  const revoke = useRevokeMailboxConnection()
  const fetchEmails = useFetchMailboxEmails()
  const [banner, setBanner] = useState<string | null>(null)

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return t('settings:emailIntegration.neverSynced')
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  }

  const providerLabel = (id: MailboxProviderId) =>
    id === 'microsoft'
      ? t('settings:emailIntegration.microsoft365')
      : t('settings:emailIntegration.googleWorkspace')

  const connectionByProvider = useMemo(() => {
    const map = new Map<MailboxProviderId, MailboxConnection>()
    for (const row of connections ?? []) {
      map.set(row.provider, row)
    }
    return map
  }, [connections])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) {
      setBanner(
        t('settings:emailIntegration.connectedSuccess', {
          provider: providerLabel(connected as MailboxProviderId),
        }),
      )
      setSearchParams({}, { replace: true })
    } else if (error) {
      setBanner(decodeURIComponent(error))
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, t])

  const connect = (provider: MailboxProviderId) => {
    window.location.href = `/api/email-integration/connect/${provider}`
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/settings" className="hover:text-foreground">
              {t('settings:emailIntegration.breadcrumbSettings')}
            </Link>
            <span className="mx-2">/</span>
            {t('settings:emailIntegration.title')}
          </p>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">
            {t('settings:emailIntegration.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('settings:emailIntegration.description')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={
            fetchEmails.isPending ||
            !(connections?.some((c) => c.status === 'active') ?? false)
          }
          onClick={() => fetchEmails.mutate()}
        >
          {fetchEmails.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t('settings:emailIntegration.fetchEmails')}
        </Button>
      </div>

      {banner ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          {banner}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {(providers ?? []).map((provider: MailboxProviderInfo) => {
          const connection = connectionByProvider.get(provider.id)
          return (
            <Card
              key={provider.id}
              className={cn('shadow-none', PROVIDER_ACCENTS[provider.id])}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{provider.name}</CardTitle>
                  {connection?.status === 'active' ? (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
                      {t('settings:emailIntegration.connected')}
                    </Badge>
                  ) : connection?.status === 'error' ? (
                    <Badge variant="outline" className="border-destructive/40 text-destructive">
                      {t('settings:emailIntegration.error')}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{t('settings:emailIntegration.notConnected')}</Badge>
                  )}
                </div>
                <CardDescription>
                  {provider.enabled
                    ? t('settings:emailIntegration.providerEnabledDescription')
                    : t('settings:emailIntegration.providerDisabledDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {provider.enabled && provider.redirectUri ? (
                  <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    {t('settings:emailIntegration.redirectUriHint', { provider: provider.name })}{' '}
                    <code className="break-all font-mono text-foreground">
                      {provider.redirectUri}
                    </code>
                  </p>
                ) : null}
                {connection ? (
                  <>
                    <p className="text-sm font-medium">{connection.emailAddress}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('settings:emailIntegration.lastSync', {
                        time: formatSyncTime(connection.lastSyncAt),
                      })}
                    </p>
                    {connection.lastSyncError ? (
                      <p className="flex items-start gap-2 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                        {connection.lastSyncError}
                      </p>
                    ) : null}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!provider.enabled}
                        onClick={() => connect(provider.id)}
                      >
                        <Plug className="size-4" />
                        {t('settings:emailIntegration.reconnect')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={revoke.isPending}
                        onClick={() => revoke.mutate(connection.id)}
                      >
                        <Unplug className="size-4" />
                        {t('settings:emailIntegration.disconnect')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    size="sm"
                    disabled={!provider.enabled}
                    onClick={() => connect(provider.id)}
                  >
                    <Mail className="size-4" />
                    {t('settings:emailIntegration.connect', { provider: provider.name })}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          {t('settings:emailIntegration.loadingConnections')}
        </p>
      ) : null}

      {fetchEmails.isSuccess ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" />
          {t('settings:emailIntegration.fetchSuccess', {
            limit: fetchEmails.data?.limit ?? 5,
            ingested: fetchEmails.data?.ingested ?? 0,
          })}
        </p>
      ) : null}
      {fetchEmails.isError ? (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(fetchEmails.error, t('settings:emailIntegration.fetchFailed'))}
        </p>
      ) : null}
    </div>
  )
}
