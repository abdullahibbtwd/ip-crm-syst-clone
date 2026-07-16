jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (Strategy: new (...args: unknown[]) => unknown) =>
    class extends (Strategy as new (...args: unknown[]) => object) {
      constructor(...args: unknown[]) {
        super(...args);
      }
    },
}));

jest.mock('passport-jwt', () => ({
  Strategy: class {
    constructor(_options: unknown, _verify: unknown) {}
  },
}));

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthService } from '../auth.service';
import type { JwtPayload } from '../auth.types';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: { resolveSessionUser: jest.Mock };

  beforeEach(() => {
    authService = { resolveSessionUser: jest.fn() };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
    };
    strategy = new JwtStrategy(
      config as unknown as ConfigService,
      authService as unknown as AuthService,
    );
  });

  it('rejects mfa_pending tokens', async () => {
    const payload = {
      sub: 'u1',
      type: 'mfa_pending',
    } as JwtPayload;

    await expect(strategy.validate(payload)).rejects.toThrow(
      'MFA pending token cannot access API',
    );
    expect(authService.resolveSessionUser).not.toHaveBeenCalled();
  });

  it('delegates access tokens to resolveSessionUser', async () => {
    const authUser = { userId: 'u1', roles: ['ip_attorney'], permissions: [] };
    authService.resolveSessionUser.mockResolvedValue(authUser);

    const payload = {
      sub: 'u1',
      type: 'access',
      email: 'ada@example.com',
      roles: ['ip_attorney'],
      permissions: [],
      clientId: null,
      mfaEnrollmentRequired: false,
    } satisfies JwtPayload;

    await expect(strategy.validate(payload)).resolves.toBe(authUser);
    expect(authService.resolveSessionUser).toHaveBeenCalledWith('u1');
  });

  it('propagates inactive user errors from AuthService', async () => {
    authService.resolveSessionUser.mockRejectedValue(
      new UnauthorizedException('User inactive'),
    );

    await expect(
      strategy.validate({
        sub: 'u1',
        type: 'access',
        email: 'ada@example.com',
        roles: [],
        permissions: [],
        clientId: null,
        mfaEnrollmentRequired: false,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
