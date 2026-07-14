import { Injectable } from '@nestjs/common';
import { SecretsEncryptionService } from '../secrets/secrets-encryption.service';

const ENCRYPTED_PREFIX = 'enc:';

@Injectable()
export class MfaSecretService {
  constructor(private readonly encryption: SecretsEncryptionService) {}

  encrypt(plaintext: string): string {
    return ENCRYPTED_PREFIX + this.encryption.encrypt(plaintext);
  }

  /** Decrypt stored secret; legacy plaintext values pass through unchanged. */
  decrypt(stored: string): string {
    if (stored.startsWith(ENCRYPTED_PREFIX)) {
      return this.encryption.decrypt(stored.slice(ENCRYPTED_PREFIX.length));
    }
    return stored;
  }
}
