import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

export function Drawer({ open, onClose, title, children, className }: DrawerProps) {
  const { t } = useTranslation('crm')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={t('drawer.closeAria')}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside
        className={cn(
          'relative flex h-full w-full max-w-md flex-col border-l bg-background shadow-xl',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-serif text-lg">{title}</h2>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  )
}
