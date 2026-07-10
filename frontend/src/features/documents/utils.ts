export const DOCUMENT_CATEGORY_LABELS: Record<
  import('./types').DocumentCategory,
  string
> = {
  application: 'Application',
  office_action: 'Office action',
  evidence: 'Evidence',
  certificate: 'Certificate',
  correspondence: 'Correspondence',
  renewal: 'Renewal',
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDocumentDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
