import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePrecedents } from '../hooks/usePrecedents'
import type { Precedent } from '../types'
import { cn } from '@/lib/utils'

type InsertPrecedentPickerProps = {
  onInsert: (bodyHtml: string, title: string) => void
  className?: string
}

/** Debounced published-precedent search; selecting appends body into a draft composer. */
export function InsertPrecedentPicker({ onInsert, className }: InsertPrecedentPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data: results, isFetching } = usePrecedents(
    { q: debounced || undefined, status: 'published', limit: 10 },
    open && (debounced.length >= 2 || debounced.length === 0),
  )

  const handleSelect = (row: Precedent) => {
    onInsert(row.bodyHtml, row.title)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
      >
        Insert precedent
      </Button>
      {open ? (
        <div className="absolute z-20 mt-1 w-80 rounded-md border bg-popover p-2 shadow-md">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-2.5 left-2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search published precedents…"
              className="h-9 pl-8"
              autoFocus
            />
          </div>
          <div className="max-h-52 space-y-1 overflow-y-auto">
            {isFetching ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">Searching…</p>
            ) : !(results?.length) ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                {debounced.length >= 2
                  ? 'No published precedents match.'
                  : 'Type to search, or browse recent published.'}
              </p>
            ) : (
              results.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => handleSelect(row)}
                >
                  <span className="text-sm font-medium">{row.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.category}
                    {row.jurisdiction ? ` · ${row.jurisdiction}` : ''}
                  </span>
                </button>
              ))
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 w-full"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </div>
      ) : null}
    </div>
  )
}
