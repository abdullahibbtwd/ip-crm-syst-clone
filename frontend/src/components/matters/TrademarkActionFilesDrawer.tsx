import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { Button } from '@/components/ui/button'
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
import { formatDocumentDate } from '@/features/documents/utils'
import {
  trademarkActionTag,
  type TrademarkActionHistoryEntry,
} from '@/features/matters/trademark-actions'
import { getApiErrorMessage } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'

type TrademarkActionFilesDrawerProps = {
  open: boolean
  onClose: () => void
  matterId: string
  entry: TrademarkActionHistoryEntry | null
  canUpload: boolean
}

export function TrademarkActionFilesDrawer({
  open,
  onClose,
  matterId,
  entry,
  canUpload,
}: TrademarkActionFilesDrawerProps) {
  const { t } = useTranslation(['matters', 'common'])
  const canCreateDocument = usePermission('document', 'create')
  const { data: documents, isLoading } = useMatterDocuments(matterId)
  const uploadDocument = useUploadDocument(matterId)
  const download = useDocumentDownload()

  const [regarding, setRegarding] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!entry) return null

  const tag = trademarkActionTag(entry.id)
  const rows = (documents ?? []).filter((doc) => doc.tags.includes(tag))
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
        tags: tag,
      })
      resetForm()
    } catch (err) {
      setError(getApiErrorMessage(err, t('trademarkActions.archive.uploadFailed')))
    }
  }

  return (
    <Drawer
      open={open}
      onClose={() => {
        resetForm()
        onClose()
      }}
      title={t('trademarkActions.archive.title')}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          {t(`trademarkActions.kinds.${entry.kind}`)}
        </p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('documents.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('trademarkActions.archive.empty')}</p>
        ) : (
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
                    {doc.latestVersion?.uploadedBy.fullName ?? doc.createdBy?.fullName ?? '—'}
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
        )}

        {showUpload ? (
          <form onSubmit={handleUpload} className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <label className="space-y-1.5 text-sm block">
              <span className="text-xs text-muted-foreground">
                {t('trademarkActions.archive.regarding')}
              </span>
              <Input
                value={regarding}
                onChange={(e) => setRegarding(e.target.value)}
                placeholder={t('trademarkActions.archive.regardingPlaceholder')}
              />
            </label>
            <label className="space-y-1.5 text-sm block">
              <span className="text-xs text-muted-foreground">
                {t('trademarkActions.archive.attach')}
              </span>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
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
      </div>
    </Drawer>
  )
}
