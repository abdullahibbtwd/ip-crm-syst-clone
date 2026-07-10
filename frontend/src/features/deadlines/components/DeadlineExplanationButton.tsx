import { useState } from 'react'
import { Info, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { deadlineAiApi } from '@/features/ai/api'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type DeadlineExplanationButtonProps = {
  deadlineId: string
  className?: string
}

export function DeadlineExplanationButton({
  deadlineId,
  className,
}: DeadlineExplanationButtonProps) {
  const [open, setOpen] = useState(false)

  const query = useQuery({
    queryKey: ['deadline-explanation', deadlineId],
    queryFn: () => deadlineAiApi.explanation(deadlineId),
    enabled: open,
    staleTime: 7 * 24 * 60 * 60 * 1000,
  })

  return (
    <PermissionGate resource="ai" action="read">
      <span className={cn('relative inline-flex', className)}>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-6 text-muted-foreground hover:text-foreground"
          aria-label="Explain deadline"
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={() => setOpen(true)}
        >
          <Info className="size-3.5" />
        </Button>

        {open ? (
          <div
            className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-md"
            onMouseLeave={() => setOpen(false)}
          >
            {query.isLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Loading explanation…
              </span>
            ) : query.isError ? (
              <span className="text-destructive">
                {getApiErrorMessage(query.error, 'Could not load explanation')}
              </span>
            ) : (
              <p>{query.data?.explanation}</p>
            )}
          </div>
        ) : null}
      </span>
    </PermissionGate>
  )
}
