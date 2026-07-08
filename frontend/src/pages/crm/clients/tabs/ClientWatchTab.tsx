import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Pause, Play, Plus, Sparkles, Trash2 } from 'lucide-react'
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
import {
  useCreateMockWatchAlert,
  useUpdateWatchProfileStatus,
  useWatchProfiles,
} from '@/features/watch/hooks/useWatch'
import {
  formatNiceClasses,
  formatWatchJurisdictions,
  watchProfileStatusLabel,
  WATCH_PROFILE_STATUS_VARIANT,
} from '@/features/watch/utils'
import type { ClientTabContext } from '../ClientLayout'

export function ClientWatchTab() {
  const { t } = useTranslation('watch')
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data, isLoading } = useWatchProfiles(clientId)
  const updateStatus = useUpdateWatchProfileStatus()
  const createMock = useCreateMockWatchAlert()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const profiles = data?.items ?? []
  const activeCount = profiles.filter((p) => p.status === 'active').length

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
            <PermissionGate resource="matter" action="create">
              <Button size="sm" variant="outline" onClick={() => void createMock.mutate({ clientId })}>
                <Sparkles className="size-4" />
                {t('clientTab.mockAlert')}
              </Button>
              <Button size="sm" onClick={() => setDrawerOpen(true)}>
                <Plus className="size-4" />
                {t('clientTab.add')}
              </Button>
            </PermissionGate>
          </div>
        </div>
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
