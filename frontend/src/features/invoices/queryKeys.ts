export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...invoiceKeys.all, 'list', filters ?? {}] as const,
  matter: (matterId: string) => [...invoiceKeys.all, 'matter', matterId] as const,
  portal: () => [...invoiceKeys.all, 'portal'] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
}
