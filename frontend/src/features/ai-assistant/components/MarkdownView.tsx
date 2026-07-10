import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type MarkdownViewProps = {
  markdown: string
  className?: string
}

/**
 * Lightweight markdown renderer for assistant results
 * (headings, lists, bold, paragraphs — no raw HTML).
 */
export function MarkdownView({ markdown, className }: MarkdownViewProps) {
  const blocks = markdown.trim().split(/\n{2,}/)

  return (
    <div
      className={cn(
        'space-y-3 text-sm leading-relaxed text-brand-green',
        className,
      )}
    >
      {blocks.map((block, i) => (
        <Block key={i} text={block.trim()} />
      ))}
    </div>
  )
}

function Block({ text }: { text: string }) {
  if (!text) return null

  if (text.startsWith('### ')) {
    return (
      <h4 className="font-serif text-sm font-semibold text-brand-green">
        {inline(text.slice(4))}
      </h4>
    )
  }
  if (text.startsWith('## ')) {
    return (
      <h3 className="font-serif text-base font-semibold text-brand-green">
        {inline(text.slice(3))}
      </h3>
    )
  }
  if (text.startsWith('# ')) {
    return (
      <h2 className="font-serif text-lg font-semibold text-brand-green">
        {inline(text.slice(2))}
      </h2>
    )
  }

  const lines = text.split('\n')
  if (lines.every((l) => l.startsWith('- ') || l.trim() === '')) {
    return (
      <ul className="list-disc space-y-1 pl-4 text-brand-green/90">
        {lines
          .filter((l) => l.startsWith('- '))
          .map((l, i) => (
            <li key={i}>{inline(l.slice(2))}</li>
          ))}
      </ul>
    )
  }

  return (
    <p className="whitespace-pre-wrap text-brand-green/90">
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 ? <br /> : null}
          {inline(line)}
        </span>
      ))}
    </p>
  )
}

function inline(text: string): ReactNode {
  const parts: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|_([^_]+)_|`([^`]+)`/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    if (match[1]) {
      parts.push(
        <strong key={key++} className="font-semibold text-brand-green">
          {match[1]}
        </strong>,
      )
    } else if (match[2]) {
      parts.push(
        <em key={key++} className="italic">
          {match[2]}
        </em>,
      )
    } else if (match[3]) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-brand-green/10 px-1 py-0.5 font-mono text-[11px]"
        >
          {match[3]}
        </code>,
      )
    }
    last = match.index + match[0].length
  }

  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 ? parts[0] : parts
}
