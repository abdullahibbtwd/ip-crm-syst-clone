export type AppAlertVariant = 'info' | 'success' | 'warning' | 'danger'

export type AppAlertOptions = {
  title?: string
  message: string
  variant?: AppAlertVariant
  confirmLabel?: string
}

export type AppConfirmOptions = AppAlertOptions & {
  cancelLabel?: string
}

export type AppAlertDialogState =
  | ({ mode: 'alert' } & AppAlertOptions)
  | ({ mode: 'confirm' } & AppConfirmOptions)

export function normalizeAlertOptions(
  input: string | AppAlertOptions,
  defaults?: Partial<AppAlertOptions>,
): AppAlertOptions {
  if (typeof input === 'string') {
    return { message: input, ...defaults }
  }
  return { ...defaults, ...input }
}

export function normalizeConfirmOptions(
  input: string | AppConfirmOptions,
  defaults?: Partial<AppConfirmOptions>,
): AppConfirmOptions {
  if (typeof input === 'string') {
    return { message: input, ...defaults }
  }
  return { ...defaults, ...input }
}
