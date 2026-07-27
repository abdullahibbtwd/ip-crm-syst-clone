import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookMarked, Pencil, Plus, Search } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { RoleGate } from '@/components/permissions/RoleGate'
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
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { matterTypeLabel, MATTER_TYPE_LABELS } from '@/features/matters/utils'
import type { MatterType } from '@/features/matters/types'
import {
  useArchivePrecedent,
  useCreatePrecedent,
  usePrecedent,
  usePrecedents,
  usePublishPrecedent,
  useUpdatePrecedent,
} from '@/features/precedents/hooks/usePrecedents'
import type { Precedent, PrecedentStatus } from '@/features/precedents/types'
import { getApiErrorMessage } from '@/lib/api-client'
import { SYSTEM_ROLES } from '@/lib/rbac'

const MATTER_TYPES = Object.keys(MATTER_TYPE_LABELS) as MatterType[]
const STATUS_OPTIONS: Array<PrecedentStatus | 'all'> = [
  'all',
  'draft',
  'published',
  'archived',
]

function statusVariant(
  status: PrecedentStatus,
): 'default' | 'secondary' | 'outline' | 'success' {
  if (status === 'published') return 'success'
  if (status === 'draft') return 'secondary'
  return 'outline'
}

function PrecedentDrawer({
  open,
  onClose,
  precedentId,
}: {
  open: boolean
  onClose: () => void
  precedentId: string | null
}) {
  const { t } = useTranslation('precedents')
  const { t: tCommon } = useTranslation('common')
  const { data: detail } = usePrecedent(precedentId)
  const create = useCreatePrecedent()
  const update = useUpdatePrecedent()
  const publish = usePublishPrecedent()
  const archive = useArchivePrecedent()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [matterType, setMatterType] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [tags, setTags] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (detail && precedentId) {
      setTitle(detail.title)
      setCategory(detail.category)
      setMatterType(detail.matterType ?? '')
      setJurisdiction(detail.jurisdiction ?? '')
      setTags(detail.tags.join(', '))
      setBodyHtml(detail.bodyHtml)
    } else if (!precedentId) {
      setTitle('')
      setCategory('general')
      setMatterType('')
      setJurisdiction('')
      setTags('')
      setBodyHtml('<p></p>')
    }
    setError(null)
  }, [open, detail, precedentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (
      !title.trim() ||
      !category.trim() ||
      !bodyHtml.replace(/<[^>]+>/g, '').trim()
    ) {
      setError(t('drawer.requiredFields'))
      return
    }
    const payload = {
      title: title.trim(),
      category: category.trim(),
      bodyHtml: bodyHtml.trim(),
      matterType: matterType || undefined,
      jurisdiction: jurisdiction.trim() || undefined,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }
    try {
      if (precedentId) {
        await update.mutateAsync({ id: precedentId, data: payload })
      } else {
        await create.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('drawer.saveFailed')))
    }
  }

  if (!open) return null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={precedentId ? t('drawer.editTitle') : t('drawer.createTitle')}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">{t('drawer.title')}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">{t('drawer.category')}</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('drawer.matterType')}</Label>
            <Select value={matterType || undefined} onValueChange={(v) => setMatterType(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder={t('drawer.optional')} />
              </SelectTrigger>
              <SelectContent>
                {MATTER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {matterTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jurisdiction">{t('drawer.jurisdiction')}</Label>
            <Input
              id="jurisdiction"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">{t('drawer.tags')}</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t('drawer.body')}</Label>
          <RichTextEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholder={t('drawer.bodyPlaceholder')}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {precedentId && detail?.status !== 'published' ? (
              <RoleGate roles={[SYSTEM_ROLES.MANAGING_PARTNER]}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={publish.isPending}
                  onClick={async () => {
                    try {
                      await publish.mutateAsync(precedentId)
                      onClose()
                    } catch (err) {
                      setError(getApiErrorMessage(err, t('drawer.publishFailed')))
                    }
                  }}
                >
                  {t('drawer.publish')}
                </Button>
              </RoleGate>
            ) : null}
            {precedentId && detail?.status !== 'archived' ? (
              <Button
                type="button"
                variant="outline"
                disabled={archive.isPending}
                onClick={async () => {
                  try {
                    await archive.mutateAsync(precedentId)
                    onClose()
                  } catch (err) {
                    setError(getApiErrorMessage(err, t('drawer.archiveFailed')))
                  }
                }}
              >
                {t('drawer.archive')}
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon('actions.cancel')}
            </Button>
            <PermissionGate resource="precedent" action={precedentId ? 'update' : 'create'}>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {tCommon('actions.save')}
              </Button>
            </PermissionGate>
          </div>
        </div>
      </form>
    </Drawer>
  )
}

export function PrecedentsPage() {
  const { t } = useTranslation('precedents')
  const { t: tCommon } = useTranslation('common')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [status, setStatus] = useState<PrecedentStatus | 'all'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [q])

  const { data, isLoading, isError } = usePrecedents({
    q: debouncedQ || undefined,
    status: status === 'all' ? undefined : status,
    limit: 100,
  })

  const openCreate = () => {
    setEditingId(null)
    setDrawerOpen(true)
  }

  const openEdit = (row: Precedent) => {
    setEditingId(row.id)
    setDrawerOpen(true)
  }

  const statusLabel = (value: PrecedentStatus | 'all') => {
    if (value === 'all') return t('filters.allStatuses')
    return t(`status.${value}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-2xl">
            <BookMarked className="size-6 text-primary" />
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <PermissionGate resource="precedent" action="create">
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t('newDraft')}
          </Button>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus((v as PrecedentStatus | 'all') ?? 'all')}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{t('loadFailed')}</p>
      ) : !(data?.length) ? (
        <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.title')}</TableHead>
              <TableHead>{t('columns.category')}</TableHead>
              <TableHead>{t('columns.jurisdiction')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead>{t('columns.updated')}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.title}</TableCell>
                <TableCell className="text-muted-foreground">{row.category}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.jurisdiction ?? tCommon('yesNo.dash')}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(row.status)} className="normal-case">
                    {t(`status.${row.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(row.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openEdit(row)}
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only">{t('editAria')}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PrecedentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        precedentId={editingId}
      />
    </div>
  )
}
