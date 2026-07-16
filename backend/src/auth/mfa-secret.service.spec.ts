import { ConfigService } from '@nestjs/config';
import { SecretsEncryptionService } from '../secrets/secrets-encryption.service';
import { MfaSecretService } from './mfa-secret.service';

describe('MfaSecretService', () => {
  let service: MfaSecretService;

  beforeEach(() => {
    const encryption = new SecretsEncryptionService({
      get: () => 'mfa-test-key',
    } as unknown as ConfigService);
    service = new MfaSecretService(encryption);
  });

  it('encrypts with enc: prefix and decrypts back', () => {
    const stored = service.encrypt('otpauth-secret');
    expect(stored.startsWith('enc:')).toBe(true);
    expect(service.decrypt(stored)).toBe('otpauth-secret');
  });

  it('passes through legacy plaintext values unchanged', () => {
    expect(service.decrypt('legacy-plain-secret')).toBe('legacy-plain-secret');
  });
});
