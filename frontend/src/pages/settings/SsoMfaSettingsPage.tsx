import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Pencil, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RoleGate } from '@/components/permissions/RoleGate'
import {
  useSsoMfaSettings,
  useUpsertSsoMfaSettings,
} from '@/features/settings/useSsoMfaSettings'
import type {
  SsoCredentialSource,
  UpsertSsoMfaSettingsInput,
} from '@/features/settings/sso-mfa-api'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type SaveSection = 'microsoft' | 'google' | 'mfa'

function maskSecret(lastFour: string | null | undefined, configured: boolean): string {
  if (!configured) return '—'
  return lastFour ? `••••••••${lastFour}` : '••••••••'
}

function sourceBadgeVariant(source: SsoCredentialSource | undefined) {
  return source && source !== 'none' ? ('success' as const) : ('secondary' as const)
}

function sourceLabel(
  source: SsoCredentialSource | undefined,
  t: (key: string) => string,
): string {
  if (source === 'database') return t('ssoMfa.sourceDatabase')
  if (source === 'env') return t('ssoMfa.sourceEnv')
  return t('ssoMfa.sourceNone')
}

export function SsoMfaSettingsPage() {
  const { t } = useTranslation('settings')
  const { data, isLoading } = useSsoMfaSettings()
  const upsert = useUpsertSsoMfaSettings()

  const [msClientId, setMsClientId] = useState('')
  const [msClientSecret, setMsClientSecret] = useState('')
  const [msTenantId, setMsTenantId] = useState('common')
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [requireMfa, setRequireMfa] = useState(false)
  const [editingMicrosoft, setEditingMicrosoft] = useState(false)
  const [editingGoogle, setEditingGoogle] = useState(false)
  const [savingSection, setSavingSection] = useState<SaveSection | null>(null)
  const [banner, setBanner] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)

  useEffect(() => {
    if (!data) return
    setMsClientId(data.microsoft.clientId ?? '')
    setMsTenantId(data.microsoft.tenantId || 'common')
    setGoogleClientId(data.google.clientId ?? '')
    setRequireMfa(data.mfa.requireInternal)
  }, [data])

  const msConfigured = data?.microsoft.source !== 'none'
  const googleConfigured = data?.google.source !== 'none'
  const showMicrosoftForm = editingMicrosoft || !msConfigured
  const showGoogleForm = editingGoogle || !googleConfigured

  const saveSection = async (
    section: SaveSection,
    payload: UpsertSsoMfaSettingsInput,
    successKey: string,
  ) => {
    setBanner(null)
    setSavingSection(section)
    try {
      await upsert.mutateAsync(payload)
      if (section === 'microsoft') {
        setMsClientSecret('')
        setEditingMicrosoft(false)
      }
      if (section === 'google') {
        setGoogleClientSecret('')
        setEditingGoogle(false)
      }
      setBanner({ tone: 'success', message: t(successKey) })
    } catch (err) {
      setBanner({
        tone: 'error',
        message: getApiErrorMessage(err, t('ssoMfa.saveFailed')),
      })
    } finally {
      setSavingSection(null)
    }
  }

  const handleSaveMicrosoft = () =>
    void saveSection(
      'microsoft',
      {
        microsoftClientId: msClientId.trim() || undefined,
        microsoftClientSecret: msClientSecret.trim() || undefined,
        microsoftTenantId: msTenantId,
      },
      'ssoMfa.microsoft.saveSuccess',
    )

  const handleSaveGoogle = () =>
    void saveSection(
      'google',
      {
        googleClientId: googleClientId.trim() || undefined,
        googleClientSecret: googleClientSecret.trim() || undefined,
      },
      'ssoMfa.google.saveSuccess',
    )

  const handleSaveMfa = () =>
    void saveSection(
      'mfa',
      { requireMfaForInternal: requireMfa },
      'ssoMfa.mfa.saveSuccess',
    )

  const startEditMicrosoft = () => {
    setMsClientId(data?.microsoft.clientId ?? '')
    setMsTenantId(data?.microsoft.tenantId || 'common')
    setMsClientSecret('')
    setEditingMicrosoft(true)
  }

  const cancelEditMicrosoft = () => {
    setMsClientId(data?.microsoft.clientId ?? '')
    setMsTenantId(data?.microsoft.tenantId || 'common')
    setMsClientSecret('')
    setEditingMicrosoft(false)
  }

  const startEditGoogle = () => {
    setGoogleClientId(data?.google.clientId ?? '')
    setGoogleClientSecret('')
    setEditingGoogle(true)
  }

  const cancelEditGoogle = () => {
    setGoogleClientId(data?.google.clientId ?? '')
    setGoogleClientSecret('')
    setEditingGoogle(false)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/settings" className="hover:text-foreground">
            {t('title')}
          </Link>
          <span className="mx-2">/</span>
          {t('ssoMfa.title')}
        </p>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {t('ssoMfa.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('ssoMfa.subtitle')}</p>
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

      <RoleGate
        roles={['managing_partner', 'it_admin']}
        fallback={
          <p className="text-sm text-muted-foreground">{t('ssoMfa.noPermission')}</p>
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('ssoMfa.loading')}</p>
        ) : (
          <>
            <Card className="shadow-none">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-4 text-primary" />
                    <CardTitle className="text-base">{t('ssoMfa.microsoft.title')}</CardTitle>
                  </div>
                  <Badge variant={sourceBadgeVariant(data?.microsoft.source)}>
                    {sourceLabel(data?.microsoft.source, t)}
                  </Badge>
                </div>
                <CardDescription>{t('ssoMfa.microsoft.description')}</CardDescription>
                {data?.microsoft.redirectUri && (
                  <p className="text-xs text-muted-foreground break-all">
                    {t('ssoMfa.redirectUri')}: {data.microsoft.redirectUri}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {showMicrosoftForm ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="ms-client-id">{t('ssoMfa.clientId')}</Label>
                        <Input
                          id="ms-client-id"
                          value={msClientId}
                          onChange={(e) => setMsClientId(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ms-secret">{t('ssoMfa.clientSecret')}</Label>
                        <Input
                          id="ms-secret"
                          type="password"
                          autoComplete="off"
                          placeholder={
                            data?.microsoft.clientSecretConfigured
                              ? t('ssoMfa.leaveBlankToKeep')
                              : undefined
                          }
                          value={msClientSecret}
                          onChange={(e) => setMsClientSecret(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ms-tenant">{t('ssoMfa.tenantId')}</Label>
                        <Input
                          id="ms-tenant"
                          value={msTenantId}
                          onChange={(e) => setMsTenantId(e.target.value)}
                          placeholder="common"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('ssoMfa.securityHint')}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingSection !== null}
                        onClick={handleSaveMicrosoft}
                      >
                        {savingSection === 'microsoft' ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {t('ssoMfa.microsoft.saveButton')}
                      </Button>
                      {msConfigured && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingSection !== null}
                          onClick={cancelEditMicrosoft}
                        >
                          {t('ssoMfa.cancelEdit')}
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">{t('ssoMfa.clientId')}</dt>
                        <dd className="mt-0.5 break-all font-medium">
                          {data?.microsoft.clientId || t('ssoMfa.configuredViaEnv')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t('ssoMfa.clientSecret')}</dt>
                        <dd className="mt-0.5 font-mono text-sm">
                          {maskSecret(
                            data?.microsoft.clientSecretLastFour,
                            Boolean(data?.microsoft.clientSecretConfigured) ||
                              data?.microsoft.source === 'env',
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t('ssoMfa.tenantId')}</dt>
                        <dd className="mt-0.5 font-medium">
                          {data?.microsoft.tenantId || 'common'}
                        </dd>
                      </div>
                    </dl>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={startEditMicrosoft}
                    >
                      <Pencil className="size-3.5" />
                      {t('ssoMfa.editButton')}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-4 text-primary" />
                    <CardTitle className="text-base">{t('ssoMfa.google.title')}</CardTitle>
                  </div>
                  <Badge variant={sourceBadgeVariant(data?.google.source)}>
                    {sourceLabel(data?.google.source, t)}
                  </Badge>
                </div>
                <CardDescription>{t('ssoMfa.google.description')}</CardDescription>
                {data?.google.redirectUri && (
                  <p className="text-xs text-muted-foreground break-all">
                    {t('ssoMfa.redirectUri')}: {data.google.redirectUri}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {showGoogleForm ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="google-client-id">{t('ssoMfa.clientId')}</Label>
                        <Input
                          id="google-client-id"
                          value={googleClientId}
                          onChange={(e) => setGoogleClientId(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="google-secret">{t('ssoMfa.clientSecret')}</Label>
                        <Input
                          id="google-secret"
                          type="password"
                          autoComplete="off"
                          placeholder={
                            data?.google.clientSecretConfigured
                              ? t('ssoMfa.leaveBlankToKeep')
                              : undefined
                          }
                          value={googleClientSecret}
                          onChange={(e) => setGoogleClientSecret(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('ssoMfa.securityHint')}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingSection !== null}
                        onClick={handleSaveGoogle}
                      >
                        {savingSection === 'google' ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {t('ssoMfa.google.saveButton')}
                      </Button>
                      {googleConfigured && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingSection !== null}
                          onClick={cancelEditGoogle}
                        >
                          {t('ssoMfa.cancelEdit')}
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">{t('ssoMfa.clientId')}</dt>
                        <dd className="mt-0.5 break-all font-medium">
                          {data?.google.clientId || t('ssoMfa.configuredViaEnv')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t('ssoMfa.clientSecret')}</dt>
                        <dd className="mt-0.5 font-mono text-sm">
                          {maskSecret(
                            data?.google.clientSecretLastFour,
                            Boolean(data?.google.clientSecretConfigured) ||
                              data?.google.source === 'env',
                          )}
                        </dd>
                      </div>
                    </dl>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={startEditGoogle}
                    >
                      <Pencil className="size-3.5" />
                      {t('ssoMfa.editButton')}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <CardTitle className="text-base">{t('ssoMfa.mfa.title')}</CardTitle>
                </div>
                <CardDescription>{t('ssoMfa.mfa.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={requireMfa}
                    onChange={(e) => setRequireMfa(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium">{t('ssoMfa.mfa.requireInternal')}</span>
                    <span className="mt-1 block text-muted-foreground">
                      {t('ssoMfa.mfa.requireInternalHint')}
                    </span>
                  </span>
                </label>
                <Button
                  type="button"
                  size="sm"
                  disabled={savingSection !== null}
                  onClick={handleSaveMfa}
                >
                  {savingSection === 'mfa' ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {t('ssoMfa.mfa.saveButton')}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </RoleGate>
    </div>
  )
}
