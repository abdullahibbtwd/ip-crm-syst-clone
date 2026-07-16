import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailboxTokenService } from './mailbox-token.service';

describe('MailboxTokenService', () => {
  let service: MailboxTokenService;

  beforeEach(() => {
    service = new MailboxTokenService({
      get: () => 'mailbox-test-key',
    } as unknown as ConfigService);
  });

  it('round-trips token payloads', () => {
    const payload = {
      refreshToken: 'refresh-abc',
      accessToken: 'access-xyz',
      accessTokenExpiresAt: 1_700_000_000_000,
    };
    const blob = service.encrypt(payload);
    expect(blob).not.toContain('refresh-abc');
    expect(service.decrypt(blob)).toEqual(payload);
  });

  it('uses a random IV so ciphertext differs', () => {
    const payload = { refreshToken: 'same' };
    expect(service.encrypt(payload)).not.toBe(service.encrypt(payload));
  });

  it('throws on invalid ciphertext', () => {
    expect(() => service.decrypt('not-valid')).toThrow(
      InternalServerErrorException,
    );
  });
});
