import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import {
  useDocumentDownload,
  usePortalDocuments,
} from '@/features/documents/hooks/useDocuments'
import type { DocumentCategory, PortalDocument } from '@/features/documents/types'
import { formatDocumentDate, formatFileSize } from '@/features/documents/utils'
import { useMatters } from '@/features/matters/hooks/useMatters'

const CATEGORIES: DocumentCategory[] = [
  'application',
  'office_action',
  'evidence',
  'certificate',
  'correspondence',
]

function DocumentCard({
  doc,
  onDownload,
  downloading,
}: {
  doc: PortalDocument
  onDownload: () => void
  downloading: boolean
}) {
  const { t } = useTranslation('portal')
  return (
    <li className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium leading-snug break-words">{doc.displayName}</p>
          <Link
            to={`/matters/${doc.matterId}/documents`}
            className="text-sm text-primary hover:underline"
          >
            {doc.matterTitle}
          </Link>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="secondary">{t(`documentCategories.${doc.category}`)}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDocumentDate(doc.updatedAt)}
              {doc.latestVersion
                ? ` · ${formatFileSize(doc.latestVersion.sizeBytes)}`
                : ''}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={!doc.latestVersion || downloading}
          onClick={onDownload}
        >
          <Download className="size-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1">{t('documents.download')}</span>
        </Button>
      </div>
    </li>
  )
}

export function PortalDocumentsPage() {
  const { t } = useTranslation('portal')
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all')
  const [matterFilter, setMatterFilter] = useState<string>('all')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const filters = {
    ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
    ...(matterFilter !== 'all' ? { matterId: matterFilter } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  }

  const { data: mattersData } = useMatters({ limit: 100 })
  const { data: documents, isLoading, isError } = usePortalDocuments(filters)
  const download = useDocumentDownload()

  const matters = mattersData?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {t('documents.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('documents.description')}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Input
          placeholder={t('documents.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <Select
          value={matterFilter}
          onValueChange={(value) => setMatterFilter(value ?? 'all')}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t('documents.allMatters')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('documents.allMatters')}</SelectItem>
            {matters.map((matter) => (
              <SelectItem key={matter.id} value={matter.id}>
                {matter.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as DocumentCategory | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('documents.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('documents.allCategories')}</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {t(`documentCategories.${cat}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t('documents.loading')}</p>}
      {isError && <p className="text-sm text-destructive">{t('documents.error')}</p>}

      {documents && documents.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('documents.empty')}
        </p>
      )}

      {documents && documents.length > 0 && (
        <>
          <ul className="space-y-3 md:hidden">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                downloading={download.isPending}
                onDownload={() =>
                  download.mutate({
                    documentId: doc.id,
                    versionId: doc.latestVersion?.id,
                  })
                }
              />
            ))}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('documents.table.document')}</TableHead>
                  <TableHead>{t('documents.table.matter')}</TableHead>
                  <TableHead>{t('documents.table.category')}</TableHead>
                  <TableHead>{t('documents.table.updated')}</TableHead>
                  <TableHead className="text-right">{t('documents.table.size')}</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
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
                    <TableCell>
                      <Badge variant="secondary">
                        {t(`documentCategories.${doc.category}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDocumentDate(doc.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {doc.latestVersion
                        ? formatFileSize(doc.latestVersion.sizeBytes)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!doc.latestVersion || download.isPending}
                        onClick={() =>
                          download.mutate({
                            documentId: doc.id,
                            versionId: doc.latestVersion?.id,
                          })
                        }
                        aria-label={t('documents.download')}
                      >
                        <Download className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
