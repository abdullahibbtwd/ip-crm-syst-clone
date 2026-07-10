import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, Loader2, Plug } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import {
  useEpoRegistryStatus,
  useTestEpoConnection,
} from '@/features/registry/hooks/useRegistry'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

export function IntegrationsSettingsPage() {
  const { t } = useTranslation('settings')
  const { data: status, isLoading: statusLoading } = useEpoRegistryStatus()
  const testEpo = useTestEpoConnection()
  const [banner, setBanner] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)

  const configured = status?.configured ?? false

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
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Plug className="size-4 text-primary" />
                <CardTitle className="text-base">{t('integrations.epo.title')}</CardTitle>
              </div>
              {statusLoading ? (
                <Badge variant="outline">{t('integrations.epo.statusLoading')}</Badge>
              ) : configured ? (
                <Badge variant="success">{t('integrations.epo.statusConfigured')}</Badge>
              ) : (
                <Badge variant="secondary">{t('integrations.epo.statusNotConfigured')}</Badge>
              )}
            </div>
            <CardDescription>{t('integrations.epo.description')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
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
            {!configured && (
              <p className="text-xs text-muted-foreground">
                {t('integrations.epo.envHint')}
              </p>
            )}
          </CardContent>
        </Card>
      </PermissionGate>
    </div>
  )
}
