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
import type { DocumentCategory } from '@/features/documents/types'
import { formatDocumentDate, formatFileSize } from '@/features/documents/utils'
import { useMatters } from '@/features/matters/hooks/useMatters'

const CATEGORIES: DocumentCategory[] = [
  'application',
  'office_action',
  'evidence',
  'certificate',
  'correspondence',
]

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
        <h1 className="text-xl font-semibold">{t('documents.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('documents.description')}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder={t('documents.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={matterFilter}
          onValueChange={(value) => setMatterFilter(value ?? 'all')}
        >
          <SelectTrigger className="w-[200px]">
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
          <SelectTrigger className="w-[180px]">
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

      {documents && (
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
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t('documents.empty')}
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
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
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
