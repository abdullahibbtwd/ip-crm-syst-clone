import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { Download, FileText, Plus, Upload } from 'lucide-react'
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
import {
  useDocumentDownload,
  useDocumentTemplates,
  useGenerateDocument,
  useMatterDocuments,
  useUploadDocument,
} from '@/features/documents/hooks/useDocuments'
import type { DocumentCategory } from '@/features/documents/types'
import {
  formatDocumentDate,
  formatFileSize,
} from '@/features/documents/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { MatterTabContext } from '../MatterLayout'

const CATEGORIES: DocumentCategory[] = [
  'application',
  'office_action',
  'evidence',
  'certificate',
  'correspondence',
  'renewal',
  'general',
]

export function MatterDocumentsTab() {
  const { t } = useTranslation(['matters', 'common'])
  const { matterId } = useOutletContext<MatterTabContext>()
  const [searchParams] = useSearchParams()
  const categoryFromUrl = searchParams.get('category')
  const initialCategory: DocumentCategory | 'all' =
    categoryFromUrl && CATEGORIES.includes(categoryFromUrl as DocumentCategory)
      ? (categoryFromUrl as DocumentCategory)
      : 'all'
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>(
    initialCategory,
  )
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    if (
      categoryFromUrl &&
      CATEGORIES.includes(categoryFromUrl as DocumentCategory)
    ) {
      setCategoryFilter(categoryFromUrl as DocumentCategory)
    }
  }, [categoryFromUrl])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const filters = {
    ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  }

  const { data: documents, isLoading, isError } = useMatterDocuments(matterId, filters)
  const { data: templates } = useDocumentTemplates()
  const uploadDocument = useUploadDocument(matterId, filters)
  const generateDocument = useGenerateDocument(matterId, filters)
  const download = useDocumentDownload()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [generateFormat, setGenerateFormat] = useState<'pdf' | 'docx'>('pdf')
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('correspondence')
  const [tags, setTags] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const resetForm = () => {
    setFile(null)
    setDisplayName('')
    setCategory('correspondence')
    setTags('')
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
      setError(t('documents.chooseFile'))
      return
    }
    try {
      await uploadDocument.mutateAsync({
        file,
        displayName: displayName.trim() || undefined,
        category,
        tags: tags.trim() || undefined,
      })
      resetForm()
      setDrawerOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('documents.errorUpload')))
    }
  }

  const selectedTemplate = templates?.find((tpl) => tpl.id === selectedTemplateId)
  const canGenerateDocx = Boolean(selectedTemplate?.hasDocx)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!selectedTemplateId) {
      setError(t('documents.chooseTemplate'))
      return
    }
    if (generateFormat === 'docx' && !canGenerateDocx) {
      setError(t('documents.errorNoDocx'))
      return
    }
    try {
      await generateDocument.mutateAsync({
        templateId: selectedTemplateId,
        format: generateFormat,
      })
      setGenerateOpen(false)
      setSelectedTemplateId('')
      setGenerateFormat('pdf')
    } catch (err) {
      setError(getApiErrorMessage(err, t('documents.errorGeneration')))
    }
  }

  if (isError) return <p className="text-sm text-destructive">{t('documents.error')}</p>

  const rows = documents ?? []
  const showInitialLoading = isLoading && rows.length === 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">{t('documents.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('documents.description')}</p>
        </div>
        <PermissionGate resource="document" action="create">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setError(null)
                setSelectedTemplateId(templates?.[0]?.id ?? '')
                setGenerateFormat('pdf')
                setGenerateOpen(true)
              }}
              disabled={!templates?.length}
            >
              <FileText className="size-4" />
              {t('documents.generate')}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetForm()
                setDrawerOpen(true)
              }}
            >
              <Plus className="size-4" />
              {t('documents.uploadNew')}
            </Button>
          </div>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder={t('documents.search')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter((v as DocumentCategory | 'all') ?? 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('documents.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('documents.allCategories')}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(`correspondence.category.${c}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('documents.table.displayName')}</TableHead>
            <TableHead>{t('documents.table.category')}</TableHead>
            <TableHead>{t('documents.table.tags')}</TableHead>
            <TableHead>{t('documents.table.version')}</TableHead>
            <TableHead>{t('documents.table.uploaded')}</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {showInitialLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                {t('documents.loading')}
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                {t('documents.empty')}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="font-medium">{doc.displayName}</div>
                  {doc.latestVersion ? (
                    <p className="text-xs text-muted-foreground">
                      {doc.latestVersion.fileName} · {formatFileSize(doc.latestVersion.sizeBytes)}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="normal-case">
                    {t(`correspondence.category.${doc.category}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {doc.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="font-normal normal-case">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t('yesNo.dash', { ns: 'common' })}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  v{doc.versionCount}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {doc.latestVersion
                    ? formatDocumentDate(doc.latestVersion.createdAt)
                    : t('yesNo.dash', { ns: 'common' })}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={download.isPending}
                    onClick={() => download.mutate({ documentId: doc.id })}
                  >
                    <Download className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={t('documents.upload')}>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                {t('documents.dragDrop')}{' '}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('documents.browse')}
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
            <label className="text-sm text-muted-foreground">{t('documents.displayName')}</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('documents.displayNamePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('documents.category')}</label>
            <Select value={category} onValueChange={(v) => v && setCategory(v as DocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`correspondence.category.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('documents.tags')}</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('documents.tagsPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('documents.tagsHint')}</p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" disabled={uploadDocument.isPending}>
              {uploadDocument.isPending ? t('documents.uploading') : t('documents.uploadAction')}
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title={t('documents.generate')}
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('documents.generateDescription')}</p>

          <div className="space-y-2">
            {(templates ?? []).map((template) => (
              <label
                key={template.id}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors',
                  selectedTemplateId === template.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <input
                  type="radio"
                  name="template"
                  className="mt-1"
                  checked={selectedTemplateId === template.id}
                  onChange={() => {
                    setSelectedTemplateId(template.id)
                    if (!template.hasDocx && generateFormat === 'docx') {
                      setGenerateFormat('pdf')
                    }
                  }}
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{template.name}</span>
                    {template.hasDocx ? (
                      <Badge variant="info" className="font-normal normal-case">
                        {t('documents.word')}
                      </Badge>
                    ) : null}
                  </span>
                  {template.description ? (
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {template.description}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
            {!templates?.length ? (
              <p className="text-sm text-muted-foreground">{t('documents.noTemplates')}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('documents.format')}</label>
            <Select
              value={generateFormat}
              onValueChange={(v) => setGenerateFormat((v as 'pdf' | 'docx') ?? 'pdf')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="docx" disabled={!canGenerateDocx}>
                  Word (.docx){!canGenerateDocx ? t('documents.notAvailable') : ''}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" disabled={generateDocument.isPending || !selectedTemplateId}>
              {generateDocument.isPending
                ? t('documents.generating')
                : generateFormat === 'docx'
                  ? t('documents.generateWord')
                  : t('documents.generatePdf')}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
