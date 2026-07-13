import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, Loader2, Pencil, Plug } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccountingIntegrationCard } from '@/components/integrations/AccountingIntegrationCard'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { RoleGate } from '@/components/permissions/RoleGate'
import {
  useClearEpoCredentials,
  useEpoCredentials,
  useTestEpoConnection,
  useUpsertEpoCredentials,
} from '@/features/registry/hooks/useRegistry'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

function maskSecret(lastFour: string | null | undefined, configured: boolean): string {
  if (!configured) return '—'
  return lastFour ? `••••••••${lastFour}` : '••••••••'
}

export function IntegrationsSettingsPage() {
  const { t } = useTranslation('settings')
  const { data: credentials, isLoading: credentialsLoading } = useEpoCredentials()
  const upsertEpo = useUpsertEpoCredentials()
  const clearEpo = useClearEpoCredentials()
  const testEpo = useTestEpoConnection()

  const [consumerKey, setConsumerKey] = useState('')
  const [consumerSecret, setConsumerSecret] = useState('')
  const [apiBaseUrl, setApiBaseUrl] = useState('')
  const [authUrl, setAuthUrl] = useState('')
  const [editing, setEditing] = useState(false)
  const [banner, setBanner] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)

  useEffect(() => {
    if (!credentials) return
    setApiBaseUrl(credentials.apiBaseUrl ?? '')
    setAuthUrl(credentials.authUrl ?? '')
  }, [credentials])

  const configured = credentials?.configured ?? false
  const source = credentials?.source ?? 'none'
  const saving = upsertEpo.isPending || clearEpo.isPending
  const hasDbSecrets = Boolean(
    credentials?.consumerKey.configured || credentials?.consumerSecret.configured,
  )
  const showForm = editing || !configured

  const handleSave = async () => {
    setBanner(null)
    try {
      await upsertEpo.mutateAsync({
        consumerKey: consumerKey.trim() || undefined,
        consumerSecret: consumerSecret.trim() || undefined,
        apiBaseUrl,
        authUrl,
      })
      setConsumerKey('')
      setConsumerSecret('')
      setEditing(false)
      setBanner({
        tone: 'success',
        message: t('integrations.epo.saveSuccess'),
      })
    } catch (err) {
      setBanner({
        tone: 'error',
        message: getApiErrorMessage(err, t('integrations.epo.saveFailed')),
      })
    }
  }

  const handleClear = async () => {
    setBanner(null)
    try {
      await clearEpo.mutateAsync()
      setConsumerKey('')
      setConsumerSecret('')
      setApiBaseUrl('')
      setAuthUrl('')
      setEditing(false)
      setBanner({
        tone: 'success',
        message: t('integrations.epo.clearSuccess'),
      })
    } catch (err) {
      setBanner({
        tone: 'error',
        message: getApiErrorMessage(err, t('integrations.epo.clearFailed')),
      })
    }
  }

  const handleTest = async () => {
    setBanner(null)
    try {
      const result = await testEpo.mutateAsync(undefined)
      if (result.success) {
        const title = result.patent.title?.trim() || result.patent.publicationNumber
        setBanner({
          tone: 'success',
          message: t('integrations.epo.testSuccess', { title }),
        })
      } else {
        setBanner({
          tone: 'error',
          message: result.error || t('integrations.epo.testFailed'),
        })
      }
    } catch (err) {
      setBanner({
        tone: 'error',
        message: getApiErrorMessage(err, t('integrations.epo.testFailed')),
      })
    }
  }

  const startEdit = () => {
    setApiBaseUrl(credentials?.apiBaseUrl ?? '')
    setAuthUrl(credentials?.authUrl ?? '')
    setConsumerKey('')
    setConsumerSecret('')
    setEditing(true)
  }

  const cancelEdit = () => {
    setApiBaseUrl(credentials?.apiBaseUrl ?? '')
    setAuthUrl(credentials?.authUrl ?? '')
    setConsumerKey('')
    setConsumerSecret('')
    setEditing(false)
  }

  const sourceLabel =
    source === 'database'
      ? t('integrations.epo.sourceDatabase')
      : source === 'env'
        ? t('integrations.epo.sourceEnv')
        : t('integrations.epo.sourceNone')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/settings" className="hover:text-foreground">
            {t('title')}
          </Link>
          <span className="mx-2">/</span>
          {t('integrations.title')}
        </p>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {t('integrations.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('integrations.subtitle')}
        </p>
      </div>

      {banner && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
            banner.tone === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-900'
              : 'border-destructive/30 bg-destructive/5 text-destructive',
          )}
        >
          {banner.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <p>{banner.message}</p>
        </div>
      )}

      <PermissionGate
        resource="registry"
        action="read"
        fallback={
          <p className="text-sm text-muted-foreground">
            {t('integrations.noPermission')}
          </p>
        }
      >
        <RoleGate
          roles={['managing_partner', 'it_admin']}
          fallback={
            <p className="text-sm text-muted-foreground">
              {t('integrations.noPermission')}
            </p>
          }
        >
          <Card className="shadow-none">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Plug className="size-4 text-primary" />
                  <CardTitle className="text-base">{t('integrations.epo.title')}</CardTitle>
                </div>
                {credentialsLoading ? (
                  <Badge variant="outline">{t('integrations.epo.statusLoading')}</Badge>
                ) : configured ? (
                  <Badge variant="success">{t('integrations.epo.statusConfigured')}</Badge>
                ) : (
                  <Badge variant="secondary">{t('integrations.epo.statusNotConfigured')}</Badge>
                )}
              </div>
              <CardDescription>{t('integrations.epo.description')}</CardDescription>
              {!credentialsLoading && (
                <p className="text-xs text-muted-foreground">
                  {t('integrations.epo.sourceLabel')}: {sourceLabel}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {credentialsLoading ? (
                <p className="text-sm text-muted-foreground">
                  {t('integrations.epo.statusLoading')}
                </p>
              ) : showForm ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="epo-key">{t('integrations.epo.consumerKey')}</Label>
                      <Input
                        id="epo-key"
                        type="password"
                        autoComplete="off"
                        placeholder={
                          credentials?.consumerKey.configured
                            ? t('integrations.epo.leaveBlankToKeep')
                            : t('integrations.epo.consumerKeyPlaceholder')
                        }
                        value={consumerKey}
                        onChange={(e) => setConsumerKey(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="epo-secret">{t('integrations.epo.consumerSecret')}</Label>
                      <Input
                        id="epo-secret"
                        type="password"
                        autoComplete="off"
                        placeholder={
                          credentials?.consumerSecret.configured
                            ? t('integrations.epo.leaveBlankToKeep')
                            : t('integrations.epo.consumerSecretPlaceholder')
                        }
                        value={consumerSecret}
                        onChange={(e) => setConsumerSecret(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="epo-api">{t('integrations.epo.apiBaseUrl')}</Label>
                      <Input
                        id="epo-api"
                        value={apiBaseUrl}
                        onChange={(e) => setApiBaseUrl(e.target.value)}
                        placeholder="https://ops.epo.org/3.2/rest-services"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="epo-auth">{t('integrations.epo.authUrl')}</Label>
                      <Input
                        id="epo-auth"
                        value={authUrl}
                        onChange={(e) => setAuthUrl(e.target.value)}
                        placeholder="https://ops.epo.org/3.2/auth/accesstoken"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t('integrations.epo.securityHint')}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void handleSave()}
                    >
                      {upsertEpo.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      {t('integrations.epo.saveButton')}
                    </Button>
                    {configured && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={cancelEdit}
                      >
                        {t('integrations.epo.cancelEdit')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!configured || testEpo.isPending}
                      onClick={() => void handleTest()}
                    >
                      {testEpo.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      {testEpo.isPending
                        ? t('integrations.epo.testing')
                        : t('integrations.epo.testButton')}
                    </Button>
                    {hasDbSecrets && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        onClick={() => void handleClear()}
                      >
                        {t('integrations.epo.clearButton')}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">
                        {t('integrations.epo.consumerKey')}
                      </dt>
                      <dd className="mt-0.5 font-mono text-sm">
                        {credentials?.consumerKey.configured
                          ? maskSecret(
                              credentials.consumerKey.lastFour,
                              true,
                            )
                          : source === 'env'
                            ? t('integrations.epo.configuredViaEnv')
                            : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t('integrations.epo.consumerSecret')}
                      </dt>
                      <dd className="mt-0.5 font-mono text-sm">
                        {credentials?.consumerSecret.configured
                          ? maskSecret(
                              credentials.consumerSecret.lastFour,
                              true,
                            )
                          : source === 'env'
                            ? t('integrations.epo.configuredViaEnv')
                            : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t('integrations.epo.apiBaseUrl')}
                      </dt>
                      <dd className="mt-0.5 break-all font-medium">
                        {credentials?.apiBaseUrl ||
                          t('integrations.epo.defaultEndpoint')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t('integrations.epo.authUrl')}
                      </dt>
                      <dd className="mt-0.5 break-all font-medium">
                        {credentials?.authUrl ||
                          t('integrations.epo.defaultEndpoint')}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={startEdit}
                    >
                      <Pencil className="size-3.5" />
                      {t('integrations.epo.editButton')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={testEpo.isPending}
                      onClick={() => void handleTest()}
                    >
                      {testEpo.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      {testEpo.isPending
                        ? t('integrations.epo.testing')
                        : t('integrations.epo.testButton')}
                    </Button>
                    {hasDbSecrets && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        onClick={() => void handleClear()}
                      >
                        {t('integrations.epo.clearButton')}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </RoleGate>
      </PermissionGate>

      <PermissionGate resource="invoice" action="read">
        <RoleGate roles={['managing_partner', 'finance', 'it_admin']}>
          <AccountingIntegrationCard
            provider="xero"
            title={t('integrations.accounting.xeroTitle')}
            description={t('integrations.accounting.xeroDescription')}
            orgLabel={t('integrations.accounting.xeroTenantId')}
          />
          <AccountingIntegrationCard
            provider="quickbooks"
            title={t('integrations.accounting.quickbooksTitle')}
            description={t('integrations.accounting.quickbooksDescription')}
            orgLabel={t('integrations.accounting.quickbooksRealmId')}
          />
        </RoleGate>
      </PermissionGate>
    </div>
  )
}
