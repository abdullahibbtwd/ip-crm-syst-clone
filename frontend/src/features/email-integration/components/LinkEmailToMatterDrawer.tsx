import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Link2, Loader2, Search } from 'lucide-react'
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
import type { CorrespondenceCategory } from '@/features/correspondence/types'
import {
  CORRESPONDENCE_CATEGORIES,
  CORRESPONDENCE_CATEGORY_LABELS,
} from '@/features/correspondence/utils'
import { mattersApi } from '@/features/matters/api'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useLinkQueuedEmail } from '../hooks/useEmailIntegration'
import type { UnlinkedEmail } from '../types'

type LinkEmailToMatterDrawerProps = {
  emailId: string | null
  emailSubject?: string
  suggestedMatter?: UnlinkedEmail['suggestedMatter']
  fixedMatterId?: string
  fixedMatterTitle?: string
  open: boolean
  onClose: () => void
  onLinked?: () => void
}

function matterSearchLabel(matter: UnlinkedEmail['suggestedMatter']) {
  if (!matter) return ''
  const client =
    matter.client.companyName ??
    [matter.client.firstName, matter.client.lastName].filter(Boolean).join(' ')
  const code = matter.client.internalCode ? `${matter.client.internalCode} · ` : ''
  return `${code}${client} — ${matter.title}`
}

export function LinkEmailToMatterDrawer({
  emailId,
  emailSubject,
  suggestedMatter,
  fixedMatterId,
  fixedMatterTitle,
  open,
  onClose,
  onLinked,
}: LinkEmailToMatterDrawerProps) {
  const linkEmail = useLinkQueuedEmail()
  const [matterSearch, setMatterSearch] = useState('')
  const [category, setCategory] = useState<CorrespondenceCategory>('correspondence')
  const [error, setError] = useState<string | null>(null)
  const [linked, setLinked] = useState(false)

  const { data: matterResults, isFetching: searchingMatters } = useQuery({
    queryKey: ['email-queue-matter-search', matterSearch],
    queryFn: () => mattersApi.list({ search: matterSearch, limit: 8 }),
    enabled: open && !fixedMatterId && matterSearch.trim().length >= 2,
  })

  useEffect(() => {
    if (!open) {
      setError(null)
      setLinked(false)
      return
    }
    setMatterSearch(suggestedMatter ? matterSearchLabel(suggestedMatter) : '')
    setCategory('correspondence')
  }, [open, suggestedMatter])

  const handleLink = async (matterId: string) => {
    if (!emailId) return
    setError(null)
    try {
      await linkEmail.mutateAsync({ id: emailId, matterId, category })
      setLinked(true)
      onLinked?.()
      window.setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to attach email to matter'))
    }
  }

  const title = fixedMatterId ? 'Attach to correspondence' : 'Attach email to matter'

  return (
    <Drawer open={open} onClose={onClose} title={title} className="max-w-md">
      <div className="space-y-4">
        {emailSubject ? (
          <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Email: </span>
            <span className="font-medium">{emailSubject}</span>
          </p>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium">Correspondence category</label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as CorrespondenceCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CORRESPONDENCE_CATEGORIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {CORRESPONDENCE_CATEGORY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {fixedMatterId ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This email will be filed on the current matter&apos;s correspondence register with the
              `.eml` attached.
            </p>
            {fixedMatterTitle ? (
              <p className="rounded-lg border px-3 py-2 text-sm font-medium">{fixedMatterTitle}</p>
            ) : null}
            <Button
              className="w-full"
              disabled={!emailId || linkEmail.isPending || linked}
              onClick={() => void handleLink(fixedMatterId)}
            >
              {linkEmail.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : linked ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Link2 className="size-4" />
              )}
              {linked ? 'Attached' : 'Attach to this matter'}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Matter</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="bg-background pl-9"
                  placeholder="Search client, matter title, or reference…"
                  value={matterSearch}
                  onChange={(e) => setMatterSearch(e.target.value)}
                />
              </div>
            </div>

            {suggestedMatter ? (
              <button
                type="button"
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/10',
                )}
                disabled={linkEmail.isPending}
                onClick={() => void handleLink(suggestedMatter.id)}
              >
                <div>
                  <p className="text-xs text-muted-foreground">Suggested match</p>
                  <p className="font-medium">{matterSearchLabel(suggestedMatter)}</p>
                </div>
                <Link2 className="size-4 shrink-0 text-primary" />
              </button>
            ) : null}

            <div className="space-y-1">
              {searchingMatters ? (
                <p className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </p>
              ) : null}
              {(matterResults?.items ?? []).map((matter) => (
                <button
                  key={matter.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  disabled={linkEmail.isPending}
                  onClick={() => void handleLink(matter.id)}
                >
                  <span className="line-clamp-2 font-medium">{matter.title}</span>
                  <Link2 className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </>
        )}

        {linked ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" />
            Email attached to matter correspondence.
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </Drawer>
  )
}
