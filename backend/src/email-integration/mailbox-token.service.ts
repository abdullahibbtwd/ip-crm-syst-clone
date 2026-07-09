import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

export type MailboxTokenPayload = {
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiresAt?: number;
};

@Injectable()
export class MailboxTokenService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const secret =
      this.config.get<string>('MAILBOX_TOKEN_ENCRYPTION_KEY') ??
      this.config.get<string>('JWT_REFRESH_SECRET') ??
      'dev-mailbox-token-key-change-me';
    this.key = scryptSync(secret, 'ip-crm-mailbox', 32);
  }

  encrypt(payload: MailboxTokenPayload): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const json = JSON.stringify(payload);
    const encrypted = Buffer.concat([
      cipher.update(json, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(blob: string): MailboxTokenPayload {
    try {
      const raw = Buffer.from(blob, 'base64');
      const iv = raw.subarray(0, 12);
      const tag = raw.subarray(12, 28);
      const data = raw.subarray(28);
      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
      return JSON.parse(decrypted.toString('utf8')) as MailboxTokenPayload;
    } catch {
      throw new InternalServerErrorException('Failed to decrypt mailbox tokens');
    }
  }
}
