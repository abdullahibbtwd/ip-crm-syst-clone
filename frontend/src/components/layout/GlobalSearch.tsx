import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  FileText,
  FolderOpen,
  Loader2,
  Mail,
  Search,
  X,
} from 'lucide-react'
import { useGlobalSearch } from '@/features/search/hooks/useGlobalSearch'
import type { SearchHit, SearchResultType } from '@/features/search/api'
import { cn } from '@/lib/utils'

const TYPE_LABEL: Record<SearchResultType, string> = {
  client: 'Client',
  matter: 'Matter',
  correspondence: 'Email / correspondence',
  document: 'Document',
  unlinked_email: 'Email queue',
}

function TypeIcon({ type }: { type: SearchResultType }) {
  const className = 'size-3.5 shrink-0 text-muted-foreground'
  switch (type) {
    case 'client':
      return <Building2 className={className} />
    case 'matter':
      return <FolderOpen className={className} />
    case 'document':
      return <FileText className={className} />
    case 'correspondence':
    case 'unlinked_email':
      return <Mail className={className} />
    default:
      return <Search className={className} />
  }
}

function HighlightSnippet({ text }: { text: string }) {
  const parts = text.split(/(<<|>>)/)
  const nodes: ReactNode[] = []
  let bold = false
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part === '<<') {
      bold = true
      continue
    }
    if (part === '>>') {
      bold = false
      continue
    }
    if (!part) continue
    nodes.push(
      bold ? (
        <strong key={i} className="font-semibold text-foreground">
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
  }
  return (
    <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{nodes}</span>
  )
}

type GlobalSearchProps = {
  external?: boolean
}

export function GlobalSearch({ external }: GlobalSearchProps) {
  const navigate = useNavigate()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const { data, isFetching, isError } = useGlobalSearch(q, open)

  const results = data?.results ?? []

  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        queueMicrotask(() => inputRef.current?.focus())
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  const go = (hit: SearchHit) => {
    setOpen(false)
    setQ('')
    navigate(hit.href)
  }

  const showPanel = open && (q.trim().length >= 2 || isFetching)

  return (
    <div ref={rootRef} className="relative hidden min-w-0 flex-1 md:block md:max-w-md lg:max-w-lg">
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors',
          external
            ? 'border-white/15 bg-white/5 focus-within:border-emerald-400/40'
            : 'border-brand-green/15 bg-brand-green/[0.03] focus-within:border-primary/35',
        )}
      >
        <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!showPanel || results.length === 0) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((i) => Math.min(i + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const hit = results[activeIndex]
              if (hit) go(hit)
            }
          }}
          placeholder="Search clients, matters, emails…"
          aria-label="Global search"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showPanel}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70',
            external ? 'text-white' : 'text-foreground',
          )}
        />
        {isFetching ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : q ? (
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
            onClick={() => {
              setQ('')
              inputRef.current?.focus()
            }}
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd
            className={cn(
              'hidden rounded border px-1 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline',
              external ? 'border-white/20' : 'border-border',
            )}
          >
            ⌘K
          </kbd>
        )}
      </div>

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className={cn(
            'absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[min(420px,70vh)] overflow-y-auto rounded-xl border shadow-lg',
            external
              ? 'border-white/15 bg-zinc-950/95 text-white backdrop-blur-xl'
              : 'border-border bg-popover text-popover-foreground',
          )}
        >
          {isError ? (
            <p className="px-3 py-4 text-sm text-destructive">Search failed. Try again.</p>
          ) : q.trim().length < 2 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Type at least 2 characters.</p>
          ) : results.length === 0 && !isFetching ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">No matches for “{q.trim()}”.</p>
          ) : (
            <ul className="py-1">
              {results.map((hit, index) => (
                <li key={`${hit.type}-${hit.id}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                      index === activeIndex
                        ? external
                          ? 'bg-white/10'
                          : 'bg-muted'
                        : 'hover:bg-muted/60',
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(hit)}
                  >
                    <span className="mt-0.5">
                      <TypeIcon type={hit.type} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{hit.title}</span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {TYPE_LABEL[hit.type]}
                        </span>
                      </span>
                      {hit.subtitle ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {hit.subtitle}
                        </span>
                      ) : null}
                      {hit.snippet ? <HighlightSnippet text={hit.snippet} /> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
