import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto'

@Injectable()
export class SecretsEncryptionService {
  private readonly key: Buffer

  constructor(private readonly config: ConfigService) {
    const secret =
      this.config.get<string>('SECRETS_ENCRYPTION_KEY') ??
      this.config.get<string>('MAILBOX_TOKEN_ENCRYPTION_KEY') ??
      this.config.get<string>('JWT_REFRESH_SECRET') ??
      'dev-secrets-encryption-key-change-me'
    this.key = scryptSync(secret, 'ip-crm-system-secrets', 32)
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  decrypt(blob: string): string {
    try {
      const raw = Buffer.from(blob, 'base64')
      const iv = raw.subarray(0, 12)
      const tag = raw.subarray(12, 28)
      const data = raw.subarray(28)
      const decipher = createDecipheriv('aes-256-gcm', this.key, iv)
      decipher.setAuthTag(tag)
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
      return decrypted.toString('utf8')
    } catch {
      throw new InternalServerErrorException('Failed to decrypt system secret')
    }
  }
}
