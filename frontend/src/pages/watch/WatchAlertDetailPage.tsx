import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, Eye, Scale, XCircle } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { ReportPanel } from '@/components/reports/report-ui'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { clientDisplayName } from '@/features/crm/utils'
import { jurisdictionLabel } from '@/features/deadlines/utils'
import {
  useAcceptWatchAlert,
  useRejectWatchAlert,
  useWatchAlert,
} from '@/features/watch/hooks/useWatch'
import {
  formatDetectedAt,
  formatNiceClasses,
  formatSimilarityScore,
  formatWatchJurisdictions,
  registrySourceLabel,
  watchAlertStatusLabel,
  WATCH_ALERT_STATUS_VARIANT,
} from '@/features/watch/utils'

export function WatchAlertDetailPage() {
  const { t } = useTranslation('watch')
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: alert, isLoading } = useWatchAlert(id)
  const reject = useRejectWatchAlert()
  const accept = useAcceptWatchAlert()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('detail.loading')}</p>
  }

  if (!alert) {
    return <p className="text-sm text-muted-foreground">{t('detail.notFound')}</p>
  }

  const isNew = alert.status === 'new'

  const handleReject = async () => {
    if (!window.confirm(t('detail.rejectConfirm'))) return
    await reject.mutateAsync(alert.id)
  }

  const handleAccept = async () => {
    if (!window.confirm(t('detail.acceptConfirm'))) return
    const result = await accept.mutateAsync(alert.id)
    navigate(`/matters/${result.matter.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/watch-alerts" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft className="size-4" />
          {t('detail.back')}
        </Link>
        <Badge variant={WATCH_ALERT_STATUS_VARIANT[alert.status]}>
          {watchAlertStatusLabel(alert.status)}
        </Badge>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-white via-primary/[0.03] to-brand-green/[0.05] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('detail.conflictingMark')}
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{alert.conflictingMark}</h1>
            <p className="text-sm text-muted-foreground">
              {t('detail.watchedMark')}:{' '}
              <span className="font-medium text-foreground">{alert.watchProfile?.markText}</span>
            </p>
          </div>
          {isNew ? (
            <PermissionGate resource="matter" action="update">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleReject()}
                  disabled={reject.isPending || accept.isPending}
                >
                  <XCircle className="size-4" />
                  {t('detail.reject')}
                </Button>
                <PermissionGate resource="matter" action="create">
                  <Button onClick={() => void handleAccept()} disabled={reject.isPending || accept.isPending}>
                    <CheckCircle2 className="size-4" />
                    {t('detail.accept')}
                  </Button>
                </PermissionGate>
              </div>
            </PermissionGate>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
      <ReportPanel>
        <div className="mb-4 flex items-center gap-2 text-destructive">
          <Scale className="size-4" />
          <h2 className="font-medium">Conflict details</h2>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t('detail.registrySource')}</dt>
              <dd className="mt-1 font-medium">{registrySourceLabel(alert.source)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('detail.jurisdiction')}</dt>
              <dd className="mt-1 font-medium">{jurisdictionLabel(alert.jurisdiction)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('detail.applicationNumber')}</dt>
              <dd className="mt-1 font-medium">{alert.applicationNumber ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('detail.similarity')}</dt>
              <dd className="mt-1 font-medium">
                {alert.similarityScore != null ? (
                  <Badge variant="secondary">{formatSimilarityScore(alert.similarityScore)}</Badge>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('detail.detectedAt')}</dt>
              <dd className="mt-1 font-medium">{formatDetectedAt(alert.detectedAt)}</dd>
            </div>
          </dl>
        </ReportPanel>

        <ReportPanel>
          <div className="mb-4 flex items-center gap-2 text-primary">
            <Eye className="size-4" />
            <h2 className="font-medium">{t('detail.profile')}</h2>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t('detail.client')}</dt>
              <dd className="mt-1">
                {alert.client ? (
                  <Link
                    to={`/clients/${alert.client.id}/watch`}
                    className="font-medium text-primary hover:underline"
                  >
                    {clientDisplayName(alert.client)}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('detail.jurisdiction')}</dt>
              <dd className="mt-1 font-medium">
                {formatWatchJurisdictions(alert.watchProfile?.jurisdictions ?? [])}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">{t('detail.niceClasses')}</dt>
              <dd className="mt-1 font-medium">
                {formatNiceClasses(alert.watchProfile?.niceClasses ?? [])}
              </dd>
            </div>
          </dl>
        </ReportPanel>
      </div>

      {alert.matter ? (
        <ReportPanel>
          <div className="mb-3 flex items-center gap-2 text-brand-green">
            <Scale className="size-4" />
            <h2 className="font-medium">{t('detail.linkedMatter')}</h2>
          </div>
          <Link
            to={`/matters/${alert.matter.id}`}
            className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
          >
            {alert.matter.title}
          </Link>
        </ReportPanel>
      ) : null}

      {alert.triagedBy ? (
        <p className="text-sm text-muted-foreground">
          {t('detail.triagedBy', { name: alert.triagedBy.fullName })}
        </p>
      ) : null}
    </div>
  )
}
