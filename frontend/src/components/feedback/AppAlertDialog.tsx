import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import type { AppAlertDialogState, AppAlertVariant } from './app-alert-types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const VARIANT_STYLES: Record<
  AppAlertVariant,
  { icon: typeof Info; bubble: string; iconColor: string; accent: string }
> = {
  info: {
    icon: Info,
    bubble: 'bg-sky-50 ring-sky-100',
    iconColor: 'text-sky-600',
    accent: 'from-sky-50/80',
  },
  success: {
    icon: CheckCircle2,
    bubble: 'bg-emerald-50 ring-emerald-100',
    iconColor: 'text-emerald-600',
    accent: 'from-emerald-50/80',
  },
  warning: {
    icon: AlertTriangle,
    bubble: 'bg-amber-50 ring-amber-100',
    iconColor: 'text-amber-700',
    accent: 'from-amber-50/80',
  },
  danger: {
    icon: CircleAlert,
    bubble: 'bg-red-50 ring-red-100',
    iconColor: 'text-destructive',
    accent: 'from-red-50/80',
  },
}

type AppAlertDialogProps = {
  open: boolean
  state: AppAlertDialogState | null
  onConfirm: () => void
  onCancel: () => void
}

export function AppAlertDialog({ open, state, onConfirm, onCancel }: AppAlertDialogProps) {
  if (!open || !state) return null

  const variant = state.variant ?? (state.mode === 'confirm' ? 'warning' : 'info')
  const styles = VARIANT_STYLES[variant]
  const Icon = styles.icon
  const title =
    state.title ??
    (state.mode === 'confirm'
      ? 'Are you sure?'
      : variant === 'danger'
        ? 'Something went wrong'
        : 'Heads up')

  const confirmLabel = state.confirmLabel ?? (state.mode === 'confirm' ? 'Confirm' : 'Got it')
  const cancelLabel = state.mode === 'confirm' ? (state.cancelLabel ?? 'Cancel') : null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss dialog backdrop"
        className="absolute inset-0 bg-[#1a3c34]/25 backdrop-blur-[2px] transition-opacity"
        onClick={state.mode === 'alert' ? onConfirm : onCancel}
      />
      <div
        role={state.mode === 'confirm' ? 'alertdialog' : 'alert'}
        aria-modal="true"
        aria-labelledby="app-alert-title"
        aria-describedby="app-alert-message"
        className={cn(
          'relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg',
          'animate-[app-alert-in_220ms_cubic-bezier(0.22,1,0.36,1)]',
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent',
            styles.accent,
          )}
        />
        <div className="relative px-6 pt-6 pb-5">
          <div className="flex flex-col items-center text-center">
            <span
              className={cn(
                'mb-4 flex size-14 items-center justify-center rounded-full ring-4',
                styles.bubble,
              )}
            >
              <Icon className={cn('size-7', styles.iconColor)} aria-hidden />
            </span>
            <h2 id="app-alert-title" className="font-serif text-xl text-foreground">
              {title}
            </h2>
            <p
              id="app-alert-message"
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            >
              {state.message}
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            {cancelLabel && (
              <Button type="button" variant="outline" className="sm:min-w-[112px]" onClick={onCancel}>
                {cancelLabel}
              </Button>
            )}
            <Button
              type="button"
              variant={variant === 'danger' && state.mode === 'confirm' ? 'destructive' : 'default'}
              className="sm:min-w-[112px]"
              onClick={onConfirm}
              autoFocus
            >
              {confirmLabel}
            </Button>
          </div>
        </div>

        {state.mode === 'alert' && (
          <button
            type="button"
            aria-label="Close"
            className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            onClick={onConfirm}
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
