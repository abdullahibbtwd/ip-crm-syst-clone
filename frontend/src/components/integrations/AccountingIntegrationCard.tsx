import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useAccountingCredentials,
  useClearAccountingCredentials,
  useEnqueueAccountingSync,
  useUpsertAccountingCredentials,
} from '@/features/invoices/hooks/useAccountingIntegrations'
import type { AccountingSyncProvider } from '@/features/invoices/accounting-integrations-api'
import { getApiErrorMessage } from '@/lib/api-client'

type Props = {
  provider: AccountingSyncProvider
  title: string
  description: string
  orgLabel: string
}

function maskSecret(lastFour: string | null | undefined, configured: boolean): string {
  if (!configured) return '—'
  return lastFour ? `••••••••${lastFour}` : '••••••••'
}

export function AccountingIntegrationCard({
  provider,
  title,
  description,
  orgLabel,
}: Props) {
  const { t } = useTranslation('settings')
  const { data, isLoading } = useAccountingCredentials(provider)
  const upsert = useUpsertAccountingCredentials(provider)
  const clear = useClearAccountingCredentials(provider)
  const sync = useEnqueueAccountingSync(provider)

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [orgId, setOrgId] = useState('')
  const [editing, setEditing] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null,
  )

  useEffect(() => {
    if (!data) return
    setOrgId(data.orgId ?? '')
    setClientId(data.clientId.value ?? '')
  }, [data])

  const configured = data?.configured ?? false
  const showForm = editing || !configured
  const busy = upsert.isPending || clear.isPending || sync.isPending

  const handleSave = async () => {
    setBanner(null)
    try {
      await upsert.mutateAsync({
        clientId: clientId.trim() || undefined,
        clientSecret: clientSecret.trim() || undefined,
        accessToken: accessToken.trim() || undefined,
        orgId,
      })
      setClientSecret('')
      setAccessToken('')
      setEditing(false)
      setBanner({
        tone: 'success',
        message: t('integrations.accounting.saveSuccess'),
      })
    } catch (err) {
      setBanner({
        tone: 'error',
        message: getApiErrorMessage(err, t('integrations.accounting.saveFailed')),
      })
    }
  }

  const handleClear = async () => {
    setBanner(null)
    try {
      await clear.mutateAsync()
      setClientId('')
      setClientSecret('')
      setAccessToken('')
      setOrgId('')
      setEditing(false)
      setBanner({
        tone: 'success',
        message: t('integrations.accounting.clearSuccess'),
      })
    } catch (err) {
      setBanner({
        tone: 'error',
        message: getApiErrorMessage(err, t('integrations.accounting.clearFailed')),
      })
    }
  }

  const handleSync = async () => {
    setBanner(null)
    try {
      const result = await sync.mutateAsync()
      setBanner({ tone: 'success', message: result.message })
    } catch (err) {
      setBanner({
        tone: 'error',
        message: getApiErrorMessage(err, t('integrations.accounting.syncFailed')),
      })
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant={configured ? 'success' : 'secondary'} className="normal-case">
            {configured
              ? t('integrations.accounting.statusConfigured')
              : t('integrations.accounting.statusNotConfigured')}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {banner ? (
          <p
            className={
              banner.tone === 'success' ? 'text-sm text-emerald-700' : 'text-sm text-destructive'
            }
          >
            {banner.message}
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('integrations.accounting.loading')}</p>
        ) : showForm ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${provider}-client-id`}>
                {t('integrations.accounting.clientId')}
              </Label>
              <Input
                id={`${provider}-client-id`}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${provider}-client-secret`}>
                {t('integrations.accounting.clientSecret')}
              </Label>
              <Input
                id={`${provider}-client-secret`}
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={
                  data?.clientSecret.configured
                    ? t('integrations.accounting.leaveBlankToKeep')
                    : undefined
                }
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${provider}-access-token`}>
                {t('integrations.accounting.accessToken')}
              </Label>
              <Input
                id={`${provider}-access-token`}
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={
                  data?.accessToken.configured
                    ? t('integrations.accounting.leaveBlankToKeep')
                    : undefined
                }
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${provider}-org-id`}>{orgLabel}</Label>
              <Input
                id={`${provider}-org-id`}
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={busy} onClick={() => void handleSave()}>
                {upsert.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {t('integrations.accounting.saveButton')}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                >
                  {t('integrations.accounting.cancelEdit')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t('integrations.accounting.accessToken')}</dt>
                <dd>{maskSecret(data?.accessToken.lastFour, Boolean(data?.accessToken.configured))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{orgLabel}</dt>
                <dd className="font-mono text-xs">{data?.orgId || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('integrations.accounting.lastSync')}</dt>
                <dd>
                  {data?.lastSyncAt
                    ? new Date(data.lastSyncAt).toLocaleString()
                    : t('integrations.accounting.neverSynced')}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy || !configured}
                onClick={() => void handleSync()}
              >
                {sync.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {t('integrations.accounting.syncNow')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                {t('integrations.accounting.editButton')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void handleClear()}
              >
                {t('integrations.accounting.clearButton')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
