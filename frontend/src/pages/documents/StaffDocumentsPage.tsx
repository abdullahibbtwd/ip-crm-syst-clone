import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, Eye, Plus, Search, Upload } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { documentsApi } from '@/features/documents/api'
import { documentKeys } from '@/features/documents/queryKeys'
import type {
  DocumentCategory,
  FirmDocument,
  SharedDocument,
} from '@/features/documents/types'
import { formatDocumentDate, openDocumentResponse } from '@/features/documents/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type LibraryTab = 'working' | 'shared'

const CATEGORIES: DocumentCategory[] = [
  'general',
  'application',
  'office_action',
  'evidence',
  'certificate',
  'correspondence',
  'renewal',
]

export function StaffDocumentsPage() {
  const { t } = useTranslation(['documents', 'matters', 'common'])
  const qc = useQueryClient()
  const [tab, setTab] = useState<LibraryTab>('working')
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('general')
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const workingQuery = useQuery({
    queryKey: ['documents', 'firm', search],
    queryFn: () =>
      documentsApi.listFirmWide({ search: search.trim() || undefined }),
    enabled: tab === 'working',
  })

  const sharedQuery = useQuery({
    queryKey: documentKeys.shared({ search: search.trim() || undefined }),
    queryFn: () =>
      documentsApi.listShared({ search: search.trim() || undefined }),
    enabled: tab === 'shared',
  })

  const uploadShared = useMutation({
    mutationFn: documentsApi.uploadShared,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKeys.shared() })
    },
  })

  const downloadShared = useMutation({
    mutationFn: ({
      documentId,
      disposition,
    }: {
      documentId: string
      disposition: 'inline' | 'attachment'
    }) => documentsApi.getSharedDownloadUrl(documentId, undefined, disposition),
    onSuccess: (data, variables) => {
      openDocumentResponse(data, variables.disposition === 'inline' ? 'view' : 'download')
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, t('loadFailed')))
    },
  })

  const openWorkingDocument = async (
    documentId: string,
    mode: 'view' | 'download',
  ) => {
    setActionError(null)
    setBusyAction(`${mode}:${documentId}`)
    try {
      const data = await documentsApi.getDownloadUrl(
        documentId,
        undefined,
        mode === 'view' ? 'inline' : 'attachment',
      )
      openDocumentResponse(data, mode)
    } catch (err) {
      setActionError(getApiErrorMessage(err, t('loadFailed')))
    } finally {
      setBusyAction(null)
    }
  }

  const isLoading = tab === 'working' ? workingQuery.isLoading : sharedQuery.isLoading
  const isError = tab === 'working' ? workingQuery.isError : sharedQuery.isError
  const workingDocs: FirmDocument[] = workingQuery.data ?? []
  const sharedDocs: SharedDocument[] = sharedQuery.data ?? []

  const pickFile = (picked: File | null) => {
    setFile(picked)
    if (picked && !displayName.trim()) setDisplayName(picked.name)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError(t('shared.uploadRequired'))
      return
    }
    setError(null)
    try {
      await uploadShared.mutateAsync({
        file,
        displayName: displayName.trim() || undefined,
        category,
      })
      setDrawerOpen(false)
      setFile(null)
      setDisplayName('')
      setCategory('general')
    } catch (err) {
      setError(getApiErrorMessage(err, t('shared.uploadFailed')))
    }
  }

  const categoryLabel = (value: string) =>
    t(`matters:correspondence.category.${value}`, { defaultValue: value })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === 'working' ? t('subtitleWorking') : t('subtitleShared')}
          </p>
        </div>
        {tab === 'shared' ? (
          <PermissionGate resource="document" action="create">
            <Button type="button" onClick={() => setDrawerOpen(true)}>
              <Plus className="size-4" />
              {t('shared.upload')}
            </Button>
          </PermissionGate>
        ) : null}
      </div>

      <PermissionGate
        resource="document"
        action="read"
        fallback={<p className="text-sm text-muted-foreground">{t('common:noPermission')}</p>}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === 'working' ? 'default' : 'outline'}
            onClick={() => setTab('working')}
          >
            {t('tabs.working')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'shared' ? 'default' : 'outline'}
            onClick={() => setTab('shared')}
          >
            {t('tabs.shared')}
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{t('loadFailed')}</p>
        ) : tab === 'working' ? (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.name')}</TableHead>
                  <TableHead>{t('columns.matter')}</TableHead>
                  <TableHead>{t('columns.category')}</TableHead>
                  <TableHead>{t('columns.updated')}</TableHead>
                  <TableHead>{t('columns.by')}</TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-right">
                    {t('columns.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workingDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  workingDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.displayName}</TableCell>
                      <TableCell>
                        <Link
                          to={`/matters/${doc.matterId}/documents`}
                          className="text-primary hover:underline"
                        >
                          {doc.matterTitle}
                        </Link>
                      </TableCell>
                      <TableCell>{categoryLabel(doc.category)}</TableCell>
                      <TableCell>{formatDocumentDate(doc.updatedAt)}</TableCell>
                      <TableCell>{doc.createdBy?.fullName ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <DocumentRowActions
                          viewLabel={t('actions.view')}
                          downloadLabel={t('actions.download')}
                          viewBusy={busyAction === `view:${doc.id}`}
                          downloadBusy={busyAction === `download:${doc.id}`}
                          disabled={Boolean(busyAction)}
                          onView={() => void openWorkingDocument(doc.id, 'view')}
                          onDownload={() => void openWorkingDocument(doc.id, 'download')}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.name')}</TableHead>
                  <TableHead>{t('columns.category')}</TableHead>
                  <TableHead>{t('columns.updated')}</TableHead>
                  <TableHead>{t('columns.by')}</TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-right">
                    {t('columns.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharedDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {t('shared.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  sharedDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.displayName}</TableCell>
                      <TableCell>{categoryLabel(doc.category)}</TableCell>
                      <TableCell>{formatDocumentDate(doc.updatedAt)}</TableCell>
                      <TableCell>{doc.createdBy?.fullName ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <DocumentRowActions
                          viewLabel={t('actions.view')}
                          downloadLabel={t('actions.download')}
                          viewBusy={
                            downloadShared.isPending &&
                            downloadShared.variables?.documentId === doc.id &&
                            downloadShared.variables.disposition === 'inline'
                          }
                          downloadBusy={
                            downloadShared.isPending &&
                            downloadShared.variables?.documentId === doc.id &&
                            downloadShared.variables.disposition === 'attachment'
                          }
                          disabled={downloadShared.isPending}
                          onView={() =>
                            downloadShared.mutate({
                              documentId: doc.id,
                              disposition: 'inline',
                            })
                          }
                          onDownload={() =>
                            downloadShared.mutate({
                              documentId: doc.id,
                              disposition: 'attachment',
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </PermissionGate>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={t('shared.upload')}>
        <form onSubmit={handleUpload} className="space-y-4">
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border',
              file ? 'bg-muted/30' : '',
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              pickFile(e.dataTransfer.files[0] ?? null)
            }}
          >
            <Upload className="size-8 text-muted-foreground" />
            {file ? (
              <p className="text-sm font-medium">{file.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('shared.dropHint')}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {t('shared.chooseFile')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('shared.displayName')}</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('shared.displayNamePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('shared.category')}</label>
            <Select value={category} onValueChange={(v) => v && setCategory(v as DocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={uploadShared.isPending}>
              {uploadShared.isPending ? t('shared.uploading') : t('shared.upload')}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}

function DocumentRowActions({
  viewLabel,
  downloadLabel,
  viewBusy,
  downloadBusy,
  disabled,
  onView,
  onDownload,
}: {
  viewLabel: string
  downloadLabel: string
  viewBusy: boolean
  downloadBusy: boolean
  disabled: boolean
  onView: () => void
  onDownload: () => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={onView}
        aria-label={viewLabel}
        title={viewLabel}
      >
        <Eye className="size-4" />
        {viewBusy ? '…' : viewLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={onDownload}
        aria-label={downloadLabel}
        title={downloadLabel}
      >
        <Download className="size-4" />
        {downloadBusy ? '…' : downloadLabel}
      </Button>
    </div>
  )
}
