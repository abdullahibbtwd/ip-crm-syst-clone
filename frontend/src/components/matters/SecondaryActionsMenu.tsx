import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  TRADEMARK_SECONDARY_ACTIONS,
  type TrademarkSecondaryAction,
} from '@/features/matters/trademark-actions'
import { cn } from '@/lib/utils'

type SecondaryActionsMenuProps = {
  onEditScope: () => void
  onSelectAction: (action: TrademarkSecondaryAction) => void
}

export function SecondaryActionsMenu({
  onEditScope,
  onSelectAction,
}: SecondaryActionsMenuProps) {
  const { t } = useTranslation('matters')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {t('trademarkActions.menu.label')}
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-72 rounded-md border bg-background p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => {
              setOpen(false)
              onEditScope()
            }}
          >
            {t('trademarkActions.menu.editScope')}
          </button>
          <div className="my-1 border-t" />
          {TRADEMARK_SECONDARY_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className="flex w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                setOpen(false)
                onSelectAction(action)
              }}
            >
              {t(`trademarkActions.kinds.${action}`)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
