import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Folder,
  LayoutGrid,
  List,
  Mail,
} from 'lucide-react'
import { LogCorrespondenceDrawer } from '@/components/correspondence/LogCorrespondenceDrawer'
import { LogEmailDrawer } from '@/components/correspondence/LogEmailDrawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClientCorrespondence } from '@/features/correspondence/hooks/useCorrespondence'
import type {
  ClientMatterCorrespondence,
  ClientOwnedCorrespondence,
} from '@/features/correspondence/types'
import {
  correspondenceStatusLabel,
  formatCorrespondenceDate,
} from '@/features/correspondence/utils'
import { cn } from '@/lib/utils'
import type { ClientTabContext } from '../ClientLayout'

type ViewMode = 'grid' | 'list'
type FolderKey = 'client' | string
type UnifiedCorrespondence = ClientOwnedCorrespondence | ClientMatterCorrespondence

export function ClientCorrespondenceTab() {
  const { t } = useTranslation(['crm', 'common', 'matters'])
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data, isLoading, isError } = useClientCorrespondence(clientId)

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeFolder, setActiveFolder] = useState<FolderKey | null>(null)
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false)
  const [correspondenceDrawerOpen, setCorrespondenceDrawerOpen] = useState(false)

  const matters = data?.matters ?? []
  const clientRows = data?.clientCorrespondence ?? []
  const matterRows = data?.matterCorrespondence ?? []

  const initialScope: 'client' | string =
    activeFolder && activeFolder !== 'client' ? activeFolder : 'client'

  const allRows: UnifiedCorrespondence[] = useMemo(
    () => [...clientRows, ...matterRows],
    [clientRows, matterRows],
  )

  const folderRows = useMemo(() => {
    if (!activeFolder) return []
    if (activeFolder === 'client') return clientRows
    return matterRows.filter((row) => row.matterId === activeFolder)
  }, [activeFolder, clientRows, matterRows])

  if (isError) {
    return <p className="text-sm text-destructive">{t('clientFiles.correspondenceError')}</p>
  }

  const showInitialLoading = isLoading && !data
  const rows = viewMode === 'list' || !activeFolder ? allRows : folderRows

  const actionButtons = (
    <PermissionGate resource="correspondence" action="create">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCorrespondenceDrawerOpen(true)}
        >
          <FileText className="size-4" />
          {t('matters:correspondence.add')}
        </Button>
        <Button size="sm" onClick={() => setEmailDrawerOpen(true)}>
          <Mail className="size-4" />
          {t('matters:correspondence.logEmail.title')}
        </Button>
      </div>
    </PermissionGate>
  )

  const renderTable = (items: UnifiedCorrespondence[], showScope: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('clientFiles.correspondenceTable.subject')}</TableHead>
          <TableHead>{t('clientFiles.correspondenceTable.sender')}</TableHead>
          <TableHead>{t('clientFiles.correspondenceTable.date')}</TableHead>
          <TableHead>{t('clientFiles.correspondenceTable.status')}</TableHead>
          {showScope ? <TableHead>{t('clientFiles.table.scope')}</TableHead> : null}
          <TableHead className="w-[100px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {showInitialLoading ? (
          <TableRow>
            <TableCell
              colSpan={showScope ? 6 : 5}
              className="py-12 text-center text-muted-foreground"
            >
              {t('clientFiles.correspondenceLoading')}
            </TableCell>
          </TableRow>
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showScope ? 6 : 5} className="py-16 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Mail className="size-5 opacity-60" />
                </div>
                <p className="font-medium text-foreground">
                  {t('clientFiles.correspondenceEmpty')}
                </p>
                {actionButtons}
              </div>
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={`${item.scope}-${item.id}`}>
              <TableCell className="max-w-[280px] font-medium">
                <span className="line-clamp-2">{item.subject}</span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{item.sender}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatCorrespondenceDate(item.correspondenceDate)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="normal-case">
                  {correspondenceStatusLabel(item.status)}
                </Badge>
              </TableCell>
              {showScope ? (
                <TableCell>
                  <Badge variant="outline" className="normal-case">
                    {item.scope === 'client'
                      ? t('clientFiles.scopeClient')
                      : item.matterTitle ?? t('clientFiles.scopeMatter')}
                  </Badge>
                </TableCell>
              ) : null}
              <TableCell>
                {item.scope === 'matter' && item.matterId ? (
                  <Link
                    to={`/matters/${item.matterId}/correspondence`}
                    className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                  >
                    <ExternalLink className="size-3.5" />
                    {t('clientFiles.openMatter')}
                  </Link>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">{t('clientFiles.correspondenceTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('clientFiles.correspondenceDescription')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actionButtons}
          <div className="flex rounded-md border p-0.5">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              className="h-8 px-2"
              onClick={() => {
                setViewMode('grid')
                setActiveFolder(null)
              }}
              title={t('clientFiles.viewGrid')}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              className="h-8 px-2"
              onClick={() => {
                setViewMode('list')
                setActiveFolder(null)
              }}
              title={t('clientFiles.viewList')}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' && !activeFolder ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            className="flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
            onClick={() => setActiveFolder('client')}
          >
            <Folder className="mt-0.5 size-8 text-amber-500" />
            <div className="min-w-0">
              <p className="font-medium">{t('clientFiles.folderClient')}</p>
              <p className="text-sm text-muted-foreground">
                {t('clientFiles.itemCount', { count: clientRows.length })}
              </p>
            </div>
          </button>
          {matters.map((matter) => {
            const count = matterRows.filter((r) => r.matterId === matter.id).length
            return (
              <button
                key={matter.id}
                type="button"
                className="flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                onClick={() => setActiveFolder(matter.id)}
              >
                <Folder className="mt-0.5 size-8 text-sky-500" />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {t('clientFiles.folderMatter', { title: matter.title })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('clientFiles.itemCount', { count })}
                  </p>
                </div>
              </button>
            )
          })}
          {!showInitialLoading && matters.length === 0 && clientRows.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              {t('clientFiles.correspondenceEmpty')}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {viewMode === 'grid' && activeFolder ? (
            <Button
              size="sm"
              variant="ghost"
              className="px-0"
              onClick={() => setActiveFolder(null)}
            >
              <ArrowLeft className="size-4" />
              {t('clientFiles.backToFolders')}
            </Button>
          ) : null}
          {viewMode === 'grid' && activeFolder ? (
            <h3 className="text-sm font-medium text-muted-foreground">
              {activeFolder === 'client'
                ? t('clientFiles.folderClient')
                : t('clientFiles.folderMatter', {
                    title: matters.find((m) => m.id === activeFolder)?.title ?? '',
                  })}
            </h3>
          ) : null}
          {renderTable(rows, viewMode === 'list')}
        </div>
      )}

      <LogEmailDrawer
        open={emailDrawerOpen}
        onClose={() => setEmailDrawerOpen(false)}
        clientId={clientId}
        matters={matters}
        initialScope={initialScope}
      />
      <LogCorrespondenceDrawer
        open={correspondenceDrawerOpen}
        onClose={() => setCorrespondenceDrawerOpen(false)}
        clientId={clientId}
        matters={matters}
        initialScope={initialScope}
      />
    </div>
  )
}
