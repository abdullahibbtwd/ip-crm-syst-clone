import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Download,
  Folder,
  LayoutGrid,
  List,
  Plus,
  Upload,
} from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
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
import { Drawer } from '@/components/crm/Drawer'
import { documentsApi } from '@/features/documents/api'
import {
  useClientDocumentDownload,
  useClientDocuments,
  useDocumentDownload,
  useUploadClientDocument,
} from '@/features/documents/hooks/useDocuments'
import { documentKeys } from '@/features/documents/queryKeys'
import type {
  ClientMatterDocument,
  ClientOwnedDocument,
  DocumentCategory,
} from '@/features/documents/types'
import {
  formatDocumentDate,
  formatFileSize,
} from '@/features/documents/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { ClientTabContext } from '../ClientLayout'

const CATEGORIES: DocumentCategory[] = [
  'general',
  'application',
  'office_action',
  'evidence',
  'certificate',
  'correspondence',
  'renewal',
]

type ViewMode = 'grid' | 'list'
type FolderKey = 'client' | string
type UploadScope = 'client' | 'matter'
type UnifiedDoc = ClientOwnedDocument | ClientMatterDocument

export function ClientDocumentsTab() {
  const { t } = useTranslation(['crm', 'common'])
  const { clientId } = useOutletContext<ClientTabContext>()
  const qc = useQueryClient()

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeFolder, setActiveFolder] = useState<FolderKey | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const filters = {
    ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  }

  const { data, isLoading, isError } = useClientDocuments(clientId, filters)
  const uploadClient = useUploadClientDocument(clientId, filters)
  const clientDownload = useClientDocumentDownload(clientId)
  const matterDownload = useDocumentDownload()

  const uploadMatter = useMutation({
    mutationFn: ({
      matterId,
      ...input
    }: {
      matterId: string
      file: File
      displayName?: string
      category: DocumentCategory
      tags?: string
    }) => documentsApi.upload(matterId, input),
    onSuccess: (_doc, vars) => {
      qc.invalidateQueries({ queryKey: documentKeys.client(clientId, filters) })
      qc.invalidateQueries({ queryKey: documentKeys.client(clientId) })
      qc.invalidateQueries({ queryKey: documentKeys.matter(vars.matterId) })
    },
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [uploadScope, setUploadScope] = useState<UploadScope>('client')
  const [uploadMatterId, setUploadMatterId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('general')
  const [tags, setTags] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const matters = data?.matters ?? []
  const clientDocs = data?.clientDocuments ?? []
  const matterDocs = data?.matterDocuments ?? []

  const allDocs: UnifiedDoc[] = useMemo(
    () => [...clientDocs, ...matterDocs],
    [clientDocs, matterDocs],
  )

  const folderDocs = useMemo(() => {
    if (!activeFolder) return []
    if (activeFolder === 'client') return clientDocs
    return matterDocs.filter((d) => d.matterId === activeFolder)
  }, [activeFolder, clientDocs, matterDocs])

  const resetForm = () => {
    setFile(null)
    setDisplayName('')
    setCategory('general')
    setTags('')
    setUploadScope('client')
    setUploadMatterId('')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const pickFile = (picked: File | null) => {
    setFile(picked)
    if (picked && !displayName.trim()) {
      setDisplayName(picked.name.replace(/\.[^.]+$/, ''))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError(t('clientFiles.chooseFile'))
      return
    }
    if (uploadScope === 'matter' && !uploadMatterId) {
      setError(t('clientFiles.chooseMatter'))
      return
    }
    try {
      if (uploadScope === 'client') {
        await uploadClient.mutateAsync({
          file,
          displayName: displayName.trim() || undefined,
          category,
          tags: tags.trim() || undefined,
        })
      } else {
        await uploadMatter.mutateAsync({
          matterId: uploadMatterId,
          file,
          displayName: displayName.trim() || undefined,
          category,
          tags: tags.trim() || undefined,
        })
      }
      resetForm()
      setDrawerOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('clientFiles.errorUpload')))
    }
  }

  const handleDownload = (doc: UnifiedDoc) => {
    if (doc.scope === 'client') {
      clientDownload.mutate({ documentId: doc.id })
    } else {
      matterDownload.mutate({ documentId: doc.id })
    }
  }

  const uploading = uploadClient.isPending || uploadMatter.isPending
  const downloading = clientDownload.isPending || matterDownload.isPending

  if (isError) {
    return <p className="text-sm text-destructive">{t('clientFiles.error')}</p>
  }

  const showInitialLoading = isLoading && !data
  const rows = viewMode === 'list' || !activeFolder ? allDocs : folderDocs

  const renderDocTable = (docs: UnifiedDoc[], showScope: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('clientFiles.table.displayName')}</TableHead>
          {showScope ? <TableHead>{t('clientFiles.table.scope')}</TableHead> : null}
          <TableHead>{t('clientFiles.table.category')}</TableHead>
          <TableHead>{t('clientFiles.table.version')}</TableHead>
          <TableHead>{t('clientFiles.table.uploaded')}</TableHead>
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
              {t('clientFiles.loading')}
            </TableCell>
          </TableRow>
        ) : docs.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={showScope ? 6 : 5}
              className="py-12 text-center text-muted-foreground"
            >
              {t('clientFiles.empty')}
            </TableCell>
          </TableRow>
        ) : (
          docs.map((doc) => (
            <TableRow key={`${doc.scope}-${doc.id}`}>
              <TableCell>
                <div className="font-medium">{doc.displayName}</div>
                {doc.latestVersion ? (
                  <p className="text-xs text-muted-foreground">
                    {doc.latestVersion.fileName} · {formatFileSize(doc.latestVersion.sizeBytes)}
                  </p>
                ) : null}
              </TableCell>
              {showScope ? (
                <TableCell>
                  <Badge variant="outline" className="normal-case">
                    {doc.scope === 'client'
                      ? t('clientFiles.scopeClient')
                      : doc.matterTitle}
                  </Badge>
                </TableCell>
              ) : null}
              <TableCell>
                <Badge variant="outline" className="normal-case">
                  {t(`clientFiles.category.${doc.category}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">v{doc.versionCount}</TableCell>
              <TableCell className="text-muted-foreground">
                {doc.latestVersion
                  ? formatDocumentDate(doc.latestVersion.createdAt)
                  : t('yesNo.dash', { ns: 'common' })}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={downloading}
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="size-3.5" />
                </Button>
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
          <h2 className="font-medium">{t('clientFiles.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('clientFiles.description')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <PermissionGate resource="document" action="create">
            <Button
              size="sm"
              onClick={() => {
                resetForm()
                if (activeFolder && activeFolder !== 'client') {
                  setUploadScope('matter')
                  setUploadMatterId(activeFolder)
                }
                setDrawerOpen(true)
              }}
            >
              <Plus className="size-4" />
              {t('clientFiles.upload')}
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder={t('clientFiles.search')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter((v as DocumentCategory | 'all') ?? 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('clientFiles.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('clientFiles.allCategories')}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(`clientFiles.category.${c}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                {t('clientFiles.fileCount', { count: clientDocs.length })}
              </p>
            </div>
          </button>
          {matters.map((matter) => {
            const count = matterDocs.filter((d) => d.matterId === matter.id).length
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
                    {t('clientFiles.fileCount', { count })}
                  </p>
                </div>
              </button>
            )
          })}
          {!showInitialLoading && matters.length === 0 && clientDocs.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              {t('clientFiles.empty')}
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
          {renderDocTable(rows, viewMode === 'list')}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={t('clientFiles.upload')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('clientFiles.scope')}</label>
            <Select
              value={uploadScope}
              onValueChange={(v) => {
                const next = (v as UploadScope) ?? 'client'
                setUploadScope(next)
                if (next === 'client') setUploadMatterId('')
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">{t('clientFiles.scopeClient')}</SelectItem>
                <SelectItem value="matter">{t('clientFiles.scopeMatter')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {uploadScope === 'matter' ? (
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">{t('clientFiles.matter')}</label>
              <Select
                value={uploadMatterId}
                onValueChange={(v) => setUploadMatterId(v ?? '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('clientFiles.chooseMatter')} />
                </SelectTrigger>
                <SelectContent>
                  {matters.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

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
              <p className="text-sm text-muted-foreground">
                {t('clientFiles.dragDrop')}{' '}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('clientFiles.browse')}
                </button>
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('clientFiles.displayName')}</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('clientFiles.displayNamePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('clientFiles.categoryLabel')}</label>
            <Select value={category} onValueChange={(v) => v && setCategory(v as DocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`clientFiles.category.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('clientFiles.tags')}</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('clientFiles.tagsPlaceholder')}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? t('clientFiles.uploading') : t('clientFiles.uploadAction')}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
