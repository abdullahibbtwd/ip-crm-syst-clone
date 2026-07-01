import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { DeadlineAssigneeSelect } from '@/features/deadlines/components/DeadlineAssigneeSelect'
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
import { Textarea } from '@/components/ui/textarea'
import { useCreateDeadline } from '@/features/deadlines/hooks/useDeadlines'
import { JURISDICTION_OPTIONS } from '@/features/deadlines/utils'
import { mattersApi } from '@/features/matters/api'
import { matterKeys } from '@/features/matters/queryKeys'
import { cn } from '@/lib/utils'

type CreateDeadlineDrawerProps = {
  open: boolean
  onClose: () => void
}

export function CreateDeadlineDrawer({ open, onClose }: CreateDeadlineDrawerProps) {
  const [matterId, setMatterId] = useState('')
  const [matterSearch, setMatterSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showMatterList, setShowMatterList] = useState(false)
  const [title, setTitle] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [graceDate, setGraceDate] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createDeadline = useCreateDeadline()

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(matterSearch.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [matterSearch])

  const shouldSearch = open && debouncedSearch.length >= 2
  const { data: mattersData, isFetching: mattersLoading } = useQuery({
    queryKey: matterKeys.list({ search: debouncedSearch, limit: 10 }),
    queryFn: () => mattersApi.list({ search: debouncedSearch, limit: 10 }),
    enabled: shouldSearch,
  })

  const selectedMatterLabel = useMemo(() => {
    if (!matterId) return ''
    const fromResults = mattersData?.items.find((m) => m.id === matterId)
    if (fromResults) return fromResults.title
    return matterSearch
  }, [matterId, mattersData?.items, matterSearch])

  const resetForm = () => {
    setMatterId('')
    setMatterSearch('')
    setTitle('')
    setJurisdiction('')
    setDueDate('')
    setGraceDate('')
    setAssignedToId('')
    setNotes('')
    setError(null)
    setShowMatterList(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!matterId || !title.trim() || !jurisdiction || !dueDate || !assignedToId) {
      setError('Matter, title, jurisdiction, due date, and assignee are required.')
      return
    }

    try {
      await createDeadline.mutateAsync({
        matterId,
        title: title.trim(),
        jurisdiction,
        dueDate,
        graceDate: graceDate || undefined,
        assignedToId,
        notes: notes.trim() || undefined,
      })
      handleClose()
    } catch {
      setError('Could not create deadline. Check the form and try again.')
    }
  }

  return (
    <Drawer open={open} onClose={handleClose} title="New deadline" className="max-w-lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="deadline-matter">Matter</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="deadline-matter"
              className="bg-background pl-9"
              placeholder="Search matters…"
              value={matterId ? selectedMatterLabel : matterSearch}
              onChange={(e) => {
                setMatterId('')
                setMatterSearch(e.target.value)
                setShowMatterList(true)
              }}
              onFocus={() => setShowMatterList(true)}
            />
            {showMatterList && debouncedSearch.length >= 2 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-background shadow-md">
                {mattersLoading ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
                ) : mattersData?.items.length ? (
                  mattersData.items.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={cn(
                        'block w-full px-3 py-2 text-left text-sm hover:bg-muted',
                        matterId === m.id && 'bg-muted',
                      )}
                      onClick={() => {
                        setMatterId(m.id)
                        setMatterSearch(m.title)
                        setShowMatterList(false)
                      }}
                    >
                      <span className="font-medium">{m.title}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No matters found.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deadline-title">Title</Label>
          <Input
            id="deadline-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Respond to Romanian local partner request"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deadline-jurisdiction">Jurisdiction</Label>
          <Select value={jurisdiction} onValueChange={(v) => setJurisdiction(v ?? '')}>
            <SelectTrigger id="deadline-jurisdiction">
              <SelectValue placeholder="Select jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              {JURISDICTION_OPTIONS.map((j) => (
                <SelectItem key={j.value} value={j.value}>
                  {j.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="deadline-due">Due date</Label>
            <Input
              id="deadline-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deadline-grace">Grace date (optional)</Label>
            <Input
              id="deadline-grace"
              type="date"
              value={graceDate}
              onChange={(e) => setGraceDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deadline-assignee">Assigned to</Label>
          <DeadlineAssigneeSelect
            id="deadline-assignee"
            value={assignedToId}
            onValueChange={setAssignedToId}
            enabled={open}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deadline-notes">Notes (optional)</Label>
          <Textarea
            id="deadline-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional context for the assignee"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createDeadline.isPending}>
            {createDeadline.isPending ? 'Saving…' : 'Save deadline'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
