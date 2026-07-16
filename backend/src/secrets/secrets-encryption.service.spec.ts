import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsEncryptionService } from './secrets-encryption.service';

describe('SecretsEncryptionService', () => {
  let service: SecretsEncryptionService;

  beforeEach(() => {
    const config = {
      get: (key: string) =>
        key === 'SECRETS_ENCRYPTION_KEY' ? 'test-secrets-key' : undefined,
    } as ConfigService;
    service = new SecretsEncryptionService(config);
  });

  it('round-trips plaintext', () => {
    const encrypted = service.encrypt('super-secret');
    expect(encrypted).not.toContain('super-secret');
    expect(service.decrypt(encrypted)).toBe('super-secret');
  });

  it('produces different ciphertext each encrypt (random IV)', () => {
    const a = service.encrypt('same');
    const b = service.encrypt('same');
    expect(a).not.toBe(b);
    expect(service.decrypt(a)).toBe('same');
    expect(service.decrypt(b)).toBe('same');
  });

  it('throws on invalid ciphertext', () => {
    expect(() => service.decrypt('not-valid-base64-blob!!!')).toThrow(
      InternalServerErrorException,
    );
  });

  it('falls back to default key when env keys are missing', () => {
    const fallback = new SecretsEncryptionService({
      get: () => undefined,
    } as unknown as ConfigService);
    const blob = fallback.encrypt('dev');
    expect(fallback.decrypt(blob)).toBe('dev');
  });
});
