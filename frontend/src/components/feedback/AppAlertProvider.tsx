import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppAlertDialog } from './AppAlertDialog'
import type { AppAlertOptions, AppConfirmOptions } from './app-alert-types'
import {
  normalizeAlertOptions,
  normalizeConfirmOptions,
  type AppAlertDialogState,
} from './app-alert-types'
import { getApiErrorMessage } from '@/lib/api-client'

type AppAlertContextValue = {
  alert: (input: string | AppAlertOptions) => Promise<void>
  confirm: (input: string | AppConfirmOptions) => Promise<boolean>
  showError: (error: unknown, fallback?: string) => Promise<void>
}

const AppAlertContext = createContext<AppAlertContextValue | null>(null)

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [dialog, setDialog] = useState<AppAlertDialogState | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setOpen(false)
    setDialog(null)
  }, [])

  const present = useCallback((next: AppAlertDialogState) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setDialog(next)
      setOpen(true)
    })
  }, [])

  const alert = useCallback(
    (input: string | AppAlertOptions) => {
      const options = normalizeAlertOptions(input, { variant: 'info', confirmLabel: 'Got it' })
      return present({ mode: 'alert', ...options }).then(() => undefined)
    },
    [present],
  )

  const confirm = useCallback(
    (input: string | AppConfirmOptions) => {
      const options = normalizeConfirmOptions(input, {
        variant: 'warning',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
      })
      return present({ mode: 'confirm', ...options })
    },
    [present],
  )

  const showError = useCallback(
    (error: unknown, fallback = 'Something went wrong') => {
      return alert({
        title: 'Something went wrong',
        message: getApiErrorMessage(error, fallback),
        variant: 'danger',
        confirmLabel: 'OK',
      })
    },
    [alert],
  )

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        settle(dialog?.mode === 'confirm' ? false : true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialog?.mode, open, settle])

  return (
    <AppAlertContext.Provider value={{ alert, confirm, showError }}>
      {children}
      <AppAlertDialog
        open={open}
        state={dialog}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </AppAlertContext.Provider>
  )
}

export function useAppAlert() {
  const ctx = useContext(AppAlertContext)
  if (!ctx) {
    throw new Error('useAppAlert must be used within AppAlertProvider')
  }
  return ctx
}
