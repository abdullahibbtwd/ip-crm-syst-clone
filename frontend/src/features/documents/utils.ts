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
  general: 'General',
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

export function openDocumentResponse(
  data: { url: string; fileName: string },
  mode: 'view' | 'download',
) {
  if (mode === 'view') {
    window.open(data.url, '_blank', 'noopener,noreferrer')
    return
  }
  const link = document.createElement('a')
  link.href = data.url
  link.download = data.fileName || 'document'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
