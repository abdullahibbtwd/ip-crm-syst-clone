import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Link2, Unlink } from 'lucide-react'
import { LinkHoldingGroupClientDrawer } from '@/components/crm/LinkHoldingGroupClientDrawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useHoldingGroup,
  useSetClientHoldingGroup,
} from '@/features/crm/hooks/useHoldingGroups'
import { clientDisplayName } from '@/features/crm/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { getCountryLabel } from '@/lib/countries'

export function HoldingGroupDetailPage() {
  const { t } = useTranslation(['crm', 'common'])
  const { id = '' } = useParams()
  const { data, isLoading, isError } = useHoldingGroup(id)
  const setHoldingGroup = useSetClientHoldingGroup()
  const [linkDrawerOpen, setLinkDrawerOpen] = useState(false)
  const [unlinkError, setUnlinkError] = useState<string | null>(null)
  const [unlinkingClientId, setUnlinkingClientId] = useState<string | null>(null)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common:loading.default')}</p>
  }
  if (isError || !data) {
    return <p className="text-sm text-destructive">{t('holdingGroups.notFound')}</p>
  }

  const handleUnlink = async (clientId: string) => {
    setUnlinkError(null)
    setUnlinkingClientId(clientId)
    try {
      await setHoldingGroup.mutateAsync({
        clientId,
        holdingGroupId: null,
        holdingGroupIdForInvalidate: data.id,
      })
    } catch (err) {
      setUnlinkError(getApiErrorMessage(err, t('holdingGroups.unlinkFailed')))
    } finally {
      setUnlinkingClientId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl">{data.name}</h1>
          {data.country && (
            <p className="mt-1 text-sm text-muted-foreground">{getCountryLabel(data.country)}</p>
          )}
        </div>
        <Link to="/holding-groups" className={buttonVariants({ variant: 'outline' })}>
          {t('holdingGroups.allGroups')}
        </Link>
      </div>

      {data.description && (
        <Card className="shadow-none">
          <CardContent className="pt-4 text-sm text-muted-foreground">{data.description}</CardContent>
        </Card>
      )}

      <Card className="shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">{t('holdingGroups.clientsUnder')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('holdingGroups.clientCount', { count: data.clients.length })}
            </p>
          </div>
          <PermissionGate resource="client" action="update">
            <Button type="button" size="sm" onClick={() => setLinkDrawerOpen(true)}>
              <Link2 className="size-4" />
              {t('holdingGroups.linkClient')}
            </Button>
          </PermissionGate>
        </CardHeader>
        <CardContent className="space-y-2">
          {unlinkError ? <p className="text-sm text-destructive">{unlinkError}</p> : null}

          {data.clients.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">{t('holdingGroups.emptyClients')}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t('holdingGroups.emptyClientsHint')}</p>
              <PermissionGate resource="client" action="update">
                <Button
                  type="button"
                  size="sm"
                  className="mt-4"
                  onClick={() => setLinkDrawerOpen(true)}
                >
                  <Link2 className="size-4" />
                  {t('holdingGroups.linkClient')}
                </Button>
              </PermissionGate>
            </div>
          ) : (
            data.clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <Link
                  to={`/clients/${client.id}/overview`}
                  className="min-w-0 flex-1 text-sm hover:text-primary"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {client.internalCode}
                  </span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span>{clientDisplayName(client)}</span>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {t(`status.${client.status}`)}
                  </Badge>
                  <PermissionGate resource="client" action="update">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={unlinkingClientId === client.id}
                      aria-label={t('holdingGroups.unlink')}
                      onClick={() => handleUnlink(client.id)}
                    >
                      <Unlink className="size-4" />
                    </Button>
                  </PermissionGate>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <LinkHoldingGroupClientDrawer
        holdingGroupId={data.id}
        linkedClientIds={data.clients.map((client) => client.id)}
        open={linkDrawerOpen}
        onClose={() => setLinkDrawerOpen(false)}
      />
    </div>
  )
}
