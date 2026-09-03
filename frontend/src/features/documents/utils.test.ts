import { describe, expect, it, vi } from 'vitest'
import { formatFileSize, openDocumentResponse } from './utils'

describe('document utils', () => {
  it('formatFileSize shows bytes, KB, and MB', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('openDocumentResponse opens a new tab for view', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    openDocumentResponse({ url: 'https://files/doc.pdf', fileName: 'doc.pdf' }, 'view')
    expect(open).toHaveBeenCalledWith(
      'https://files/doc.pdf',
      '_blank',
      'noopener,noreferrer',
    )
    open.mockRestore()
  })
})
