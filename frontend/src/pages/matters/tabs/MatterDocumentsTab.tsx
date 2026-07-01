import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Download, Plus, Upload } from 'lucide-react'
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
  useMatterDocuments,
  useUploadDocument,
} from '@/features/documents/hooks/useDocuments'
import type { DocumentCategory } from '@/features/documents/types'
import {
  DOCUMENT_CATEGORY_LABELS,
  formatDocumentDate,
  formatFileSize,
} from '@/features/documents/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { MatterTabContext } from '../MatterLayout'

const CATEGORIES = Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[]

export function MatterDocumentsTab() {
  const { matterId } = useOutletContext<MatterTabContext>()
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

  const { data: documents, isLoading, isError } = useMatterDocuments(matterId, filters)
  const uploadDocument = useUploadDocument(matterId, filters)
  const download = useDocumentDownload()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
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
      setError('Choose a file to upload')
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
      setError(getApiErrorMessage(err, 'Upload failed'))
    }
  }

  if (isError) return <p className="text-sm text-destructive">Failed to load documents.</p>

  const rows = documents ?? []
  const showInitialLoading = isLoading && rows.length === 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Filing cabinet for this matter - upload PDFs, Word files, and evidence.
          </p>
        </div>
        <PermissionGate resource="document" action="create">
          <Button
            size="sm"
            onClick={() => {
              resetForm()
              setDrawerOpen(true)
            }}
          >
            <Plus className="size-4" />
            Upload new document
          </Button>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name or tags…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter((v as DocumentCategory | 'all') ?? 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {DOCUMENT_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Display name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {showInitialLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                Loading documents…
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                No documents yet. Upload your first filing package or office action.
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
                    {DOCUMENT_CATEGORY_LABELS[doc.category]}
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
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  v{doc.versionCount}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {doc.latestVersion
                    ? formatDocumentDate(doc.latestVersion.createdAt)
                    : '-'}
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Upload document">
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
                Drag a file here, or{' '}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  browse
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
            <label className="text-sm text-muted-foreground">Display name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. BPO Filing Package - Final"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v) => v && setCategory(v as DocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {DOCUMENT_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Tags</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="urgent, bpo, client-approved"
            />
            <p className="text-xs text-muted-foreground">Comma-separated keywords for search</p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadDocument.isPending}>
              {uploadDocument.isPending ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
