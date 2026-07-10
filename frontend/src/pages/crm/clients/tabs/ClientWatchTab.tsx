import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  Pause,
  Play,
  Plug,
  Plus,
  Trash2,
} from 'lucide-react'
import { CreateWatchProfileDrawer } from '@/components/watch/CreateWatchProfileDrawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { ReportPanel } from '@/components/reports/report-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useScanEpoForClient } from '@/features/registry/hooks/useRegistry'
import {
  useUpdateWatchProfileStatus,
  useWatchProfiles,
} from '@/features/watch/hooks/useWatch'
import {
  formatNiceClasses,
  formatWatchJurisdictions,
  watchProfileStatusLabel,
  WATCH_PROFILE_STATUS_VARIANT,
} from '@/features/watch/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { ClientTabContext } from '../ClientLayout'

export function ClientWatchTab() {
  const { t } = useTranslation('watch')
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data, isLoading } = useWatchProfiles(clientId)
  const updateStatus = useUpdateWatchProfileStatus()
  const scanEpo = useScanEpoForClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [epoBanner, setEpoBanner] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)

  const profiles = data?.items ?? []
  const activeCount = profiles.filter((p) => p.status === 'active').length

  const handleScanEpo = async () => {
    setEpoBanner(null)
    try {
      const result = await scanEpo.mutateAsync(clientId)
      if (!result.success) {
        setEpoBanner({
          tone: 'error',
          message: result.message || t('clientTab.epoScanFailed'),
        })
        return
      }
      setEpoBanner({
        tone: 'success',
        message:
          result.message ||
          t('clientTab.epoScanSuccess', {
            alerts: result.alertsCreated,
            profiles: result.profilesScanned,
          }),
      })
    } catch (err) {
      setEpoBanner({
        tone: 'error',
        message: getApiErrorMessage(err, t('clientTab.epoScanFailed')),
      })
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('clientTab.loading')}</p>
  }

  return (
    <div className="space-y-6">
      <ReportPanel>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Eye className="size-4" />
              <h2 className="font-serif text-lg font-semibold">{t('clientTab.title')}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t('clientTab.description')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PermissionGate resource="registry" action="read">
              <Button
                size="sm"
                variant="outline"
                disabled={scanEpo.isPending || activeCount === 0}
                onClick={() => void handleScanEpo()}
              >
                {scanEpo.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plug className="size-4" />
                )}
                {scanEpo.isPending
                  ? t('clientTab.epoScanning')
                  : t('clientTab.epoScan')}
              </Button>
            </PermissionGate>
            <PermissionGate resource="matter" action="create">
              <Button size="sm" onClick={() => setDrawerOpen(true)}>
                <Plus className="size-4" />
                {t('clientTab.add')}
              </Button>
            </PermissionGate>
          </div>
        </div>

        {epoBanner && (
          <div
            className={cn(
              'mb-4 flex flex-wrap items-start gap-2 rounded-lg border px-3 py-2 text-sm',
              epoBanner.tone === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-900'
                : 'border-destructive/30 bg-destructive/5 text-destructive',
            )}
          >
            {epoBanner.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <p>{epoBanner.message}</p>
              {epoBanner.tone === 'success' && (
                <Link
                  to="/watch-alerts"
                  className="text-xs font-medium underline underline-offset-2"
                >
                  {t('clientTab.viewAlerts')}
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{profiles.length}</strong> {t('table.profiles')}
          </span>
          <span>·</span>
          <span>
            <strong className="text-foreground">{activeCount}</strong> {t('profileStatus.active')}
          </span>
        </div>
      </ReportPanel>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>{t('table.mark')}</TableHead>
              <TableHead>{t('table.jurisdiction')}</TableHead>
              <TableHead>{t('table.classes')}</TableHead>
              <TableHead>{t('table.frequency')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  {t('clientTab.empty')}
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((profile) => (
                <TableRow key={profile.id} className="group">
                  <TableCell>
                    <div className="font-medium">{profile.markText}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatWatchJurisdictions(profile.jurisdictions)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatNiceClasses(profile.niceClasses)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t(`frequency.${profile.frequency}`)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={WATCH_PROFILE_STATUS_VARIANT[profile.status]}>
                      {watchProfileStatusLabel(profile.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <PermissionGate resource="matter" action="update">
                      <div className="flex justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                        {profile.status === 'active' ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title={t('clientTab.pause')}
                            onClick={() =>
                              void updateStatus.mutateAsync({ id: profile.id, status: 'paused' })
                            }
                          >
                            <Pause className="size-4" />
                          </Button>
                        ) : profile.status === 'paused' ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title={t('clientTab.resume')}
                            onClick={() =>
                              void updateStatus.mutateAsync({ id: profile.id, status: 'active' })
                            }
                          >
                            <Play className="size-4" />
                          </Button>
                        ) : null}
                        {profile.status !== 'archived' ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title={t('clientTab.archive')}
                            onClick={() =>
                              void updateStatus.mutateAsync({ id: profile.id, status: 'archived' })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateWatchProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        clientId={clientId}
      />
    </div>
  )
}
