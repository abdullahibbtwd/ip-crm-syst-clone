import { useEffect, useState } from 'react'
import { Drawer } from '@/components/crm/Drawer'
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
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
import type { MatterType } from '@/features/matters/types'
import { getApiErrorMessage } from '@/lib/api-client'
import { useHarvestPrecedent } from '../hooks/usePrecedents'

const MATTER_TYPES = Object.keys(MATTER_TYPE_LABELS) as MatterType[]

type SaveAsPrecedentDrawerProps = {
  open: boolean
  onClose: () => void
  correspondenceId: string
  defaultTitle: string
  defaultMatterType?: MatterType | string | null
}

export function SaveAsPrecedentDrawer({
  open,
  onClose,
  correspondenceId,
  defaultTitle,
  defaultMatterType,
}: SaveAsPrecedentDrawerProps) {
  const harvest = useHarvestPrecedent()
  const [title, setTitle] = useState(defaultTitle)
  const [category, setCategory] = useState('correspondence')
  const [matterType, setMatterType] = useState<string>(defaultMatterType ?? '')
  const [jurisdiction, setJurisdiction] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(defaultTitle)
    setCategory('correspondence')
    setMatterType(defaultMatterType ?? '')
    setJurisdiction('')
    setTags('')
    setError(null)
  }, [open, defaultTitle, defaultMatterType])

  const handleClose = () => {
    setError(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim() || !category.trim()) {
      setError('Title and category are required')
      return
    }
    try {
      await harvest.mutateAsync({
        correspondenceId,
        data: {
          title: title.trim(),
          category: category.trim(),
          matterType: matterType || undefined,
          jurisdiction: jurisdiction.trim() || undefined,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        },
      })
      handleClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save as precedent'))
    }
  }

  if (!open) return null

  return (
    <Drawer open={open} onClose={handleClose} title="Save as precedent" className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Creates a draft precedent from this correspondence body for the knowledge base.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="prec-title">Title</Label>
          <Input
            id="prec-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prec-category">Category</Label>
          <Input
            id="prec-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Matter type</Label>
          <Select
            value={matterType || undefined}
            onValueChange={(v) => setMatterType(v ?? '')}
          >
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
          <Label htmlFor="prec-jurisdiction">Jurisdiction</Label>
          <Input
            id="prec-jurisdiction"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            placeholder="e.g. EU, BG"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prec-tags">Tags (comma-separated)</Label>
          <Input id="prec-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={harvest.isPending}>
            {harvest.isPending ? 'Saving…' : 'Save draft'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
