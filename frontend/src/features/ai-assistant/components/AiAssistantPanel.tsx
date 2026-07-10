import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2, Play, Sparkles, Wrench, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { McpToolDefinition } from '../api'
import {
  formatMcpResultMarkdown,
  mcpToolLabel,
} from '../format-tool-result'
import { useMcpCallTool, useMcpTools } from '../hooks/useMcp'
import { MarkdownView } from './MarkdownView'
import { ToolParamFields } from './ToolParamFields'

function matterIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/matters\/([0-9a-f-]{36})(?:\/|$)/i)
  return match?.[1] ?? null
}

function emptyParams(tool: McpToolDefinition | null): Record<string, string> {
  if (!tool) return {}
  const next: Record<string, string> = {}
  for (const key of Object.keys(tool.inputSchema.properties ?? {})) {
    next[key] = ''
  }
  return next
}

function canRunTool(
  tool: McpToolDefinition | null,
  params: Record<string, string>,
  pending: boolean,
): boolean {
  if (!tool || pending) return false
  const required = tool.inputSchema.required ?? []
  if (!required.every((key) => params[key]?.trim())) return false

  // Draft reply needs at least one source email
  if (tool.name === 'generate_draft_reply') {
    return Boolean(
      params.correspondenceId?.trim() || params.unlinkedEmailId?.trim(),
    )
  }
  return true
}

type AiAssistantPanelProps = {
  open: boolean
  onClose: () => void
}

export function AiAssistantPanel({ open, onClose }: AiAssistantPanelProps) {
  const location = useLocation()
  const contextMatterId = useMemo(
    () => matterIdFromPath(location.pathname),
    [location.pathname],
  )

  const toolsQuery = useMcpTools(open)
  const callTool = useMcpCallTool()

  const tools = toolsQuery.data?.tools ?? []
  const [selectedName, setSelectedName] = useState<string>('')
  const [params, setParams] = useState<Record<string, string>>({})
  const [resultMarkdown, setResultMarkdown] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selected =
    tools.find((t) => t.name === selectedName) ?? tools[0] ?? null

  useEffect(() => {
    if (!open || tools.length === 0) return
    if (!selectedName || !tools.some((t) => t.name === selectedName)) {
      setSelectedName(tools[0]!.name)
    }
  }, [open, tools, selectedName])

  useEffect(() => {
    if (!open || !selected) return
    const next = emptyParams(selected)
    if (contextMatterId && 'matterId' in next) {
      next.matterId = contextMatterId
    }
    setParams(next)
    setResultMarkdown(null)
    setError(null)
  }, [open, selected?.name, contextMatterId])

  if (!open) return null

  const propertyKeys = Object.keys(selected?.inputSchema.properties ?? {})
  const required = new Set(selected?.inputSchema.required ?? [])
  const ready = canRunTool(selected, params, callTool.isPending)

  const setParam = (key: string, value: string) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  const handleRun = async () => {
    if (!selected) return
    setError(null)
    setResultMarkdown(null)
    try {
      const parameters: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(params)) {
        const trimmed = value.trim()
        if (trimmed) parameters[key] = trimmed
      }
      const data = await callTool.mutateAsync({
        toolName: selected.name,
        parameters,
      })
      setResultMarkdown(formatMcpResultMarkdown(selected.name, data.result))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Tool call failed'))
    }
  }

  return (
    <div
      className={cn(
        'fixed bottom-24 right-4 z-[60] flex w-[min(100vw-2rem,26rem)] flex-col overflow-hidden rounded-2xl border border-brand-green/15 bg-white shadow-[0_16px_48px_rgba(26,60,52,0.18)]',
        'max-h-[min(70vh,36rem)]',
      )}
      role="dialog"
      aria-label="AI assistant"
    >
      <div className="flex items-center justify-between border-b border-brand-green/10 bg-brand-green px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4" />
          <div>
            <p className="text-sm font-medium leading-none">AI Assistant</p>
            <p className="mt-1 text-[11px] text-white/70">Ask the firm tools</p>
          </div>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label="Close assistant"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {contextMatterId ? (
          <p className="rounded-md bg-brand-green/[0.06] px-2.5 py-1.5 text-xs text-brand-green">
            Matter on this page is pre-selected — you can change it below
          </p>
        ) : null}

        {toolsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading tools…
          </div>
        ) : toolsQuery.isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            {getApiErrorMessage(toolsQuery.error, 'Could not load MCP tools')}
          </p>
        ) : tools.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No tools available for your role.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-brand-green/80">What do you need?</Label>
              <div className="flex flex-col gap-1.5">
                {tools.map((tool) => (
                  <button
                    key={tool.name}
                    type="button"
                    onClick={() => setSelectedName(tool.name)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left transition-colors',
                      selected?.name === tool.name
                        ? 'border-brand-green/30 bg-brand-green/[0.06]'
                        : 'border-brand-green/10 hover:bg-muted/40',
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-brand-green">
                      <Wrench className="size-3.5 shrink-0 opacity-60" />
                      {mcpToolLabel(tool.name)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {tool.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <ToolParamFields
              propertyKeys={propertyKeys}
              required={required}
              params={params}
              onChange={setParam}
              enabled={open}
            />

            {selected?.name === 'generate_draft_reply' &&
            !params.correspondenceId &&
            !params.unlinkedEmailId ? (
              <p className="text-xs text-muted-foreground">
                Pick a correspondence item or a queued email to draft against.
              </p>
            ) : null}

            <Button
              type="button"
              className="w-full"
              disabled={!ready}
              onClick={() => void handleRun()}
            >
              {callTool.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {callTool.isPending ? 'Working…' : 'Run'}
            </Button>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {resultMarkdown ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-brand-green/80">Answer</Label>
                <div className="max-h-56 overflow-auto rounded-lg border border-brand-green/10 bg-brand-light/80 p-3">
                  <MarkdownView markdown={resultMarkdown} />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
