import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AiAssistantPanel } from './AiAssistantPanel'

export function AiAssistantFab() {
  const [open, setOpen] = useState(false)

  return (
    <PermissionGate resource="mcp" action="read">
      <AiAssistantPanel open={open} onClose={() => setOpen(false)} />

      <Button
        type="button"
        size="icon"
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-5 right-5 z-[60] size-14 rounded-full shadow-[0_12px_32px_rgba(26,60,52,0.35)]',
          'bg-brand-green text-white hover:bg-brand-green/90',
          open && 'ring-2 ring-brand-green/30 ring-offset-2',
        )}
      >
        {open ? <X className="size-6" /> : <Sparkles className="size-6" />}
      </Button>
    </PermissionGate>
  )
}
