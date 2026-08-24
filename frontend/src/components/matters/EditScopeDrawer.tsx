import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  NICE_CLASS_NUMBERS,
  type GoodsServicesRow,
} from '@/features/create-file/trademark-subtypes'
import { useUploadDocument } from '@/features/documents/hooks/useDocuments'
import { useRecordTrademarkAction } from '@/features/matters/hooks/useMatters'
import {
  goodsRowsFromAttributes,
  LEGAL_BASIS_OPTIONS,
  type LegalBasisOption,
} from '@/features/matters/trademark-actions'
import type { MatterDetail } from '@/features/matters/types'
import { getApiErrorMessage } from '@/lib/api-client'

type EditScopeDrawerProps = {
  open: boolean
  onClose: () => void
  matter: MatterDetail
}

export function EditScopeDrawer({ open, onClose, matter }: EditScopeDrawerProps) {
  const { t } = useTranslation(['matters', 'common'])
  const recordAction = useRecordTrademarkAction(matter.id)
  const uploadDocument = useUploadDocument(matter.id)

  const [goodsRows, setGoodsRows] = useState<GoodsServicesRow[]>([
    { classNumber: 1, description: '' },
  ])
  const [incomingNumber, setIncomingNumber] = useState('')
  const [filingDate, setFilingDate] = useState('')
  const [legalBasis, setLegalBasis] = useState<LegalBasisOption | ''>('')
  const [legalBasisOther, setLegalBasisOther] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const attrs = matter.attributes?.attributes ?? {}
    const stored = goodsRowsFromAttributes(attrs)
    setGoodsRows(stored.length ? stored : [{ classNumber: 1, description: '' }])
    setIncomingNumber('')
    setFilingDate(new Date().toISOString().slice(0, 10))
    setLegalBasis('')
    setLegalBasisOther('')
    setFile(null)
    setError(null)
  }, [open, matter.id, matter.updatedAt, matter.attributes?.attributes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (goodsRows.length === 0) {
      setError(t('trademarkActions.scope.errors.classRequired'))
      return
    }
    if (!incomingNumber.trim()) {
      setError(t('trademarkActions.scope.errors.incomingRequired'))
      return
    }
    if (!filingDate) {
      setError(t('trademarkActions.scope.errors.dateRequired'))
      return
    }
    if (!legalBasis) {
      setError(t('trademarkActions.scope.errors.basisRequired'))
      return
    }

    try {
      let documentVersionId: string | undefined
      if (file) {
        const uploaded = await uploadDocument.mutateAsync({
          file,
          displayName: file.name.replace(/\.[^.]+$/, ''),
          category: 'correspondence',
          tags: 'scope-correction',
        })
        documentVersionId = uploaded.latestVersion?.id
      }

      await recordAction.mutateAsync({
        kind: 'scope_correction',
        goodsAndServices: goodsRows,
        incomingReferenceNumber: incomingNumber.trim(),
        filingDate,
        legalBasis,
        legalBasisOther: legalBasis === 'other' ? legalBasisOther.trim() : undefined,
        documentVersionId,
      })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('trademarkActions.scope.errors.saveFailed')))
    }
  }

  const busy = recordAction.isPending || uploadDocument.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('trademarkActions.scope.title')}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-muted-foreground">
          {t('trademarkActions.scope.description')}
        </p>

        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t('trademarkActions.scope.classes')}</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              setGoodsRows((rows) => [...rows, { classNumber: 1, description: '' }])
            }
          >
            <Plus className="size-4" />
            {t('createFile.addClass')}
          </Button>
        </div>

        <div className="space-y-3">
          {goodsRows.map((row, index) => (
            <div
              key={`${row.classNumber}-${index}`}
              className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[120px_1fr_auto]"
            >
              <label className="space-y-1.5 text-sm">
                <span className="text-xs text-muted-foreground">
                  {t('createFile.fields.classNumber')}
                </span>
                <Select
                  value={String(row.classNumber)}
                  onValueChange={(v) =>
                    setGoodsRows((rows) =>
                      rows.map((r, i) =>
                        i === index ? { ...r, classNumber: Number(v) } : r,
                      ),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NICE_CLASS_NUMBERS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-xs text-muted-foreground">
                  {t('createFile.fields.goodsText')}
                </span>
                <Textarea
                  rows={2}
                  value={row.description}
                  onChange={(e) =>
                    setGoodsRows((rows) =>
                      rows.map((r, i) =>
                        i === index ? { ...r, description: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder={t('createFile.goodsPlaceholder')}
                />
              </label>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setGoodsRows((rows) => rows.filter((_, i) => i !== index))
                  }
                  disabled={goodsRows.length === 1}
                  aria-label={t('createFile.removeClass')}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <label className="space-y-1.5 text-sm block">
          <span className="text-xs text-muted-foreground">
            {t('trademarkActions.scope.incomingNumber')}
          </span>
          <Input
            value={incomingNumber}
            onChange={(e) => setIncomingNumber(e.target.value)}
            placeholder={t('trademarkActions.scope.incomingPlaceholder')}
          />
        </label>

        <label className="space-y-1.5 text-sm block">
          <span className="text-xs text-muted-foreground">
            {t('trademarkActions.scope.filingDate')}
          </span>
          <Input
            type="date"
            value={filingDate}
            onChange={(e) => setFilingDate(e.target.value)}
          />
        </label>

        <label className="space-y-1.5 text-sm block">
          <span className="text-xs text-muted-foreground">
            {t('trademarkActions.scope.legalBasis')}
          </span>
          <Select
            value={legalBasis}
            onValueChange={(v) => setLegalBasis((v as LegalBasisOption) ?? '')}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('trademarkActions.scope.legalBasisPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {LEGAL_BASIS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`trademarkActions.legalBasis.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {legalBasis === 'other' ? (
          <label className="space-y-1.5 text-sm block">
            <span className="text-xs text-muted-foreground">
              {t('trademarkActions.scope.legalBasisOther')}
            </span>
            <Input
              value={legalBasisOther}
              onChange={(e) => setLegalBasisOther(e.target.value)}
            />
          </label>
        ) : null}

        <label className="space-y-1.5 text-sm block">
          <span className="text-xs text-muted-foreground">
            {t('trademarkActions.scope.attachment')}
          </span>
          <Input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? t('common:loading.saving') : t('common:actions.save')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
