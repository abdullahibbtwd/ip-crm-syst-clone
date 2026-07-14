import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeightClass?: string
}

type FormatState = {
  bold: boolean
  italic: boolean
  underline: boolean
  unorderedList: boolean
  orderedList: boolean
}

const EMPTY_FORMAT: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  unorderedList: false,
  orderedList: false,
}

function ToolbarButton({
  label,
  active,
  onMouseDown,
  children,
}: {
  label: string
  active?: boolean
  onMouseDown: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      aria-pressed={active ?? false}
      className={cn(
        active &&
          'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary',
      )}
      onMouseDown={(e) => {
        e.preventDefault()
        onMouseDown()
      }}
    >
      {children}
    </Button>
  )
}

/** Simple WYSIWYG editor: writes like a normal doc, stores HTML. */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
  className,
  minHeightClass = 'min-h-[220px]',
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [format, setFormat] = useState<FormatState>(EMPTY_FORMAT)

  const syncFormat = useCallback(() => {
    const el = ref.current
    if (!el) return
    const sel = document.getSelection()
    if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
      setFormat(EMPTY_FORMAT)
      return
    }
    setFormat({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      unorderedList: document.queryCommandState('insertUnorderedList'),
      orderedList: document.queryCommandState('insertOrderedList'),
    })
  }, [])

  /** Avoid wiping the caret while the user is typing in this field. */
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement === el) return
    if (el.innerHTML !== value) {
      el.innerHTML = value || ''
    }
  }, [value])

  useEffect(() => {
    const onSelectionChange = () => syncFormat()
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [syncFormat])

  const run = (command: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, arg)
    if (ref.current) onChange(ref.current.innerHTML)
    syncFormat()
  }

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML)
    syncFormat()
  }

  const empty =
    !value ||
    value === '<p></p>' ||
    value === '<br>' ||
    value.replace(/<[^>]+>/g, '').trim() === ''

  return (
    <div className={cn('overflow-hidden rounded-md border bg-background', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1 py-1">
        <ToolbarButton
          label="Bold"
          active={format.bold}
          onMouseDown={() => run('bold')}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={format.italic}
          onMouseDown={() => run('italic')}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={format.underline}
          onMouseDown={() => run('underline')}
        >
          <Underline className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          label="Bullet list"
          active={format.unorderedList}
          onMouseDown={() => run('insertUnorderedList')}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={format.orderedList}
          onMouseDown={() => run('insertOrderedList')}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton label="Undo" onMouseDown={() => run('undo')}>
          <Undo2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Redo" onMouseDown={() => run('redo')}>
          <Redo2 className="size-3.5" />
        </ToolbarButton>
      </div>

      <div className="relative">
        {empty ? (
          <p className="pointer-events-none absolute top-3 left-3 text-sm text-muted-foreground">
            {placeholder}
          </p>
        ) : null}
        <div
          ref={ref}
          contentEditable
          role="textbox"
          aria-multiline
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleInput}
          onKeyUp={syncFormat}
          onMouseUp={syncFormat}
          className={cn(
            'px-3 py-3 text-sm leading-relaxed outline-none',
            '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
            '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
            '[&_p]:my-1 [&_a]:text-primary [&_a]:underline',
            minHeightClass,
          )}
        />
      </div>
    </div>
  )
}
