import { useEffect, useState } from 'react'
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
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
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
      setError('Title, category, and body are required')
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
        .map((t) => t.trim())
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
      setError(getApiErrorMessage(err, 'Could not save precedent'))
    }
  }

  if (!open) return null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={precedentId ? 'Edit precedent' : 'New precedent'}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Matter type</Label>
            <Select value={matterType || undefined} onValueChange={(v) => setMatterType(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {MATTER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {MATTER_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jurisdiction">Jurisdiction</Label>
            <Input
              id="jurisdiction"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Body</Label>
          <RichTextEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Write the precedent text — bold, italic, and lists are supported"
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
                      setError(getApiErrorMessage(err, 'Publish failed'))
                    }
                  }}
                >
                  Publish
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
                    setError(getApiErrorMessage(err, 'Archive failed'))
                  }
                }}
              >
                Archive
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <PermissionGate resource="precedent" action={precedentId ? 'update' : 'create'}>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                Save
              </Button>
            </PermissionGate>
          </div>
        </div>
      </form>
    </Drawer>
  )
}

export function PrecedentsPage() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [status, setStatus] = useState<PrecedentStatus | 'all'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => window.clearTimeout(t)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-2xl">
            <BookMarked className="size-6 text-primary" />
            Precedents
          </h1>
          <p className="text-sm text-muted-foreground">
            Knowledge base of reusable correspondence and filing language.
          </p>
        </div>
        <PermissionGate resource="precedent" action="create">
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New draft
          </Button>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search body text…"
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
                {s === 'all' ? 'All statuses' : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading precedents…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load precedents.</p>
      ) : !(data?.length) ? (
        <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No precedents yet. Create a draft or harvest from correspondence.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Jurisdiction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.title}</TableCell>
                <TableCell className="text-muted-foreground">{row.category}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.jurisdiction ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(row.status)} className="normal-case">
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(row.updatedAt).toLocaleDateString('en-GB')}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openEdit(row)}
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only">Edit</span>
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
