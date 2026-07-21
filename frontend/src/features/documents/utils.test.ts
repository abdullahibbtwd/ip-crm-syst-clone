import { describe, expect, it } from 'vitest'
import { formatFileSize } from './utils'

describe('document utils', () => {
  it('formatFileSize shows bytes, KB, and MB', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
