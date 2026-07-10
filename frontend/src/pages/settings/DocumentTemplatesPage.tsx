import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Pencil, Plus } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateDocumentTemplate,
  useDocumentTemplate,
  useDocumentTemplatesAdmin,
  useMergeFields,
  usePreviewDocumentTemplate,
  useUpdateDocumentTemplate,
} from '@/features/document-templates/hooks/useDocumentTemplates'
import type { DocumentTemplateAdmin } from '@/features/document-templates/types'
import type { DocumentCategory } from '@/features/documents/types'
import { DOCUMENT_CATEGORY_LABELS } from '@/features/documents/utils'
import { getApiErrorMessage } from '@/lib/api-client'

const CATEGORIES = Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[]

/** Sample values for client-side HTML preview (mirrors backend sample context). */
const SAMPLE_MERGE_VALUES: Record<string, string> = {
  firmName: 'IP Consulting',
  firmAddressLine1: '76A James Bourchier Blvd.',
  firmAddressLine2: '1407 Sofia, Bulgaria',
  firmWebsite: 'www.ipconsulting.eu',
  firmPhone: '+359 2 123 4567',
  firmEmail: 'office@ipconsulting.eu',
  letterDate: new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  clientName: 'Acme Holdings Ltd',
  clientAddress: '1 Example Street, Sofia, Bulgaria',
  matterTitle: 'Sample Trademark Matter',
  matterType: 'trademark',
  referenceLine: 'Our ref: CL-2026-001 / Sample Trademark Matter',
  applicationNumber: 'EU-012345678',
  registrationNumber: '—',
  filingDate: '2026-01-15',
  jurisdiction: 'EU',
  ipRightTitle: 'ACME Mark',
  attorneyName: 'Jane Attorney',
  attorneyTitle: 'European Trademark & Patent Attorney',
}

function applySampleMerge(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => SAMPLE_MERGE_VALUES[key] ?? `{{${key}}}`)
}

function insertAtCursor(
  textarea: HTMLTextAreaElement | null,
  value: string,
  current: string,
  setValue: (next: string) => void,
) {
  if (!textarea) {
    setValue(current + value)
    return
  }
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const next = current.slice(0, start) + value + current.slice(end)
  setValue(next)
  requestAnimationFrame(() => {
    textarea.focus()
    const pos = start + value.length
    textarea.setSelectionRange(pos, pos)
  })
}

function DocumentTemplateDrawer({
  open,
  onClose,
  templateId,
}: {
  open: boolean
  onClose: () => void
  templateId: string | null
}) {
  const { t } = useTranslation('settings')
  const isEdit = Boolean(templateId)
  const { data: detail, isLoading: detailLoading } = useDocumentTemplate(
    open && templateId ? templateId : undefined,
  )
  const { data: mergeFieldsData } = useMergeFields()
  const createTemplate = useCreateDocumentTemplate()
  const updateTemplate = useUpdateDocumentTemplate()
  const previewPdf = usePreviewDocumentTemplate()

  const htmlRef = useRef<HTMLTextAreaElement>(null)
  const refLineRef = useRef<HTMLTextAreaElement>(null)
  const [insertTarget, setInsertTarget] = useState<'html' | 'reference'>('html')

  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('correspondence')
  const [description, setDescription] = useState('')
  const [referenceLine, setReferenceLine] = useState('')
  const [htmlBody, setHtmlBody] = useState('<p>Dear {{clientName}},</p>\n<p></p>')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (isEdit && detail) {
      setSlug(detail.slug)
      setName(detail.name)
      setCategory(detail.category)
      setDescription(detail.description ?? '')
      setReferenceLine(detail.referenceLine ?? '')
      setHtmlBody(detail.htmlBody)
      setIsActive(detail.isActive)
      setError(null)
    } else if (!isEdit) {
      setSlug('')
      setName('')
      setCategory('correspondence')
      setDescription('')
      setReferenceLine('')
      setHtmlBody('<p>Dear {{clientName}},</p>\n<p></p>')
      setIsActive(true)
      setError(null)
    }
  }, [open, isEdit, detail])

  const mergeFields = mergeFieldsData?.fields ?? Object.keys(SAMPLE_MERGE_VALUES)

  const handleInsertField = (field: string) => {
    const token = `{{${field}}}`
    if (insertTarget === 'reference') {
      insertAtCursor(refLineRef.current, token, referenceLine, setReferenceLine)
    } else {
      insertAtCursor(htmlRef.current, token, htmlBody, setHtmlBody)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !htmlBody.trim()) {
      setError(t('documentTemplates.errors.required'))
      return
    }
    if (!isEdit && !slug.trim()) {
      setError(t('documentTemplates.errors.slugRequired'))
      return
    }

    try {
      if (isEdit && templateId) {
        await updateTemplate.mutateAsync({
          id: templateId,
          data: {
            name: name.trim(),
            category,
            description: description.trim() || null,
            referenceLine: referenceLine.trim() || null,
            htmlBody,
            isActive,
          },
        })
      } else {
        await createTemplate.mutateAsync({
          slug: slug.trim().toLowerCase(),
          name: name.trim(),
          category,
          description: description.trim() || undefined,
          referenceLine: referenceLine.trim() || undefined,
          htmlBody,
        })
      }
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('documentTemplates.errors.saveFailed')))
    }
  }

  const handlePreviewPdf = async () => {
    setError(null)
    try {
      await previewPdf.mutateAsync({
        id: templateId ?? undefined,
        htmlBody,
        referenceLine: referenceLine.trim() || null,
      })
    } catch (err) {
      setError(getApiErrorMessage(err, t('documentTemplates.errors.previewFailed')))
    }
  }

  const pending = createTemplate.isPending || updateTemplate.isPending
  const previewHtml = applySampleMerge(htmlBody)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? t('documentTemplates.drawer.editTitle')
          : t('documentTemplates.drawer.createTitle')
      }
      className="max-w-3xl"
    >
      {isEdit && detailLoading ? (
        <p className="text-sm text-muted-foreground">{t('documentTemplates.drawer.loading')}</p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="tpl-slug">{t('documentTemplates.drawer.slug')}</Label>
              <Input
                id="tpl-slug"
                placeholder="filing-cover-letter"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('documentTemplates.drawer.slugHint')}
              </p>
            </div>
          )}

          {isEdit && (
            <p className="text-xs text-muted-foreground">
              {t('documentTemplates.drawer.slugReadonly')}{' '}
              <code className="rounded bg-muted px-1">{slug}</code>
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="tpl-name">{t('documentTemplates.drawer.name')}</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('documentTemplates.drawer.category')}</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory((v as DocumentCategory) ?? 'correspondence')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {DOCUMENT_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-description">{t('documentTemplates.drawer.description')}</Label>
            <Textarea
              id="tpl-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-ref">{t('documentTemplates.drawer.referenceLine')}</Label>
            <Textarea
              id="tpl-ref"
              ref={refLineRef}
              rows={2}
              className="font-mono text-xs"
              value={referenceLine}
              onFocus={() => setInsertTarget('reference')}
              onChange={(e) => setReferenceLine(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t('documentTemplates.drawer.mergeFields')}</Label>
              <span className="text-xs text-muted-foreground">
                {insertTarget === 'reference'
                  ? t('documentTemplates.drawer.insertIntoReference')
                  : t('documentTemplates.drawer.insertIntoHtml')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mergeFields.map((field) => (
                <Button
                  key={field}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 font-mono text-xs"
                  onClick={() => handleInsertField(field)}
                >
                  {`{{${field}}}`}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-html">{t('documentTemplates.drawer.htmlBody')}</Label>
              <Textarea
                id="tpl-html"
                ref={htmlRef}
                rows={14}
                className="font-mono text-xs"
                value={htmlBody}
                onFocus={() => setInsertTarget('html')}
                onChange={(e) => setHtmlBody(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('documentTemplates.drawer.livePreview')}</Label>
              <div
                className="prose prose-sm max-h-[320px] overflow-y-auto rounded-md border bg-background p-3 text-sm"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label>{t('documentTemplates.drawer.status')}</Label>
              <Select
                value={isActive ? 'active' : 'inactive'}
                onValueChange={(v) => setIsActive(v === 'active')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('documentTemplates.status.active')}</SelectItem>
                  <SelectItem value="inactive">
                    {t('documentTemplates.status.inactive')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={previewPdf.isPending || !htmlBody.trim()}
              onClick={handlePreviewPdf}
            >
              <Eye className="mr-1 size-4" />
              {t('documentTemplates.drawer.previewPdf')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('documentTemplates.drawer.cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {isEdit
                ? t('documentTemplates.drawer.save')
                : t('documentTemplates.drawer.create')}
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  )
}

export function DocumentTemplatesPage() {
  const { t } = useTranslation('settings')
  const { data: templates, isLoading, isError } = useDocumentTemplatesAdmin()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <PermissionGate
      resource="document"
      action="read"
      fallback={
        <p className="text-sm text-muted-foreground">{t('documentTemplates.noPermission')}</p>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl text-foreground md:text-3xl">
              {t('documentTemplates.title')}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {t('documentTemplates.subtitle')}
            </p>
          </div>
          <PermissionGate resource="document" action="create">
            <Button
              type="button"
              onClick={() => {
                setEditingId(null)
                setDrawerOpen(true)
              }}
            >
              <Plus className="mr-1 size-4" />
              {t('documentTemplates.newTemplate')}
            </Button>
          </PermissionGate>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">{t('documentTemplates.loading')}</p>
        )}
        {isError && (
          <p className="text-sm text-destructive">{t('documentTemplates.loadError')}</p>
        )}

        {templates && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('documentTemplates.columns.name')}</TableHead>
                <TableHead>{t('documentTemplates.columns.slug')}</TableHead>
                <TableHead>{t('documentTemplates.columns.category')}</TableHead>
                <TableHead>{t('documentTemplates.columns.status')}</TableHead>
                <TableHead>{t('documentTemplates.columns.updated')}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t('documentTemplates.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((tpl: DocumentTemplateAdmin) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-medium">{tpl.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {tpl.slug}
                    </TableCell>
                    <TableCell>
                      {DOCUMENT_CATEGORY_LABELS[tpl.category] ?? tpl.category}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tpl.isActive ? 'info' : 'secondary'}>
                        {tpl.isActive
                          ? t('documentTemplates.status.active')
                          : t('documentTemplates.status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(tpl.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <PermissionGate resource="document" action="update">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingId(tpl.id)
                            setDrawerOpen(true)
                          }}
                          aria-label={t('documentTemplates.editAria')}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <DocumentTemplateDrawer
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false)
            setEditingId(null)
          }}
          templateId={editingId}
        />
      </div>
    </PermissionGate>
  )
}
