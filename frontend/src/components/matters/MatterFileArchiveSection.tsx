import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  useMatterDocuments,
  useUploadDocument,
} from '@/features/documents/hooks/useDocuments'
import type { MatterDocument } from '@/features/documents/types'
import { formatDocumentDate } from '@/features/documents/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'

type MatterFileArchiveSectionProps = {
  matterId: string
  title?: string
  sectionId?: string
  canUpload?: boolean
  uploadTag?: string
  filterDocuments?: (doc: MatterDocument) => boolean
}

export function MatterFileArchiveSection({
  matterId,
  title,
  sectionId,
  canUpload = true,
  uploadTag,
  filterDocuments,
}: MatterFileArchiveSectionProps) {
  const { t } = useTranslation(['matters', 'common'])
  const canCreateDocument = usePermission('document', 'create')
  const { data: documents, isLoading } = useMatterDocuments(matterId)
  const uploadDocument = useUploadDocument(matterId)
  const download = useDocumentDownload()

  const [regarding, setRegarding] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rows = (documents ?? []).filter((doc) =>
    filterDocuments ? filterDocuments(doc) : true,
  )
  const showUpload = canUpload && canCreateDocument

  const resetForm = () => {
    setRegarding('')
    setFile(null)
    setError(null)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!regarding.trim()) {
      setError(t('trademarkActions.archive.regardingRequired'))
      return
    }
    if (!file) {
      setError(t('trademarkActions.archive.fileRequired'))
      return
    }
    try {
      await uploadDocument.mutateAsync({
        file,
        displayName: regarding.trim(),
        category: 'correspondence',
        tags: uploadTag,
      })
      resetForm()
    } catch (err) {
      setError(getApiErrorMessage(err, t('trademarkActions.archive.uploadFailed')))
    }
  }

  return (
    <Card id={sectionId}>
      <CardHeader>
        <CardTitle className="text-base">
          {title ?? t('trademarkActions.archive.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('documents.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('trademarkActions.archive.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('trademarkActions.archive.date')}</TableHead>
                  <TableHead>{t('trademarkActions.archive.regarding')}</TableHead>
                  <TableHead>{t('trademarkActions.archive.document')}</TableHead>
                  <TableHead>{t('trademarkActions.archive.user')}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      {formatDocumentDate(doc.latestVersion?.createdAt ?? doc.createdAt)}
                    </TableCell>
                    <TableCell>{doc.displayName}</TableCell>
                    <TableCell>{doc.latestVersion?.fileName ?? '—'}</TableCell>
                    <TableCell>
                      {doc.latestVersion?.uploadedBy.fullName ??
                        doc.createdBy?.fullName ??
                        '—'}
                    </TableCell>
                    <TableCell>
                      {doc.latestVersion ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            download.mutate({
                              documentId: doc.id,
                              versionId: doc.latestVersion?.id,
                            })
                          }
                          aria-label={t('trademarkActions.archive.download')}
                        >
                          <Download className="size-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {showUpload ? (
          <form
            onSubmit={(e) => void handleUpload(e)}
            className="space-y-3 rounded-lg border bg-muted/20 p-3"
          >
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('trademarkActions.archive.regarding')}
              </span>
              <Input
                value={regarding}
                onChange={(e) => setRegarding(e.target.value)}
                placeholder={t('trademarkActions.archive.regardingPlaceholder')}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('trademarkActions.archive.attach')}
              </span>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={uploadDocument.isPending}>
                {uploadDocument.isPending
                  ? t('common:loading.saving')
                  : t('trademarkActions.archive.upload')}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
