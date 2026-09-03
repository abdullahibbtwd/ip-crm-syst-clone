import { resolveMinioPublicHost } from './minio-public-host';

describe('resolveMinioPublicHost', () => {
  it('uses the browser host when public config is localhost', () => {
    expect(resolveMinioPublicHost('localhost', '187.127.233.163')).toBe(
      '187.127.233.163',
    )
  })

  it('uses the browser host when public config is the Docker service name', () => {
    expect(resolveMinioPublicHost('minio', '187.127.233.163')).toBe(
      '187.127.233.163',
    )
  })

  it('keeps an explicit public CDN/host', () => {
    expect(resolveMinioPublicHost('files.example.com', '187.127.233.163')).toBe(
      'files.example.com',
    )
  })

  it('rejects unsafe requested hosts', () => {
    expect(resolveMinioPublicHost('localhost', 'minio')).toBe('localhost')
    expect(resolveMinioPublicHost('localhost', 'evil.com/steal')).toBe(
      'localhost',
    )
  })
})
